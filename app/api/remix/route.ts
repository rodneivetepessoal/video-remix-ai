import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import VideoProject from "@/lib/models/VideoProject";
import { videoProcessingQueue } from "@/lib/queue";

const MONGODB_URI =
  "mongodb+srv://rodneivete_db_user:aTKaQMNAJ55P24e5@cluster0.zfrgtkz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

export async function POST(request: Request) {
  try {
    await connectToDatabase(MONGODB_URI);

    const { youtubeUrl } = await request.json();

    if (!youtubeUrl) {
      return NextResponse.json(
        { error: "URL do YouTube é obrigatória" },
        { status: 400 }
      );
    }

    const newProject = await VideoProject.create({
      youtubeUrl,
      status: "Processing",
    });

    // A única linha que precisa ser alterada é esta:
    // O nome do job foi padronizado para 'create-remix-job'.
    await videoProcessingQueue.add("create-remix-job", {
      projectId: newProject._id.toString(),
      youtubeUrl,
    });

    console.log(
      `Recebida URL do YouTube: ${youtubeUrl}, Projeto ID: ${newProject._id}`
    );

    return NextResponse.json({
      message: "Processamento de vídeo iniciado com sucesso!",
      projectId: newProject._id,
    });
  } catch (error) {
    console.error("Erro ao iniciar o processamento do vídeo:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
