// Definições de tipos
interface VideoClip {
  asset: {
    type: "video";
    src: string;
    volume?: number;
  };
  start: number;
  length: number;
  fit: "crop" | "cover" | "contain" | "none"; // A propriedade 'fit' fica aqui
}

interface AudioAsset {
  type: "audio";
  src: string;
  volume?: number;
}

interface AudioData {
  audioUrl: string;
  duration: number;
  isSimulated?: boolean;
}

export default class ShotstackService {
  private apiKey: string;
  private baseUrl: string;
  private maxPollingAttempts: number;
  private pollingInterval: number;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("A chave de API do Shotstack é obrigatória.");
    }
    this.apiKey = apiKey;
    this.baseUrl = "https://api.shotstack.io/v1";
    this.maxPollingAttempts = 30; // 5 minutos máximo (30 x 10s)
    this.pollingInterval = 10000; // 10 segundos
  }

  async renderAndWait(videoClips: string[], audioData: AudioData) {
    try {
      console.log("🚀 Iniciando processo completo de renderização");
      const startResult = await this.startRender(videoClips, audioData);
      const finalResult = await this.waitForCompletion(startResult.renderId);
      return {
        success: true,
        renderId: finalResult.renderId,
        finalUrl: finalResult.url,
        status: finalResult.status,
      };
    } catch (error) {
      console.error("❌ Erro no processo de renderização:", error);
      return {
        success: false,
        error: (error as Error).message,
        renderId: null,
        finalUrl: null,
      };
    }
  }

  private createTimeline(videoClips: string[], audioData: AudioData) {
    const totalDuration = audioData.duration;
    const clipDuration = Math.max(
      3,
      Math.floor(totalDuration / videoClips.length)
    );

    const videoTrack = {
      clips: videoClips.map(
        (url, index): VideoClip => ({
          asset: { type: "video", src: url, volume: 0 },
          start: index * clipDuration,
          length: clipDuration,
          // CORREÇÃO: A propriedade 'fit' foi movida para fora do objeto 'asset'.
          fit: "cover",
        })
      ),
    };

    const tracks = [videoTrack];

    if (audioData.audioUrl && !audioData.isSimulated) {
      const audioTrack = {
        clips: [
          {
            asset: { type: "audio", src: audioData.audioUrl, volume: 1.0 },
            start: 0,
            length: totalDuration,
          },
        ],
      };
      tracks.push(audioTrack);
    }

    return {
      timeline: { tracks },
      output: { format: "mp4", resolution: "hd" },
    };
  }

  private async startRender(videoClips: string[], audioData: AudioData) {
    const payload = this.createTimeline(videoClips, audioData);
    console.log("📤 Enviando para Shotstack...");

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
      throw new Error(
        `Erro na API Shotstack: ${response.status} - ${JSON.stringify(
          errorData
        )}`
      );
    }
    const data = await response.json();
    return { renderId: data.response.id };
  }

  private async waitForCompletion(renderId: string) {
    console.log(`⏳ Iniciando polling para renderização ${renderId}`);
    for (let i = 0; i < this.maxPollingAttempts; i++) {
      const result = await this.checkRenderStatus(renderId);
      if (result.status === "done") {
        console.log(`✅ Renderização ${renderId} concluída!`);
        return result;
      }
      if (result.status === "failed") {
        throw new Error("A renderização do Shotstack falhou.");
      }
      await new Promise((resolve) => setTimeout(resolve, this.pollingInterval));
    }
    throw new Error(
      "Timeout: A renderização do Shotstack excedeu o tempo limite."
    );
  }

  private async checkRenderStatus(renderId: string) {
    const response = await fetch(`${this.baseUrl}/render/${renderId}`, {
      headers: { "x-api-key": this.apiKey },
    });
    if (!response.ok) {
      throw new Error(`Falha ao verificar status: ${response.status}`);
    }
    const data = await response.json();
    console.log(
      `📊 Status da renderização ${renderId}: ${data.response.status}`
    );
    return {
      renderId,
      status: data.response.status,
      url: data.response.url,
    };
  }
}
