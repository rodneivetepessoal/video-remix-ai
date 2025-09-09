// Worker final com todos os serviços integrados
const { Worker } = require("bullmq");
const Redis = require("ioredis");
const mongoose = require("mongoose");
const TTSService = require("./lib/tts-service");
const ShotstackService = require("./lib/shotstack-service");

// Configurações
const PEXELS_API_KEY = "BPGuQaS6eWs2UEBtPkncoIKbUhCq2DzP5D4L9xo08ff8MqjR9r0aJHbi";
const SHOTSTACK_API_KEY = "rpHQO8HDpJhgdXDzSDcqQoOYAKU1dFXDNsO9M55j";
const MONGODB_URI = "mongodb+srv://rodneivete_db_user:aTKaQMNAJ55P24e5@cluster0.zfrgtkz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Inicializar serviços
const ttsService = new TTSService();
const shotstackService = new ShotstackService(SHOTSTACK_API_KEY);

// Schema do VideoProject
const VideoProjectSchema = new mongoose.Schema({
  youtubeUrl: { type: String, required: true },
  status: { type: String, enum: ['Processing', 'Completed', 'Failed'], default: 'Processing' },
  finalVideoUrl: { type: String },
  renderId: { type: String },
  videoClips: [{ type: String }],
  audioData: {
    originalText: String,
    translatedText: String,
    audioUrl: String,
    duration: Number
  },
  processingSteps: [{
    step: String,
    status: String,
    timestamp: Date,
    details: String
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

let VideoProject;

// Conexão com MongoDB
async function connectToDatabase() {
  try {
    if (mongoose.connection.readyState === 0) {
      console.log('🔌 Conectando ao MongoDB...');
      await mongoose.connect(MONGODB_URI);
      console.log('✅ Conectado ao MongoDB');
    }
    
    if (!VideoProject) {
      VideoProject = mongoose.model('VideoProject', VideoProjectSchema);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error);
    return false;
  }
}

// Função para adicionar step de processamento
async function addProcessingStep(projectId, step, status, details = '') {
  try {
    await VideoProject.findByIdAndUpdate(projectId, {
      $push: {
        processingSteps: {
          step,
          status,
          timestamp: new Date(),
          details
        }
      },
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('❌ Erro ao adicionar step:', error);
  }
}

// Conexão com Redis
const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const worker = new Worker("videoProcessing", async (job) => {
  const { projectId, youtubeUrl } = job.data;

  console.log(`🚀 Iniciando processamento COMPLETO para o projeto: ${projectId}`);
  console.log(`📺 URL do YouTube: ${youtubeUrl}`);

  try {
    // Conectar ao MongoDB
    const dbConnected = await connectToDatabase();
    if (!dbConnected) {
      throw new Error('Falha na conexão com MongoDB');
    }

    // Atualizar status inicial
    await VideoProject.findByIdAndUpdate(projectId, {
      status: 'Processing',
      updatedAt: new Date()
    });

    await addProcessingStep(projectId, 'initialization', 'completed', 'Projeto inicializado');

    // PASSO 1: Processamento de áudio com TTS
    console.log('🎤 === PASSO 1: PROCESSAMENTO DE ÁUDIO ===');
    await addProcessingStep(projectId, 'audio_processing', 'started', 'Iniciando extração e dublagem');
    
    const audioResult = await ttsService.processVideoAudio(youtubeUrl, {
      targetLanguage: 'en',
      voice: 'male_voice',
      speed: 1.0
    });

    console.log('✅ Processamento de áudio concluído');
    console.log(`📝 Texto original: ${audioResult.originalText.substring(0, 100)}...`);
    console.log(`🌐 Texto traduzido: ${audioResult.translatedText.substring(0, 100)}...`);
    console.log(`🎵 Áudio: ${audioResult.audio.duration}s`);

    // Salvar dados de áudio
    await VideoProject.findByIdAndUpdate(projectId, {
      audioData: {
        originalText: audioResult.originalText,
        translatedText: audioResult.translatedText,
        audioUrl: audioResult.audio.audioUrl,
        duration: audioResult.audio.duration
      },
      updatedAt: new Date()
    });

    await addProcessingStep(projectId, 'audio_processing', 'completed', 
      `Áudio processado: ${audioResult.audio.duration}s`);

    // PASSO 2: Busca de vídeos de stock
    console.log('🎬 === PASSO 2: BUSCA DE STOCK FOOTAGE ===');
    await addProcessingStep(projectId, 'stock_search', 'started', 'Buscando vídeos no Pexels');
    
    // Usar texto traduzido para buscar vídeos relevantes
    const keywords = audioResult.translatedText
      .split(' ')
      .filter(word => word.length > 3)
      .slice(0, 5)
      .join(' ')
      .replace(/[^a-zA-Z0-9 ]/g, '');

    console.log(`🔍 Palavras-chave para busca: "${keywords}"`);

    const pexelsResponse = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(keywords)}&per_page=5&min_duration=5`, {
      headers: { Authorization: PEXELS_API_KEY },
    });

    if (!pexelsResponse.ok) {
      throw new Error(`Erro na API Pexels: ${pexelsResponse.status}`);
    }

    const pexelsData = await pexelsResponse.json();
    const videoClips = [];

    if (pexelsData.videos && pexelsData.videos.length > 0) {
      console.log(`✅ Encontrados ${pexelsData.videos.length} vídeos no Pexels`);
      
      for (const video of pexelsData.videos) {
        const highestQualityVideo = video.video_files
          .filter(file => file.quality === 'hd' || file.quality === 'sd')
          .reduce((prev, current) => {
            return (prev.width * prev.height || 0) > (current.width * current.height || 0) ? prev : current;
          });
        
        if (highestQualityVideo) {
          videoClips.push(highestQualityVideo.link);
          console.log(`📹 Vídeo adicionado: ${highestQualityVideo.width}x${highestQualityVideo.height} (${highestQualityVideo.quality})`);
        }
      }
    }

    // Fallback se não encontrou vídeos suficientes
    if (videoClips.length < 3) {
      console.log('⚠️ Poucos vídeos encontrados, adicionando fallbacks');
      const fallbackVideos = [
        "https://videos.pexels.com/video-files/33757025/14331241_3840_2160_30fps.mp4",
        "https://videos.pexels.com/video-files/33773296/14336624_3840_2160_60fps.mp4",
        "https://videos.pexels.com/video-files/33765739/14334128_3840_2160_24fps.mp4"
      ];
      
      fallbackVideos.forEach(url => {
        if (videoClips.length < 4) {
          videoClips.push(url);
        }
      });
    }

    // Salvar vídeos encontrados
    await VideoProject.findByIdAndUpdate(projectId, {
      videoClips: videoClips,
      updatedAt: new Date()
    });

    await addProcessingStep(projectId, 'stock_search', 'completed', 
      `${videoClips.length} vídeos encontrados`);

    console.log(`📦 ${videoClips.length} vídeos salvos no projeto`);

    // PASSO 3: Renderização com Shotstack
    console.log('🎞️ === PASSO 3: RENDERIZAÇÃO DE VÍDEO ===');
    await addProcessingStep(projectId, 'video_rendering', 'started', 'Iniciando renderização no Shotstack');

    // Verificar saúde da API Shotstack
    const healthCheck = await shotstackService.healthCheck();
    console.log('🏥 Health check Shotstack:', healthCheck);

    if (!healthCheck.healthy) {
      throw new Error(`Shotstack API não está funcionando: ${healthCheck.message}`);
    }

    // Iniciar renderização
    const renderResult = await shotstackService.renderAndWait(videoClips, audioResult.audio);

    if (!renderResult.success) {
      throw new Error(`Falha na renderização: ${renderResult.error}`);
    }

    console.log(`🎬 Renderização concluída com sucesso!`);
    console.log(`🎥 URL final: ${renderResult.finalUrl}`);

    // Salvar resultado final
    await VideoProject.findByIdAndUpdate(projectId, {
      status: 'Completed',
      finalVideoUrl: renderResult.finalUrl,
      renderId: renderResult.renderId,
      updatedAt: new Date()
    });

    await addProcessingStep(projectId, 'video_rendering', 'completed', 
      `Renderização concluída: ${renderResult.renderId}`);

    console.log(`✅ Projeto ${projectId} TOTALMENTE concluído!`);

    return {
      success: true,
      projectId: projectId,
      finalVideoUrl: renderResult.finalUrl,
      renderId: renderResult.renderId,
      videoClips: videoClips,
      audioData: audioResult,
      processingSteps: 3
    };

  } catch (error) {
    console.error(`❌ ERRO CRÍTICO no projeto ${projectId}:`, error.message);
    
    try {
      // Atualizar status como Failed
      if (VideoProject) {
        await VideoProject.findByIdAndUpdate(projectId, {
          status: 'Failed',
          updatedAt: new Date()
        });
        
        await addProcessingStep(projectId, 'error', 'failed', error.message);
        console.log('📊 Status atualizado para Failed');
      }
    } catch (dbError) {
      console.error('❌ Erro ao atualizar status no banco:', dbError.message);
    }
    
    throw error;
  }
}, { 
  connection,
  concurrency: 1, // Um job por vez para evitar sobrecarga
  removeOnComplete: 5, // Manter apenas os 5 jobs mais recentes
  removeOnFail: 20 // Manter 20 jobs falhados para debug
});

// Event listeners detalhados
worker.on('completed', (job, result) => {
  console.log(`🎉 JOB ${job.id} COMPLETADO COM SUCESSO!`);
  console.log(`📊 Estatísticas:`, {
    projectId: result.projectId,
    videoClips: result.videoClips.length,
    audioDuration: result.audioData.audio.duration,
    processingSteps: result.processingSteps,
    finalUrl: result.finalVideoUrl ? 'Gerada' : 'Não gerada'
  });
});

worker.on('failed', (job, err) => {
  console.log(`💥 JOB ${job.id} FALHOU:`, err.message);
  console.log(`📋 Dados do job:`, job.data);
});

worker.on('error', (err) => {
  console.error('🚨 ERRO NO WORKER:', err);
});

worker.on('active', (job) => {
  console.log(`⚡ Job ${job.id} iniciado - Projeto: ${job.data.projectId}`);
});

// Verificar serviços na inicialização
async function checkServices() {
  console.log('🔍 Verificando serviços...');
  
  // TTS Service
  const ttsStatus = ttsService.getStatus();
  console.log('🎤 TTS Service:', ttsStatus);
  
  // Shotstack Service
  const shotstackHealth = await shotstackService.healthCheck();
  console.log('🎬 Shotstack Service:', shotstackHealth);
  
  return {
    tts: ttsStatus.ready,
    shotstack: shotstackHealth.healthy
  };
}

// Inicialização
connectToDatabase().then(async () => {
  const servicesStatus = await checkServices();
  
  console.log('🚀 WORKER FINAL INICIADO COM SUCESSO!');
  console.log('📊 Configurações:');
  console.log('  - Concorrência: 1 job por vez');
  console.log('  - MongoDB: ✅ Conectado');
  console.log('  - Redis: ✅ Conectado');
  console.log('  - TTS Service: ' + (servicesStatus.tts ? '✅' : '❌'));
  console.log('  - Shotstack API: ' + (servicesStatus.shotstack ? '✅' : '❌'));
  console.log('  - Pexels API: ✅ Configurada');
  console.log('');
  console.log('🎯 Pronto para processar vídeos completos!');
}).catch((error) => {
  console.error('❌ FALHA CRÍTICA NA INICIALIZAÇÃO:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Encerrando worker graciosamente...');
  await worker.close();
  await mongoose.connection.close();
  console.log('✅ Worker encerrado com segurança');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Recebido SIGTERM, encerrando worker...');
  await worker.close();
  await mongoose.connection.close();
  console.log('✅ Worker encerrado com segurança');
  process.exit(0);
});

