// Worker simplificado para processamento de vídeo
const { Worker } = require("bullmq");
const Redis = require("ioredis");

// Hardcoding das chaves de API
const PEXELS_API_KEY = "BPGuQaS6eWs2UEBtPkncoIKbUhCq2DzP5D4L9xo08ff8MqjR9r0aJHbi";
const SHOTSTACK_API_KEY = "rpHQO8HDpJhgdXDzSDcqQoOYAKU1dFXDNsO9M55j";

const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const worker = new Worker("videoProcessing", async (job) => {
  const { projectId, youtubeUrl } = job.data;

  console.log(`Iniciando processamento para o projeto: ${projectId} com URL: ${youtubeUrl}`);

  try {
    // Passo 1: Extrair palavras-chave da URL do YouTube (simulado)
    // Em uma implementação real, você usaria a API do YouTube para obter metadados
    const videoId = youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    const keywords = videoId ? `video content ${videoId[1]}` : "nature landscape";
    
    console.log(`Usando palavras-chave: ${keywords}`);

    // Passo 2: Busca e Download de Clipes de Vídeo de Stock (Pexels API)
    console.log("Buscando vídeos de stock no Pexels...");

    const pexelsResponse = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(keywords)}&per_page=3`, {
      headers: { Authorization: PEXELS_API_KEY },
    });

    if (!pexelsResponse.ok) {
      const errorData = await pexelsResponse.json();
      throw new Error(`Erro na API Pexels: ${pexelsResponse.status} - ${JSON.stringify(errorData)}`);
    }

    const pexelsData = await pexelsResponse.json();
    const videoClips = [];

    if (pexelsData.videos && pexelsData.videos.length > 0) {
      for (const video of pexelsData.videos) {
        const highestQualityVideo = video.video_files.reduce((prev, current) => {
          return (prev.width * prev.height || 0) > (current.width * current.height || 0) ? prev : current;
        });
        videoClips.push(highestQualityVideo.link);
      }
    } else {
      // Fallback para vídeos de teste
      videoClips.push(
        "https://videos.pexels.com/video-files/33757025/14331241_3840_2160_30fps.mp4",
        "https://videos.pexels.com/video-files/33773296/14336624_3840_2160_60fps.mp4"
      );
    }

    console.log(`Clipes de vídeo encontrados: ${videoClips.length}`);

    // Passo 3: Edição e Renderização do Vídeo Final (Shotstack API)
    console.log("Iniciando renderização no Shotstack...");

    const clips = videoClips.map((url, index) => ({
      asset: {
        type: "video",
        src: url,
        volume: 0.5 // Volume baixo
      },
      start: index * 5,
      length: 5
    }));

    const shotstackPayload = {
      timeline: {
        tracks: [
          {
            clips: clips
          }
        ]
      },
      output: {
        format: "mp4",
        resolution: "hd",
      }
    };

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

    console.log(`Renderização iniciada com ID: ${renderId}`);

    // Para esta versão simplificada, vamos simular o sucesso
    // Em uma implementação real, você monitoraria o status da renderização
    const finalVideoUrl = `https://shotstack.io/render/${renderId}`;

    console.log(`Vídeo final URL (simulado): ${finalVideoUrl}`);

    // Passo 4: Atualização do Status (simulado)
    console.log(`Projeto ${projectId} processado com sucesso!`);
    
    // Retornar resultado para o job
    return {
      success: true,
      projectId: projectId,
      finalVideoUrl: finalVideoUrl,
      renderId: renderId,
      videoClips: videoClips
    };

  } catch (error) {
    console.error(`Erro no processamento do projeto ${projectId}:`, error);
    throw error; // Re-throw para que o BullMQ marque o job como falhado
  }
}, { connection });

worker.on('completed', (job, result) => {
  console.log(`Job ${job.id} completado:`, result);
});

worker.on('failed', (job, err) => {
  console.log(`Job ${job.id} falhou:`, err.message);
});

console.log("Worker de processamento de vídeo simplificado iniciado.");

// Manter o processo rodando
process.on('SIGINT', async () => {
  console.log('Encerrando worker...');
  await worker.close();
  process.exit(0);
});

