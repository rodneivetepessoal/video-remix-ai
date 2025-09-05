// Teste simples da integração com ElevenLabs API
const ELEVENLABS_API_KEY = "sk_13f3db16682c27d2c865a89d83fe0c63075bd07a60b19275";

async function testElevenLabsAPI() {
  console.log("Testando integração com ElevenLabs API...");
  
  try {
    // URL de teste do YouTube (vídeo curto)
    const testYouTubeUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    
    const formData = new FormData();
    formData.append("source_url", testYouTubeUrl);
    formData.append("target_lang", "en");
    formData.append("dubbing_studio", "false"); // Mudando para false para aceitar watermark

    console.log("Enviando requisição para ElevenLabs...");
    
    const dubbingResponse = await fetch("https://api.elevenlabs.io/v1/dubbing", {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: formData,
    });

    console.log(`Status da resposta: ${dubbingResponse.status}`);
    
    if (!dubbingResponse.ok) {
      const errorData = await dubbingResponse.json();
      console.error("Erro na API ElevenLabs:", errorData);
      return;
    }

    const dubbingData = await dubbingResponse.json();
    console.log("Resposta da ElevenLabs:", JSON.stringify(dubbingData, null, 2));
    
    if (dubbingData.dubbed_audio_url) {
      console.log("✅ Sucesso! URL do áudio dublado:", dubbingData.dubbed_audio_url);
    }
    
    if (dubbingData.translated_text) {
      console.log("✅ Texto traduzido:", dubbingData.translated_text);
    }
    
  } catch (error) {
    console.error("Erro no teste:", error);
  }
}

testElevenLabsAPI();

