// Script para debugar URLs salvas no banco de dados
const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://rodneivete_db_user:aTKaQMNAJ55P24e5@cluster0.zfrgtkz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

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

async function debugUrls() {
  try {
    console.log('🔌 Conectando ao MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');

    const VideoProject = mongoose.model('VideoProject', VideoProjectSchema);
    
    console.log('\n📊 Buscando projetos...');
    const projects = await VideoProject.find({}).sort({ createdAt: -1 }).limit(10);
    
    console.log(`\n📋 Encontrados ${projects.length} projetos:\n`);
    
    projects.forEach((project, index) => {
      console.log(`${index + 1}. Projeto ${project._id.toString().substring(0, 8)}...`);
      console.log(`   Status: ${project.status}`);
      console.log(`   YouTube URL: ${project.youtubeUrl}`);
      console.log(`   Final Video URL: ${project.finalVideoUrl || 'Não definida'}`);
      console.log(`   Render ID: ${project.renderId || 'Não definido'}`);
      console.log(`   Criado em: ${project.createdAt}`);
      console.log(`   Atualizado em: ${project.updatedAt}`);
      
      if (project.finalVideoUrl) {
        console.log(`   🔍 Analisando URL: ${project.finalVideoUrl}`);
        
        // Verificar se é URL do Shotstack
        if (project.finalVideoUrl.includes('shotstack')) {
          console.log(`   ✅ URL do Shotstack detectada`);
        } else if (project.finalVideoUrl.includes('s3')) {
          console.log(`   ✅ URL do S3 detectada`);
        } else {
          console.log(`   ⚠️ URL de tipo desconhecido`);
        }
      }
      
      if (project.processingSteps && project.processingSteps.length > 0) {
        console.log(`   📝 Últimos steps:`);
        project.processingSteps.slice(-3).forEach(step => {
          console.log(`     - ${step.step}: ${step.status} (${step.details || 'sem detalhes'})`);
        });
      }
      
      console.log('');
    });
    
    // Estatísticas
    const stats = await VideoProject.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    console.log('📊 Estatísticas por status:');
    stats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count}`);
    });
    
    // Verificar projetos com URLs válidas
    const completedWithUrls = await VideoProject.find({
      status: 'Completed',
      finalVideoUrl: { $exists: true, $ne: null, $ne: '' }
    });
    
    console.log(`\n🎥 Projetos concluídos com URLs: ${completedWithUrls.length}`);
    
    if (completedWithUrls.length > 0) {
      console.log('\n🔗 URLs dos vídeos concluídos:');
      completedWithUrls.forEach((project, index) => {
        console.log(`${index + 1}. ${project.finalVideoUrl}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexão fechada');
  }
}

debugUrls();

