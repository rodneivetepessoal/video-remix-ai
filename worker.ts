import { Worker } from "bullmq";
import Redis from "ioredis";
import VideoProject from "./lib/models/VideoProject";
import connectToDatabase from "./lib/mongodb";

// Hardcoding das chaves de API e URI do MongoDB
const ELEVENLABS_API_KEY = "sk_13f3db16682c27d2c865a89d83fe0c63075bd07a60b19275";
const PEXELS_API_KEY = "BPGuQaS6eWs2UEBtPkncoIKbUhCq2DzP5D4L9xo08ff8MqjR9r0aJHbi";
const SHOTSTACK_API_KEY = "rpHQO8HDpJhgdXDzSDcqQoOYAKU1dFXDNsO9M55j";
const MONGODB_URI = "mongodb+srv://rodneivete_db_user:aTKaQMNAJ55P24e5@cluster0.zfrgtkz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const worker = new Worker("videoProcessing", async (job) => {
  // Usando a URI hardcoded para a conexão com o banco de dados
  await connectToDatabase(MONGODB_URI);
  const { projectId, youtubeUrl } = job.data;

  console.log(`Iniciando processamento para o projeto: ${projectId} com URL: ${youtubeUrl}`);

  try {
    // Passo 1: Dublagem Integrada do Vídeo do YouTube (ElevenLabs AI Dubbing API)
    const elevenLabsApiKey = ELEVENLABS_API_KEY;
    if (!elevenLabsApiKey) {
      throw new Error("ELEVENLABS_API_KEY não está definida (hardcoded).");
    }

    const formData = new FormData();
    formData.append("source_url", youtubeUrl);
    formData.append("target_lang", "en");
    formData.append("dubbing_studio", "true");

    const dubbingResponse = await fetch("https://api.elevenlabs.io/v1/dubbing", {
      method: "POST",
      headers: {
        "xi-api-key": elevenLabsApiKey,
      },
      body: formData,
    });

    if (!dubbingResponse.ok) {
      const errorData = await dubbingResponse.json();
      throw new Error(`Erro na API ElevenLabs: ${dubbingResponse.status} - ${JSON.stringify(errorData)}`);
    }

    const dubbingData = await dubbingResponse.json();
    const audioDubladoUrl = dubbingData.dubbed_audio_url;
    const translatedText = dubbingData.translated_text;

    if (!audioDubladoUrl || !translatedText) {
      throw new Error("URL do áudio dublado ou texto traduzido não retornados pela ElevenLabs.");
    }

    console.log(`Áudio dublado URL: ${audioDubladoUrl}`);
    console.log(`Texto traduzido: ${translatedText}`);

    // Passo 2: Busca e Download de Clipes de Vídeo de Stock (Pexels API)
    const pexelsApiKey = PEXELS_API_KEY;
    if (!pexelsApiKey) {
      throw new Error("PEXELS_API_KEY não está definida (hardcoded).");
    }

    const videoClips = [];
    const keywords = translatedText.split(" ").slice(0, 5).join(" ");

    console.log(`Buscando vídeos de stock para as palavras-chave: ${keywords}`);

    const pexelsResponse = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(keywords)}&per_page=5`, {
      headers: { Authorization: pexelsApiKey },
    });

    if (!pexelsResponse.ok) {
      const errorData = await pexelsResponse.json();
      throw new Error(`Erro na API Pexels: ${pexelsResponse.status} - ${JSON.stringify(errorData)}`);
    }

    const pexelsData = await pexelsResponse.json();
    if (pexelsData.videos && pexelsData.videos.length > 0) {
      for (const video of pexelsData.videos) {
        const highestQualityVideo = video.video_files.reduce((prev, current) => {
          return (prev.width * prev.height || 0) > (current.width * current.height || 0) ? prev : current;
        });
        videoClips.push(highestQualityVideo.link);
      }
    } else {
      console.warn("Nenhum vídeo de stock encontrado para as palavras-chave.");
    }

    console.log(`Clipes de vídeo de stock encontrados: ${videoClips.length}`);

    // Passo 3: Edição e Renderização do Vídeo Final (Shotstack API)
    const shotstackApiKey = SHOTSTACK_API_KEY;
    if (!shotstackApiKey) {
      throw new Error("SHOTSTACK_API_KEY não está definida (hardcoded).");
    }

    const clips = videoClips.map((url, index) => ({
      asset: {
        type: "video",
        src: url,
        volume: 0
      },
      start: index * 5,
      length: 5
    }));

    const shotstackPayload = {
      timeline: {
        tracks: [
          {
            clips: clips
          },
          {
            clips: [
              {
                asset: {
                  type: "audio",
                  src: audioDubladoUrl
                },
                start: 0,
                length: 60
              }
            ]
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
        "x-api-key": shotstackApiKey,
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

    let finalVideoUrl;
    let renderStatus = "";
    const maxAttempts = 60;
    let attempt = 0;

    while (renderStatus !== "done" && renderStatus !== "failed" && attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      const statusResponse = await fetch(`https://api.shotstack.io/v1/render/${renderId}/status`, {
        headers: { "x-api-key": shotstackApiKey },
      });
      const statusData = await statusResponse.json();
      renderStatus = statusData.response.status;
      finalVideoUrl = statusData.response.url;
      console.log(`Status de renderização Shotstack: ${renderStatus} (Tentativa ${attempt + 1}/${maxAttempts})`);
      attempt++;
    }

    if (renderStatus !== "done" || !finalVideoUrl) {
      throw new Error(`Renderização do Shotstack falhou ou excedeu o tempo limite. Status: ${renderStatus}`);
    }

    console.log(`Vídeo final URL: ${finalVideoUrl}`);

    // Passo 4: Atualização do Status e URL do Vídeo Final
    try {
      await VideoProject.updateOne(
        { _id: projectId },
        {
          status: "Completed",
          finalVideoUrl: finalVideoUrl,
          updatedAt: new Date(),
        }
      );
    } catch (dbError) {
      console.error("Erro ao atualizar projeto no banco:", dbError);
    }

    console.log(`Projeto ${projectId} concluído com sucesso!`);
  } catch (error) {
    console.error(`Erro no processamento do projeto ${projectId}:`, error);
    try {
      await VideoProject.updateOne(
        { _id: projectId },
        {
          status: "Failed",
          updatedAt: new Date(),
        }
      );
    } catch (dbError) {
      console.error("Erro ao atualizar projeto no banco:", dbError);
    }
  }
}, { connection });

console.log("Worker de processamento de vídeo iniciado.");


