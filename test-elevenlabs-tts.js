// Teste da integração com ElevenLabs Text-to-Speech API
const ELEVENLABS_API_KEY = "sk_13f3db16682c27d2c865a89d83fe0c63075bd07a60b19275";

async function testElevenLabsTTS() {
  console.log("Testando integração com ElevenLabs Text-to-Speech API...");
  
  try {
    // Primeiro, vamos listar as vozes disponíveis
    console.log("Buscando vozes disponíveis...");
    
    const voicesResponse = await fetch("https://api.elevenlabs.io/v1/voices", {
      method: "GET",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
    });

    if (!voicesResponse.ok) {
      const errorData = await voicesResponse.json();
      console.error("Erro ao buscar vozes:", errorData);
      return;
    }

    const voicesData = await voicesResponse.json();
    console.log("Vozes disponíveis:", voicesData.voices.length);
    
    if (voicesData.voices.length > 0) {
      const firstVoice = voicesData.voices[0];
      console.log(`Usando voz: ${firstVoice.name} (${firstVoice.voice_id})`);
      
      // Agora vamos testar text-to-speech
      const testText = "Hello, this is a test of the ElevenLabs text-to-speech API.";
      
      console.log("Gerando áudio com text-to-speech...");
      
      const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${firstVoice.voice_id}`, {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: testText,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        }),
      });

      console.log(`Status da resposta TTS: ${ttsResponse.status}`);
      
      if (!ttsResponse.ok) {
        const errorData = await ttsResponse.json();
        console.error("Erro na API TTS:", errorData);
        return;
      }

      console.log("✅ Sucesso! Text-to-speech funcionando.");
      console.log("Content-Type:", ttsResponse.headers.get('content-type'));
      
      // Salvar o áudio para teste
      const audioBuffer = await ttsResponse.arrayBuffer();
      const fs = require('fs');
      fs.writeFileSync('test-audio.mp3', Buffer.from(audioBuffer));
      console.log("✅ Áudio salvo como test-audio.mp3");
      
    } else {
      console.log("Nenhuma voz disponível encontrada.");
    }
    
  } catch (error) {
    console.error("Erro no teste:", error);
  }
}

testElevenLabsTTS();

