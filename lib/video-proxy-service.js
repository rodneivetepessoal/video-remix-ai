// Serviço de proxy para vídeos com URLs expiradas
const ShotstackService = require('./shotstack-service');

class VideoProxyService {
  constructor() {
    this.shotstackService = new ShotstackService("rpHQO8HDpJhgdXDzSDcqQoOYAKU1dFXDNsO9M55j");
    this.urlCache = new Map(); // Cache de URLs válidas
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutos
  }

  /**
   * Obter URL válida para um render ID
   */
  async getValidVideoUrl(renderId) {
    try {
      console.log(`🔍 Buscando URL válida para render ${renderId}`);
      
      // Verificar cache primeiro
      const cached = this.urlCache.get(renderId);
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        console.log('📋 Usando URL em cache');
        return {
          success: true,
          url: cached.url,
          source: 'cache'
        };
      }

      // Buscar status atual no Shotstack
      const result = await this.shotstackService.checkRenderStatus(renderId);
      
      if (result.status === 'done' && result.url) {
        console.log(`✅ URL válida obtida: ${result.url}`);
        
        // Salvar no cache
        this.urlCache.set(renderId, {
          url: result.url,
          timestamp: Date.now()
        });
        
        return {
          success: true,
          url: result.url,
          source: 'shotstack_api'
        };
      } else {
        console.log(`⚠️ Render não está pronto: ${result.status}`);
        return {
          success: false,
          error: `Render status: ${result.status}`,
          status: result.status
        };
      }

    } catch (error) {
      console.error(`❌ Erro ao obter URL para ${renderId}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verificar se uma URL ainda é válida
   */
  async isUrlValid(url) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Renovar URL expirada
   */
  async renewExpiredUrl(renderId, currentUrl) {
    try {
      console.log(`🔄 Renovando URL expirada para render ${renderId}`);
      
      // Verificar se URL atual ainda é válida
      const isValid = await this.isUrlValid(currentUrl);
      if (isValid) {
        console.log('✅ URL atual ainda é válida');
        return {
          success: true,
          url: currentUrl,
          renewed: false
        };
      }

      // Buscar nova URL
      const result = await this.getValidVideoUrl(renderId);
      if (result.success) {
        console.log('✅ URL renovada com sucesso');
        return {
          success: true,
          url: result.url,
          renewed: true
        };
      } else {
        return result;
      }

    } catch (error) {
      console.error(`❌ Erro ao renovar URL:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Gerar URL de proxy local
   */
  generateProxyUrl(renderId) {
    return `/api/video-proxy/${renderId}`;
  }

  /**
   * Limpar cache
   */
  clearCache() {
    this.urlCache.clear();
    console.log('🗑️ Cache de URLs limpo');
  }

  /**
   * Estatísticas do cache
   */
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [renderId, entry] of this.urlCache.entries()) {
      if ((now - entry.timestamp) < this.cacheTimeout) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      total: this.urlCache.size,
      valid: validEntries,
      expired: expiredEntries,
      cacheTimeoutMinutes: this.cacheTimeout / 1000 / 60
    };
  }

  /**
   * Limpar entradas expiradas do cache
   */
  cleanExpiredCache() {
    const now = Date.now();
    let cleaned = 0;

    for (const [renderId, entry] of this.urlCache.entries()) {
      if ((now - entry.timestamp) >= this.cacheTimeout) {
        this.urlCache.delete(renderId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Limpas ${cleaned} entradas expiradas do cache`);
    }

    return cleaned;
  }
}

module.exports = VideoProxyService;

