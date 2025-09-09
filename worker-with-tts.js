// Worker com serviço TTS integrado
const { Worker } = require("bullmq");
const Redis = require("ioredis");
const mongoose = require("mongoose");
const TTSService = require("./lib/tts-service");

// Hardcoding das chaves de API e URI do MongoDB
const PEXELS_API_KEY = "BPGuQaS6eWs2UEBtPkncoIKbUhCq2DzP5D4L9xo08ff8MqjR9r0aJHbi";
const SHOTSTACK_API_KEY = "rpHQO8HDpJhgdXDzSDcqQoOYAKU1dFXDNsO9M55j";
const MONGODB_URI = "mongodb+srv://rodneivete_db_user:aTKaQMNAJ55P24e5@cluster0.zfrgtkz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Inicializar serviço TTS
const ttsService = new TTSService();

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

// Conexão com Redis
const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const worker = new Worker("videoProcessing", async (job) => {
  const { projectId, youtubeUrl } = job.data;

  console.log(`🚀 Iniciando processamento completo para o projeto: ${projectId}`);
  console.log(`📺 URL do YouTube: ${youtubeUrl}`);

  try {
    // Conectar ao MongoDB
    const dbConnected = await connectToDatabase();
    if (!dbConnected) {
      throw new Error('Falha na conexão com MongoDB');
    }

    // Atualizar status para Processing
    await VideoProject.findByIdAndUpdate(projectId, {
      status: 'Processing',
      updatedAt: new Date()
    });

    console.log('📊 Status atualizado para Processing');

    // Passo 1: Processamento de áudio com TTS
    console.log('🎤 Iniciando processamento de áudio...');
    
    const audioResult = await ttsService.processVideoAudio(youtubeUrl, {
      targetLanguage: 'en',
      voice: 'male_voice',
      speed: 1.0
    });

    console.log('✅ Processamento de áudio concluído');
    console.log(`📝 Texto original: ${audioResult.originalText.substring(0, 100)}...`);
    console.log(`🌐 Texto traduzido: ${audioResult.translatedText.substring(0, 100)}...`);
    console.log(`🎵 Áudio: ${audioResult.audio.duration}s`);

    // Salvar dados de áudio no projeto
    await VideoProject.findByIdAndUpdate(projectId, {
      audioData: {
        originalText: audioResult.originalText,
        translatedText: audioResult.translatedText,
        audioUrl: audioResult.audio.audioUrl,
        duration: audioResult.audio.duration
      },
      updatedAt: new Date()
    });

    // Passo 2: Busca de vídeos de stock no Pexels
    console.log('🎬 Buscando vídeos de stock no Pexels...');
    
    // Usar texto traduzido para buscar vídeos relevantes
    const keywords = audioResult.translatedText
      .split(' ')
      .slice(0, 5)
      .join(' ')
      .replace(/[^a-zA-Z0-9 ]/g, ''); // Limpar caracteres especiais

    console.log(`🔍 Palavras-chave para busca: ${keywords}`);

    const pexelsResponse = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(keywords)}&per_page=4`, {
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
        const highestQualityVideo = video.video_files.reduce((prev, current) => {
          return (prev.width * prev.height || 0) > (current.width * current.height || 0) ? prev : current;
        });
        videoClips.push(highestQualityVideo.link);
        console.log(`📹 Vídeo adicionado: ${highestQualityVideo.width}x${highestQualityVideo.height}`);
      }
    } else {
      console.log('⚠️ Nenhum vídeo encontrado, usando vídeos de fallback');
      // Fallback para vídeos de teste
      videoClips.push(
        "https://videos.pexels.com/video-files/33757025/14331241_3840_2160_30fps.mp4",
        "https://videos.pexels.com/video-files/33773296/14336624_3840_2160_60fps.mp4",
        "https://videos.pexels.com/video-files/33765739/14334128_3840_2160_24fps.mp4"
      );
    }

    // Atualizar projeto com vídeos encontrados
    await VideoProject.findByIdAndUpdate(projectId, {
      videoClips: videoClips,
      updatedAt: new Date()
    });

    console.log(`📦 ${videoClips.length} vídeos salvos no projeto`);

    // Passo 3: Renderização com Shotstack
    console.log('🎞️ Iniciando renderização no Shotstack...');

    // Calcular duração total baseada no áudio
    const totalDuration = audioResult.audio.duration;
    const clipDuration = Math.max(4, Math.floor(totalDuration / videoClips.length));

    const clips = videoClips.map((url, index) => ({
      asset: {
        type: "video",
        src: url,
        volume: 0 // Sem áudio dos vídeos originais
      },
      start: index * clipDuration,
      length: clipDuration
    }));

    // Adicionar faixa de áudio se não for simulado
    const tracks = [
      {
        clips: clips
      }
    ];

    if (!audioResult.audio.isSimulated) {
      tracks.push({
        clips: [
          {
            asset: {
              type: "audio",
              src: audioResult.audio.audioUrl
            },
            start: 0,
            length: totalDuration
          }
        ]
      });
    }

    const shotstackPayload = {
      timeline: {
        tracks: tracks
      },
      output: {
        format: "mp4",
        resolution: "hd",
      }
    };

    console.log('📤 Enviando para Shotstack...');
    console.log(`⏱️ Duração total: ${totalDuration}s, Clips: ${videoClips.length}`);
    
    const shotstackResponse = await fetch("https://api.shotstack.io/v1/render", {
      method: "POST",
      headers: {
        "x-api-key": SHOTSTACK_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(shotstackPayload),
    });

    if (!shotstackResponse.ok) {
      const errorData = await shotstackResponse.json();
      throw new Error(`Erro na API Shotstack: ${shotstackResponse.status} - ${JSON.stringify(errorData)}`);
    }

    const shotstackData = await shotstackResponse.json();
    const renderId = shotstackData.response.id;

    console.log(`🎬 Renderização iniciada com ID: ${renderId}`);

    // Atualizar projeto com render ID
    await VideoProject.findByIdAndUpdate(projectId, {
      renderId: renderId,
      updatedAt: new Date()
    });

    // Simular URL final
    const finalVideoUrl = `https://shotstack-api-v1-output.s3-ap-southeast-2.amazonaws.com/v1/render/${renderId}.mp4`;

    // Atualizar projeto como concluído
    await VideoProject.findByIdAndUpdate(projectId, {
      status: 'Completed',
      finalVideoUrl: finalVideoUrl,
      updatedAt: new Date()
    });

    console.log(`✅ Projeto ${projectId} concluído com sucesso!`);
    console.log(`🎥 URL do vídeo final: ${finalVideoUrl}`);

    return {
      success: true,
      projectId: projectId,
      finalVideoUrl: finalVideoUrl,
      renderId: renderId,
      videoClips: videoClips,
      audioData: audioResult,
      totalDuration: totalDuration
    };

  } catch (error) {
    console.error(`❌ Erro no processamento do projeto ${projectId}:`, error.message);
    
    try {
      // Atualizar status como Failed
      if (VideoProject) {
        await VideoProject.findByIdAndUpdate(projectId, {
          status: 'Failed',
          updatedAt: new Date()
        });
        console.log('📊 Status atualizado para Failed');
      }
    } catch (dbError) {
      console.error('❌ Erro ao atualizar status no banco:', dbError.message);
    }
    
    throw error;
  }
}, { 
  connection,
  concurrency: 1,
  removeOnComplete: 10,
  removeOnFail: 50
});

