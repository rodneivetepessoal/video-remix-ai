import ytdl from "ytdl-core";

// CORREÇÃO: Alterado para export default
export default class YouTubeService {
  /**
   * Extrai o texto do título de um vídeo do YouTube.
   * Em uma aplicação real, isso poderia ser expandido para usar APIs de transcrição.
   * @param url A URL do vídeo do YouTube.
   * @returns O título do vídeo.
   */
  async getTitle(url: string): Promise<string> {
    try {
      console.log("📺 Extraindo informações do YouTube:", url);
      if (!ytdl.validateURL(url)) {
        throw new Error("URL do YouTube inválida");
      }
      const info = await ytdl.getInfo(url);
      console.log(`✅ Título extraído: ${info.videoDetails.title}`);
      return info.videoDetails.title;
    } catch (error) {
      console.error(
        "❌ Erro ao extrair informações do YouTube:",
        (error as Error).message
      );
      // Retorna um título de fallback em caso de erro
      return "Default video title from fallback";
    }
  }
}
