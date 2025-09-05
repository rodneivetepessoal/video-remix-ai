// Teste da integração com Shotstack API
const SHOTSTACK_API_KEY = "rpHQO8HDpJhgdXDzSDcqQoOYAKU1dFXDNsO9M55j";

async function testShotstackAPI() {
  console.log("Testando integração com Shotstack API...");
  
  try {
    // URLs de vídeos de teste do Pexels (obtidos do teste anterior)
    const testVideoUrls = [
      "https://videos.pexels.com/video-files/33757025/14331241_3840_2160_30fps.mp4",
      "https://videos.pexels.com/video-files/33773296/14336624_3840_2160_60fps.mp4"
    ];
    
    // Criar clips de vídeo
    const clips = testVideoUrls.map((url, index) => ({
      asset: {
        type: "video",
        src: url,
        volume: 0 // Sem áudio dos vídeos originais
      },
      start: index * 5, // Cada clip dura 5 segundos
      length: 5
    }));

    // Payload para o Shotstack
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

    console.log("Enviando requisição de renderização para Shotstack...");
    console.log("Payload:", JSON.stringify(shotstackPayload, null, 2));

    const shotstackResponse = await fetch("https://api.shotstack.io/v1/render", {
      method: "POST",
      headers: {
        "x-api-key": SHOTSTACK_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(shotstackPayload),
    });

    console.log(`Status da resposta: ${shotstackResponse.status}`);

    if (!shotstackResponse.ok) {
      const errorData = await shotstackResponse.json();
      console.error("Erro na API Shotstack:", JSON.stringify(errorData, null, 2));
      return;
    }

    const shotstackData = await shotstackResponse.json();
    const renderId = shotstackData.response.id;
    
    console.log(`✅ Renderização iniciada! ID: ${renderId}`);
    console.log("Resposta completa:", JSON.stringify(shotstackData, null, 2));

    // Monitorar o status da renderização
    console.log("\nMonitorando status da renderização...");
    
    let renderStatus = "";
    let finalVideoUrl = null;
    const maxAttempts = 12; // 1 minuto de tentativas
    let attempt = 0;

    while (renderStatus !== "done" && renderStatus !== "failed" && attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Aguardar 5 segundos
      
      console.log(`Verificando status (tentativa ${attempt + 1}/${maxAttempts})...`);
      
      const statusResponse = await fetch(`https://api.shotstack.io/v1/render/${renderId}/status`, {
        headers: { "x-api-key": SHOTSTACK_API_KEY },
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        renderStatus = statusData.response.status;
        finalVideoUrl = statusData.response.url;
        
        console.log(`Status: ${renderStatus}`);
        
        if (statusData.response.data && statusData.response.data.progress) {
          console.log(`Progresso: ${statusData.response.data.progress}%`);
        }
        
      } else {
        console.log(`Erro ao verificar status: ${statusResponse.status}`);
      }
      
      attempt++;
    }

    if (renderStatus === "done" && finalVideoUrl) {
      console.log(`\n✅ Renderização concluída com sucesso!`);
      console.log(`URL do vídeo final: ${finalVideoUrl}`);
    } else if (renderStatus === "failed") {
      console.log(`\n❌ Renderização falhou.`);
    } else {
      console.log(`\n⏱️ Renderização ainda em andamento. Status: ${renderStatus}`);
      console.log("Você pode verificar o status mais tarde usando o ID:", renderId);
    }
    
  } catch (error) {
    console.error("Erro no teste:", error);
  }
}

testShotstackAPI();

