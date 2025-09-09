// Serviço para extração de metadados do YouTube
const ytdl = require('ytdl-core');

class YouTubeService {
  constructor() {
    this.cache = new Map(); // Cache simples para evitar requisições repetidas
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutos
  }

  /**
   * Extrair informações básicas de um vídeo do YouTube
   */
  async getVideoInfo(url) {
    try {
      console.log('📺 Extraindo informações do YouTube:', url);

      // Verificar cache
      const cacheKey = this.getCacheKey(url);
      const cached = this.cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        console.log('📋 Usando informações em cache');
        return cached.data;
      }

      // Validar URL
      if (!ytdl.validateURL(url)) {
        throw new Error('URL do YouTube inválida');
      }

      // Extrair informações
      const info = await ytdl.getInfo(url);
      const videoDetails = info.videoDetails;

      const extractedInfo = {
        videoId: videoDetails.videoId,
        title: videoDetails.title,
        description: videoDetails.description || '',
        duration: parseInt(videoDetails.lengthSeconds) || 0,
        viewCount: parseInt(videoDetails.viewCount) || 0,
        author: {
          name: videoDetails.author?.name || 'Unknown',
          channelUrl: videoDetails.author?.channel_url || ''
        },
        uploadDate: videoDetails.uploadDate || null,
        keywords: videoDetails.keywords || [],
        category: videoDetails.category || 'Unknown',
        thumbnails: videoDetails.thumbnails || [],
        isLiveContent: videoDetails.isLiveContent || false,
        extractedAt: new Date().toISOString()
      };

      // Salvar no cache
      this.cache.set(cacheKey, {
        data: extractedInfo,
        timestamp: Date.now()
      });

      console.log('✅ Informações extraídas com sucesso');
      console.log(`📝 Título: ${extractedInfo.title}`);
      console.log(`⏱️ Duração: ${Math.floor(extractedInfo.duration / 60)}:${(extractedInfo.duration % 60).toString().padStart(2, '0')}`);
      console.log(`👤 Canal: ${extractedInfo.author.name}`);
      console.log(`🏷️ Palavras-chave: ${extractedInfo.keywords.slice(0, 5).join(', ')}`);

      return extractedInfo;

    } catch (error) {
      console.error('❌ Erro ao extrair informações do YouTube:', error.message);
      
      // Retornar informações básicas como fallback
      return this.getFallbackInfo(url, error.message);
    }
  }

  /**
   * Extrair palavras-chave relevantes para busca de stock footage
   */
  async getSearchKeywords(url, maxKeywords = 10) {
    try {
      const info = await this.getVideoInfo(url);
      
      const keywords = new Set();
      
      // Adicionar palavras-chave do vídeo
      if (info.keywords && info.keywords.length > 0) {
        info.keywords.slice(0, 5).forEach(keyword => {
          if (keyword && keyword.length > 2) {
            keywords.add(keyword.toLowerCase());
          }
        });
      }

      // Extrair palavras do título
      const titleWords = info.title
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !this.isStopWord(word));
      
      titleWords.slice(0, 5).forEach(word => keywords.add(word));

      // Extrair palavras da descrição (primeiras 200 palavras)
      if (info.description) {
        const descWords = info.description
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter(word => word.length > 4 && !this.isStopWord(word));
        
        descWords.slice(0, 3).forEach(word => keywords.add(word));
      }

      // Adicionar categoria se disponível
      if (info.category && info.category !== 'Unknown') {
        keywords.add(info.category.toLowerCase());
      }

      const finalKeywords = Array.from(keywords).slice(0, maxKeywords);
      
      console.log('🔍 Palavras-chave extraídas:', finalKeywords.join(', '));
      
      return {
        keywords: finalKeywords,
        primaryKeywords: finalKeywords.slice(0, 3), // Mais importantes
        secondaryKeywords: finalKeywords.slice(3), // Menos importantes
        source: 'youtube_metadata'
      };

    } catch (error) {
      console.error('❌ Erro ao extrair palavras-chave:', error.message);
      
      // Fallback baseado na URL
      return this.getFallbackKeywords(url);
    }
  }

  /**
   * Gerar texto simulado baseado nos metadados
   */
  async generateContentText(url) {
    try {
      const info = await this.getVideoInfo(url);
      
      // Criar texto baseado nos metadados
      let contentText = '';
      
      // Usar título como base
      contentText += info.title + '. ';
      
      // Adicionar descrição (primeiras 2 frases)
      if (info.description) {
        const sentences = info.description.split(/[.!?]+/).filter(s => s.trim().length > 10);
        if (sentences.length > 0) {
          contentText += sentences.slice(0, 2).join('. ') + '. ';
        }
      }
      
      // Adicionar contexto baseado nas palavras-chave
      if (info.keywords && info.keywords.length > 0) {
        const keywordContext = `This content focuses on ${info.keywords.slice(0, 3).join(', ')}.`;
        contentText += keywordContext;
      }
      
      // Fallback se muito curto
      if (contentText.length < 50) {
        contentText = `This is a video about ${info.title} from ${info.author.name}. The content explores various aspects of the topic with engaging visuals and informative narration.`;
      }

      console.log('📝 Texto de conteúdo gerado:', contentText.substring(0, 100) + '...');
      
      return {
        text: contentText,
        source: 'youtube_metadata',
        confidence: info.description ? 0.8 : 0.6
      };

    } catch (error) {
      console.error('❌ Erro ao gerar texto de conteúdo:', error.message);
      
      // Fallback genérico
      return {
        text: `This is a video content that explores interesting topics with engaging visuals and informative presentation style.`,
        source: 'fallback',
        confidence: 0.3
      };
    }
  }

  /**
   * Informações de fallback quando a extração falha
   */
  getFallbackInfo(url, errorMessage) {
    const videoId = this.extractVideoId(url);
    
    return {
      videoId: videoId || 'unknown',
      title: `Video ${videoId || 'Content'}`,
      description: '',
      duration: 180, // 3 minutos padrão
      viewCount: 0,
      author: {
        name: 'Unknown Channel',
        channelUrl: ''
      },
      uploadDate: null,
      keywords: [],
      category: 'Unknown',
      thumbnails: [],
      isLiveContent: false,
      extractedAt: new Date().toISOString(),
      error: errorMessage,
      isFallback: true
    };
  }

  /**
   * Palavras-chave de fallback
   */
  getFallbackKeywords(url) {
    const videoId = this.extractVideoId(url);
    
    // Palavras-chave genéricas baseadas no tipo de URL
    let keywords = ['video', 'content'];
    
    if (url.includes('/shorts/')) {
      keywords.push('short', 'vertical', 'mobile');
    } else {
      keywords.push('horizontal', 'standard');
    }
    
    if (videoId) {
      keywords.push(`video_${videoId.substring(0, 3)}`);
    }

    return {
      keywords: keywords,
      primaryKeywords: keywords.slice(0, 2),
      secondaryKeywords: keywords.slice(2),
      source: 'fallback'
    };
  }

  /**
   * Extrair ID do vídeo da URL
   */
  extractVideoId(url) {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  }

  /**
   * Verificar se é uma stop word
   */
  isStopWord(word) {
    const stopWords = [
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'may', 'might', 'must', 'can', 'video', 'youtube', 'watch', 'like', 'subscribe'
    ];
    return stopWords.includes(word.toLowerCase());
  }

  /**
   * Gerar chave de cache
   */
  getCacheKey(url) {
    const videoId = this.extractVideoId(url);
    return videoId || url;
  }

  /**
   * Limpar cache
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ Cache limpo');
  }

  /**
   * Status do serviço
   */
  getStatus() {
    return {
      ready: true,
      cacheSize: this.cache.size,
      cacheTimeout: this.cacheTimeout / 1000 / 60, // em minutos
      ytdlVersion: require('ytdl-core/package.json').version
    };
  }
}

module.exports = YouTubeService;

