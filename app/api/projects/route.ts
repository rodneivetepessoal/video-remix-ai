import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import VideoProject from '@/lib/models/VideoProject';

const MONGODB_URI = "mongodb+srv://rodneivete_db_user:aTKaQMNAJ55P24e5@cluster0.zfrgtkz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

export async function GET() {
  try {
    await connectToDatabase(MONGODB_URI);
    const projects = await VideoProject.find({}).sort({ createdAt: -1 });
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Erro ao buscar projetos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}


