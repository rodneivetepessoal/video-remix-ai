// API endpoint para proxy de vídeos com URLs renovadas
import { NextRequest, NextResponse } from 'next/server';

const VideoProxyService = require('@/lib/video-proxy-service');

const videoProxyService = new VideoProxyService();

export async function GET(
  request: NextRequest,
  { params }: { params: { renderId: string } }
) {
  try {
    const { renderId } = params;
    
    console.log(`🎥 Solicitação de proxy para render: ${renderId}`);

    // Obter URL válida
    const result = await videoProxyService.getValidVideoUrl(renderId);
    
    if (!result.success) {
      console.error(`❌ Falha ao obter URL: ${result.error}`);
      return NextResponse.json(
        { 
          error: 'Vídeo não disponível',
          details: result.error,
          status: result.status || 'unknown'
        },
        { status: 404 }
      );
    }

    console.log(`✅ URL válida obtida: ${result.url}`);

    // Fazer proxy do vídeo
    try {
      const videoResponse = await fetch(result.url);
      
      if (!videoResponse.ok) {
        throw new Error(`HTTP ${videoResponse.status}: ${videoResponse.statusText}`);
      }

      // Obter headers relevantes
      const contentType = videoResponse.headers.get('content-type') || 'video/mp4';
      const contentLength = videoResponse.headers.get('content-length');
      const lastModified = videoResponse.headers.get('last-modified');
      const etag = videoResponse.headers.get('etag');

      // Criar headers de resposta
      const responseHeaders = new Headers({
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600', // Cache por 1 hora
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Range, Content-Length',
      });

      if (contentLength) {
        responseHeaders.set('Content-Length', contentLength);
      }
      if (lastModified) {
        responseHeaders.set('Last-Modified', lastModified);
      }
      if (etag) {
        responseHeaders.set('ETag', etag);
      }

      // Suporte a Range requests para streaming
      const range = request.headers.get('range');
      if (range) {
        responseHeaders.set('Accept-Ranges', 'bytes');
        
        // Fazer nova requisição com range
        const rangeResponse = await fetch(result.url, {
          headers: { Range: range }
        });
        
        if (rangeResponse.status === 206) {
          const contentRange = rangeResponse.headers.get('content-range');
          if (contentRange) {
            responseHeaders.set('Content-Range', contentRange);
          }
          
          return new NextResponse(rangeResponse.body, {
            status: 206,
            headers: responseHeaders
          });
        }
      }

      // Resposta normal
      return new NextResponse(videoResponse.body, {
        status: 200,
        headers: responseHeaders
      });

    } catch (proxyError) {
      console.error(`❌ Erro no proxy do vídeo:`, proxyError);
      return NextResponse.json(
        { 
          error: 'Erro ao acessar vídeo',
          details: proxyError.message
        },
        { status: 502 }
      );
    }

  } catch (error) {
    console.error(`❌ Erro no endpoint de proxy:`, error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// Suporte a HEAD requests
export async function HEAD(
  request: NextRequest,
  { params }: { params: { renderId: string } }
) {
  try {
    const { renderId } = params;
    
    const result = await videoProxyService.getValidVideoUrl(renderId);
    
    if (!result.success) {
      return new NextResponse(null, { status: 404 });
    }

    // Fazer HEAD request para o vídeo original
    const headResponse = await fetch(result.url, { method: 'HEAD' });
    
    const responseHeaders = new Headers({
      'Content-Type': headResponse.headers.get('content-type') || 'video/mp4',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    });

    const contentLength = headResponse.headers.get('content-length');
    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength);
    }

    return new NextResponse(null, {
      status: headResponse.ok ? 200 : 404,
      headers: responseHeaders
    });

  } catch (error) {
    return new NextResponse(null, { status: 500 });
  }
}

// Suporte a OPTIONS para CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Range, Content-Length',
    },
  });
}

