import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import VideoProject from '@/lib/models/VideoProject';
export async function GET() {
    try {
        await connectToDatabase();
        const projects = await VideoProject.find({}).sort({ createdAt: -1 });
        return NextResponse.json(projects);
    }
    catch (error) {
        console.error('Erro ao buscar projetos:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