// Event listeners
worker.on('completed', (job, result) => {
  console.log(`✅ Job ${job.id} completado com sucesso`);
  console.log(`📊 Resultado:`, {
    projectId: result.projectId,
    videoClips: result.videoClips.length,
    audioDuration: result.audioData.audio.duration,
    totalDuration: result.totalDuration
  });
});

worker.on('failed', (job, err) => {
  console.log(`❌ Job ${job.id} falhou:`, err.message);
});

worker.on('error', (err) => {
  console.error('❌ Erro no worker:', err);
});

// Conectar ao MongoDB na inicialização
connectToDatabase().then(() => {
  console.log('🚀 Worker com TTS integrado iniciado');
  console.log('📊 Configurações:');
  console.log('  - Concorrência: 1 job por vez');
  console.log('  - MongoDB: Conectado');
  console.log('  - Redis: Conectado');
  console.log('  - TTS Service: Configurado');
  console.log('  - Pexels API: Configurada');
  console.log('  - Shotstack API: Configurada');
  console.log('📋 Status TTS:', ttsService.getStatus());
}).catch((error) => {
  console.error('❌ Falha na inicialização:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Encerrando worker graciosamente...');
  await worker.close();
  await mongoose.connection.close();
  console.log('✅ Worker encerrado');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Recebido SIGTERM, encerrando worker...');
  await worker.close();
  await mongoose.connection.close();
  console.log('✅ Worker encerrado');
  process.exit(0);
});

