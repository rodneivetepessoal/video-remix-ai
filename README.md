# Video Remix AI MVP

Este repositório contém o código para o MVP do aplicativo SaaS "Vídeo Remix AI".

## Estrutura do Projeto

- `video-remix-ai/`: Contém o código full-stack desenvolvido com Next.js (frontend e backend).

## Configuração do Ambiente

### Next.js (Frontend e Backend)

1.  **Pré-requisitos:**
    *   Node.js (versão LTS recomendada).
    *   pnpm (para gerenciamento de pacotes).

2.  **Configuração:**
    *   Navegue até o diretório `video-remix-ai/`.
    *   Instale as dependências: `pnpm install`.
    *   Configure as variáveis de ambiente para as APIs (ElevenLabs, Pexels, Shotstack) em um arquivo `.env.local`.

3.  **Execução:**
    *   Inicie o servidor de desenvolvimento: `pnpm dev`.

## APIs Utilizadas

*   **Dublagem de Vídeo Integrada:** ElevenLabs AI Dubbing API
*   **Busca e Download de Clipes de Vídeo de Stock:** Pexels API
*   **Edição e Renderização de Vídeo:** Shotstack API

## Fluxo de Trabalho

1.  O usuário insere uma URL do YouTube no frontend.
2.  O frontend envia a URL para uma rota de API no backend do Next.js.
3.  O backend orquestra o fluxo:
    *   Chama a ElevenLabs AI Dubbing API para dublar o vídeo.
    *   Usa o texto traduzido para buscar clipes de vídeo de stock na Pexels API.
    *   Envia os clipes de vídeo e o áudio dublado para a Shotstack API para renderização.
    *   Salva a URL do vídeo final e atualiza o status do projeto.
4.  O frontend exibe o status e permite assistir/baixar o vídeo final.

