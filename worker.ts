import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import mongoose from "mongoose";
import VideoProject, { IVideoProject } from "./lib/models/VideoProject";
// CORREÇÃO: Imports alterados para default
import TTSService from "./lib/tts-service";
import ShotstackService from "./lib/shotstack-service";
import connectToDatabase from "./lib/mongodb";

// --- Configuração ---
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const SHOTSTACK_API_KEY = process.env.SHOTSTACK_API_KEY;
const MONGODB_URI = process.env.MONGODB_URI;
const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";

if (!PEXELS_API_KEY || !SHOTSTACK_API_KEY || !MONGODB_URI) {
  console.error("ERRO: Variáveis de ambiente essenciais não estão definidas.");
  process.exit(1);
}

// --- Inicialização dos Serviços ---
// CORREÇÃO: Agora usa a importação default corretamente
const ttsService = new TTSService();
const shotstackService = new ShotstackService(SHOTSTACK_API_KEY);

const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

// --- Funções Auxiliares ---
const addProcessingStep = async (
  projectId: string,
  step: string,
  status: string,
  details = ""
) => {
  try {
    await VideoProject.findByIdAndUpdate(projectId, {
      $push: {
        processingSteps: { step, status, timestamp: new Date(), details },
      },
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("❌ Erro ao adicionar etapa de processamento:", error);
  }
};

const searchStockVideos = async (keywords: string): Promise<string[]> => {
  console.log(`🔍 Buscando vídeos com as palavras-chave: "${keywords}"`);
  const response = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(
      keywords
    )}&per_page=5&orientation=landscape&size=medium`,
    {
      headers: { Authorization: PEXELS_API_KEY },
    }
  );

  if (!response.ok) {
    throw new Error(`Erro na API Pexels: ${response.status}`);
  }

  const data = await response.json();
  const videoLinks = data.videos
    .map((video: any) => {
      const hdFile = video.video_files.find(
        (f: any) => f.quality === "hd" && f.width > 1280
      );
      return hdFile ? hdFile.link : video.video_files[0]?.link;
    })
    .filter((link: string | undefined) => link);

  if (videoLinks.length < 3) {
    console.log("⚠️ Poucos vídeos encontrados, usando fallback.");
    return [
      "https://videos.pexels.com/video-files/853874/853874-hd.mp4",
      "https://videos.pexels.com/video-files/857039/857039-hd.mp4",
      "https://videos.pexels.com/video-files/854619/854619-hd.mp4",
    ];
  }

  return videoLinks;
};

// --- Lógica do Worker ---
const worker = new Worker(
  "videoProcessing",
  async (job: Job) => {
    const { projectId, youtubeUrl } = job.data;
    console.log(`🚀 Iniciando processamento para o projeto: ${projectId}`);

    try {
      await connectToDatabase(MONGODB_URI);
      await VideoProject.findByIdAndUpdate(projectId, { status: "Processing" });
      await addProcessingStep(projectId, "Início", "Concluído");

      // 1. Processamento de Áudio
      const audioResult = await ttsService.processVideoAudio(youtubeUrl);
      await VideoProject.findByIdAndUpdate(projectId, {
        audioData: audioResult.audio,
      });
      await addProcessingStep(
        projectId,
        "Processamento de Áudio",
        "Concluído",
        `Duração: ${audioResult.audio.duration}s`
      );

      // 2. Busca de Vídeos
      const keywords = audioResult.translatedText
        .split(" ")
        .slice(0, 5)
        .join(" ");
      const videoClips = await searchStockVideos(keywords);
      await VideoProject.findByIdAndUpdate(projectId, { videoClips });
      await addProcessingStep(
        projectId,
        "Busca de Vídeos",
        "Concluído",
        `${videoClips.length} clipes encontrados`
      );

      // 3. Renderização de Vídeo
      const renderResult = await shotstackService.renderAndWait(
        videoClips,
        audioResult.audio
      );
      if (!renderResult.success)
        throw new Error(renderResult.error || "Falha na renderização");
      await VideoProject.findByIdAndUpdate(projectId, {
        renderId: renderResult.renderId,
        finalVideoUrl: renderResult.finalUrl,
        status: "Completed",
      });
      await addProcessingStep(
        projectId,
        "Renderização",
        "Concluído",
        `ID: ${renderResult.renderId}`
      );

      console.log(`✅ Projeto ${projectId} concluído com sucesso!`);
      return { finalUrl: renderResult.finalUrl };
    } catch (error) {
      console.error(
        `❌ ERRO CRÍTICO no projeto ${projectId}:`,
        (error as Error).message
      );
      await VideoProject.findByIdAndUpdate(projectId, { status: "Failed" });
      await addProcessingStep(
        projectId,
        "Erro",
        "Falhou",
        (error as Error).message
      );
      throw error;
    }
  },
  { connection, concurrency: 1 }
);

worker.on("completed", (job: Job, result: any) => {
  console.log(`🎉 Job ${job.id} completado. URL: ${result.finalUrl}`);
});

worker.on("failed", (job: Job | undefined, err: Error) => {
  console.error(`💥 Job ${job?.id} falhou: ${err.message}`);
});

console.log("🚀 Worker de processamento de vídeo iniciado e pronto!");
