import { NextRequest, NextResponse } from "next/server";
import VideoProxyService from "@/lib/video-proxy-service";

// Definição de tipo para o contexto da rota, para maior clareza e segurança.
interface RouteContext {
  params: {
    renderId: string;
  };
}

// Handler para requisições GET
export async function GET(request: NextRequest, { params }: RouteContext) {
  // CORREÇÃO: Instanciamos o serviço DENTRO da função.
  // Isso garante que ele só seja criado em tempo de execução, quando as
  // variáveis de ambiente (como as chaves de API) já estão disponíveis.
  const videoProxyService = new VideoProxyService();
  const { renderId } = params;

  try {
    console.log(`🎥 Solicitação de proxy para render: ${renderId}`);
    const result = await videoProxyService.getValidVideoUrl(renderId);

    if (!result.success || !result.url) {
      console.error(
        `❌ Falha ao obter URL válida para ${renderId}: ${result.error}`
      );
      return NextResponse.json(
        { error: "Vídeo não disponível", details: result.error },
        { status: 404 }
      );
    }

    console.log(`✅ Redirecionando para URL válida: ${result.url}`);
    // Redireciona o cliente diretamente para a URL do vídeo no S3.
    // Isso é mais eficiente do que fazer o proxy do stream de vídeo pelo nosso servidor.
    return NextResponse.redirect(result.url);
  } catch (error) {
    console.error(
      `❌ Erro crítico no endpoint de proxy:`,
      (error as Error).message
    );
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// Handler para requisições HEAD (usado por alguns players para obter metadados)
export async function HEAD(request: NextRequest, { params }: RouteContext) {
  // CORREÇÃO: Instanciamos o serviço DENTRO da função também.
  const videoProxyService = new VideoProxyService();
  const { renderId } = params;

  try {
    const result = await videoProxyService.getValidVideoUrl(renderId);

    if (!result.success || !result.url) {
      return new NextResponse(null, { status: 404 });
    }

    // Para HEAD, também redirecionamos, o navegador cuidará de seguir o redirecionamento.
    return NextResponse.redirect(result.url, { status: 302 });
  } catch (error) {
    console.error(`❌ Erro na requisição HEAD:`, (error as Error).message);
    return new NextResponse(null, { status: 500 });
  }
}
