// Teste do serviço YouTube
const YouTubeService = require('./lib/youtube-service');

async function testYouTubeService() {
  console.log('🧪 Testando serviço YouTube...\n');
  
  const youtubeService = new YouTubeService();
  
  // URLs de teste
  const testUrls = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Roll
    'https://www.youtube.com/watch?v=jNQXAC9IVRw', // Me at the zoo
    'https://www.youtube.com/shorts/qAxbEJiAWYU' // YouTube Short
  ];

  for (const url of testUrls) {
    try {
      console.log(`\n📺 Testando URL: ${url}`);
      console.log('=' .repeat(60));
      
      // Teste 1: Informações básicas
      console.log('🔍 Extraindo informações básicas...');
      const info = await youtubeService.getVideoInfo(url);
      
      console.log('📋 Informações extraídas:');
      console.log(`  - Título: ${info.title}`);
      console.log(`  - Canal: ${info.author.name}`);
      console.log(`  - Duração: ${Math.floor(info.duration / 60)}:${(info.duration % 60).toString().padStart(2, '0')}`);
      console.log(`  - Visualizações: ${info.viewCount.toLocaleString()}`);
      console.log(`  - Categoria: ${info.category}`);
      console.log(`  - Palavras-chave: ${info.keywords.slice(0, 5).join(', ')}`);
      console.log(`  - Descrição: ${info.description.substring(0, 100)}...`);
      
      // Teste 2: Palavras-chave para busca
      console.log('\n🔍 Extraindo palavras-chave para busca...');
      const keywords = await youtubeService.getSearchKeywords(url);
      
      console.log('🏷️ Palavras-chave extraídas:');
      console.log(`  - Primárias: ${keywords.primaryKeywords.join(', ')}`);
      console.log(`  - Secundárias: ${keywords.secondaryKeywords.join(', ')}`);
      console.log(`  - Fonte: ${keywords.source}`);
      
      // Teste 3: Texto de conteúdo
      console.log('\n📝 Gerando texto de conteúdo...');
      const contentText = await youtubeService.generateContentText(url);
      
      console.log('📄 Texto gerado:');
      console.log(`  - Texto: ${contentText.text.substring(0, 150)}...`);
      console.log(`  - Fonte: ${contentText.source}`);
      console.log(`  - Confiança: ${(contentText.confidence * 100).toFixed(1)}%`);
      
      console.log('\n✅ Teste concluído com sucesso!');
      
    } catch (error) {
      console.error(`❌ Erro no teste para ${url}:`, error.message);
    }
    
    // Aguardar um pouco entre os testes
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Teste do status do serviço
  console.log('\n📊 Status do serviço:');
  const status = youtubeService.getStatus();
  console.log(JSON.stringify(status, null, 2));
  
  console.log('\n🎉 Todos os testes concluídos!');
}

// Executar testes
testYouTubeService().catch(error => {
  console.error('💥 Erro crítico nos testes:', error);
  process.exit(1);
});

