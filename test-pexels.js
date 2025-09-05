// Teste da integração com Pexels API
const PEXELS_API_KEY = "BPGuQaS6eWs2UEBtPkncoIKbUhCq2DzP5D4L9xo08ff8MqjR9r0aJHbi";

async function testPexelsAPI() {
  console.log("Testando integração com Pexels API...");
  
  try {
    // Teste de busca de vídeos
    const keywords = "nature landscape";
    console.log(`Buscando vídeos para: "${keywords}"`);
    
    const pexelsResponse = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(keywords)}&per_page=5`, {
      headers: { 
        Authorization: PEXELS_API_KEY 
      },
    });

    console.log(`Status da resposta: ${pexelsResponse.status}`);
    
    if (!pexelsResponse.ok) {
      const errorData = await pexelsResponse.json();
      console.error("Erro na API Pexels:", errorData);
      return;
    }

    const pexelsData = await pexelsResponse.json();
    console.log(`✅ Sucesso! Encontrados ${pexelsData.videos.length} vídeos`);
    
    if (pexelsData.videos && pexelsData.videos.length > 0) {
      console.log("\nVídeos encontrados:");
      
      pexelsData.videos.forEach((video, index) => {
        console.log(`\n${index + 1}. ID: ${video.id}`);
        console.log(`   Duração: ${video.duration}s`);
        console.log(`   Largura: ${video.width}px, Altura: ${video.height}px`);
        
        // Encontrar o vídeo de maior qualidade
        const highestQualityVideo = video.video_files.reduce((prev, current) => {
          return (prev.width * prev.height || 0) > (current.width * current.height || 0) ? prev : current;
        });
        
        console.log(`   Melhor qualidade: ${highestQualityVideo.width}x${highestQualityVideo.height}`);
        console.log(`   URL: ${highestQualityVideo.link}`);
        console.log(`   Tipo: ${highestQualityVideo.file_type}`);
      });
      
      // Testar diferentes palavras-chave
      console.log("\n" + "=".repeat(50));
      console.log("Testando outras palavras-chave...");
      
      const otherKeywords = ["technology", "business", "ocean"];
      
      for (const keyword of otherKeywords) {
        console.log(`\nBuscando: "${keyword}"`);
        
        const response = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(keyword)}&per_page=3`, {
          headers: { Authorization: PEXELS_API_KEY },
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`  ✅ ${data.videos.length} vídeos encontrados`);
        } else {
          console.log(`  ❌ Erro: ${response.status}`);
        }
      }
      
    } else {
      console.log("Nenhum vídeo encontrado.");
    }
    
  } catch (error) {
    console.error("Erro no teste:", error);
  }
}

testPexelsAPI();

