// Serviço Shotstack com sistema de polling para verificar status de renderização
class ShotstackService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = "https://api.shotstack.io/v1";
    this.maxPollingAttempts = 30; // 5 minutos máximo (30 x 10s)
    this.pollingInterval = 10000; // 10 segundos
  }

  /**
   * Criar timeline para renderização
   */
  createTimeline(videoClips, audioData = null) {
    const totalDuration = audioData ? audioData.duration : Math.min(30, videoClips.length * 5);
    const clipDuration = Math.max(3, Math.floor(totalDuration / videoClips.length));

    console.log(`🎬 Criando timeline: ${totalDuration}s total, ${clipDuration}s por clip`);

    // Clips de vídeo
    const videoTrack = {
      clips: videoClips.map((url, index) => ({
        asset: {
          type: "video",
          src: url,
          volume: audioData ? 0 : 0.3 // Sem áudio se tiver dublagem
        },
        start: index * clipDuration,
        length: clipDuration,
        fit: "crop", // Ajustar para preencher o frame
        scale: 1.0
      }))
    };

    const tracks = [videoTrack];

    // Adicionar track de áudio se disponível
    if (audioData && audioData.audioUrl && !audioData.isSimulated) {
      const audioTrack = {
        clips: [
          {
            asset: {
              type: "audio",
              src: audioData.audioUrl,
              volume: 1.0
            },
            start: 0,
            length: totalDuration
          }
        ]
      };
      tracks.push(audioTrack);
      console.log('🎵 Track de áudio adicionado');
    }

    return {
      timeline: { tracks },
      output: {
        format: "mp4",
        resolution: "hd", // 1280x720
        fps: 25,
        quality: "medium"
      }
    };
  }

  /**
   * Iniciar renderização
   */
  async startRender(videoClips, audioData = null) {
    try {
      const payload = this.createTimeline(videoClips, audioData);
      
      console.log('📤 Enviando para Shotstack...');
      console.log('📊 Payload:', {
        tracks: payload.timeline.tracks.length,
        clips: videoClips.length,
        hasAudio: !!audioData && !audioData.isSimulated
      });

      const response = await fetch(`${this.baseUrl}/render`, {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Shotstack API Error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      const renderId = data.response.id;

      console.log(`✅ Renderização iniciada: ${renderId}`);
      
      return {
        renderId,
        status: 'queued',
        message: 'Renderização iniciada com sucesso'
      };

    } catch (error) {
      console.error('❌ Erro ao iniciar renderização:', error);
      throw error;
    }
  }

  /**
   * Verificar status de renderização
   */
  async checkRenderStatus(renderId) {
    try {
      const response = await fetch(`${this.baseUrl}/render/${renderId}`, {
        headers: {
          "x-api-key": this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }

      const data = await response.json();
      const status = data.response.status;
      const url = data.response.url;

      console.log(`📊 Status da renderização ${renderId}: ${status}`);

      return {
        renderId,
        status,
        url,
        progress: this.getProgressFromStatus(status),
        message: this.getMessageFromStatus(status)
      };

    } catch (error) {
      console.error(`❌ Erro ao verificar status ${renderId}:`, error);
      throw error;
    }
  }

  /**
   * Polling até completar renderização
   */
  async waitForCompletion(renderId) {
    console.log(`⏳ Iniciando polling para renderização ${renderId}`);
    
    let attempts = 0;
    
    while (attempts < this.maxPollingAttempts) {
      try {
        const result = await this.checkRenderStatus(renderId);
        
        if (result.status === 'done') {
          console.log(`✅ Renderização ${renderId} concluída!`);
          console.log(`🎥 URL: ${result.url}`);
          return result;
        }
        
        if (result.status === 'failed') {
          throw new Error(`Renderização falhou: ${result.message}`);
        }
        
        console.log(`⏳ Tentativa ${attempts + 1}/${this.maxPollingAttempts} - Status: ${result.status}`);
        
        // Aguardar antes da próxima verificação
        await new Promise(resolve => setTimeout(resolve, this.pollingInterval));
        attempts++;
        
      } catch (error) {
        console.error(`❌ Erro no polling (tentativa ${attempts + 1}):`, error);
        attempts++;
        
        if (attempts >= this.maxPollingAttempts) {
          throw new Error(`Timeout: Renderização não concluída após ${this.maxPollingAttempts} tentativas`);
        }
        
        // Aguardar antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, this.pollingInterval));
      }
    }
    
    throw new Error(`Timeout: Renderização não concluída após ${this.maxPollingAttempts} tentativas`);
  }

  /**
   * Processo completo: iniciar + aguardar conclusão
   */
  async renderAndWait(videoClips, audioData = null) {
    try {
      console.log('🚀 Iniciando processo completo de renderização');
      
      // Iniciar renderização
      const startResult = await this.startRender(videoClips, audioData);
      
      // Aguardar conclusão
      const finalResult = await this.waitForCompletion(startResult.renderId);
      
      return {
        success: true,
        renderId: finalResult.renderId,
        finalUrl: finalResult.url,
        status: finalResult.status
      };
      
    } catch (error) {
      console.error('❌ Erro no processo de renderização:', error);
      return {
        success: false,
        error: error.message,
        renderId: null,
        finalUrl: null
      };
    }
  }

  /**
   * Obter progresso baseado no status
   */
  getProgressFromStatus(status) {
    const progressMap = {
      'queued': 10,
      'fetching': 25,
      'rendering': 50,
      'saving': 80,
      'done': 100,
      'failed': 0
    };
    return progressMap[status] || 0;
  }

  /**
   * Obter mensagem baseada no status
   */
  getMessageFromStatus(status) {
    const messageMap = {
      'queued': 'Na fila para processamento',
      'fetching': 'Baixando assets',
      'rendering': 'Renderizando vídeo',
      'saving': 'Salvando arquivo final',
      'done': 'Renderização concluída',
      'failed': 'Renderização falhou'
    };
    return messageMap[status] || 'Status desconhecido';
  }

  /**
   * Verificar se API está funcionando
   */
  async healthCheck() {
    try {
      // Fazer uma requisição simples para verificar conectividade
      const response = await fetch(`${this.baseUrl}/render`, {
        method: "GET",
        headers: {
          "x-api-key": this.apiKey,
        },
      });

      return {
        healthy: response.status !== 401, // 401 = unauthorized, outros erros são OK
        status: response.status,
        message: response.status === 401 ? 'API Key inválida' : 'API funcionando'
      };
      
    } catch (error) {
      return {
        healthy: false,
        status: 0,
        message: error.message
      };
    }
  }
}

module.exports = ShotstackService;

