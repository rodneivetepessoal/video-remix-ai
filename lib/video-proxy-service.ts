import ShotstackService from "./shotstack-service";

class VideoProxyService {
  private shotstackService: ShotstackService;
  private urlCache: Map<string, { url: string; timestamp: number }>;
  private cacheTimeout: number;

  constructor() {
    this.shotstackService = new ShotstackService(
      process.env.SHOTSTACK_API_KEY || ""
    );
    this.urlCache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutos
  }

  /**
   * Obter URL válida para um render ID
   */
  async getValidVideoUrl(
    renderId: string
  ): Promise<{
    success: boolean;
    url?: string;
    source?: string;
    error?: string;
    status?: string;
  }> {
    try {
      console.log(`🔍 Buscando URL válida para render ${renderId}`);

      const cached = this.urlCache.get(renderId);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log("📋 Usando URL em cache");
        return {
          success: true,
          url: cached.url,
          source: "cache",
        };
      }

      const result = await this.shotstackService.checkRenderStatus(renderId);

      if (result.status === "done" && result.url) {
        console.log(`✅ URL válida obtida: ${result.url}`);

        this.urlCache.set(renderId, {
          url: result.url,
          timestamp: Date.now(),
        });

        return {
          success: true,
          url: result.url,
          source: "shotstack_api",
        };
      } else {
        console.log(`⚠️ Render não está pronto: ${result.status}`);
        return {
          success: false,
          error: `Render status: ${result.status}`,
          status: result.status,
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      console.error(`❌ Erro ao obter URL para ${renderId}:`, errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

export default VideoProxyService;
