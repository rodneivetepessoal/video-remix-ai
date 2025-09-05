# Vídeo Remix AI

Uma aplicação SaaS que processa vídeos do YouTube para gerar novas versões com áudio traduzido e footage de stock.

## 🎯 Funcionalidades

- **Dublagem Automática**: Traduz e dubla vídeos do YouTube usando ElevenLabs AI
- **Stock Footage**: Busca e integra vídeos de stock do Pexels baseado no conteúdo
- **Edição Automática**: Combina áudio dublado com footage usando Shotstack API
- **Interface Web**: Dashboard para gerenciar projetos e monitorar progresso

## 🚀 Tecnologias

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Next.js API Routes, BullMQ para filas
- **Banco de Dados**: MongoDB Atlas
- **Cache/Filas**: Redis
- **APIs Externas**: ElevenLabs, Pexels, Shotstack

## 📋 Status do Projeto

### ✅ Funcional
- Frontend Next.js completo
- Backend e APIs funcionais
- Integração Pexels (100% funcional)
- Integração Shotstack (parcialmente funcional)
- Sistema de filas com BullMQ

### ⚠️ Em Desenvolvimento
- Worker de processamento (necessita ajustes)
- Integração ElevenLabs (limitações de API key)
- Monitoramento de renderização Shotstack

## 🛠️ Configuração

### Pré-requisitos
- Node.js 20+
- Redis
- MongoDB Atlas
- API keys: ElevenLabs, Pexels, Shotstack

### Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/rodneivetepessoal/video-remix-ai.git
cd video-remix-ai
```

2. **Instale as dependências**
```bash
pnpm install
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.example .env.local
# Edite .env.local com suas API keys
```

4. **Inicie os serviços**
```bash
# Terminal 1: Redis
redis-server

# Terminal 2: Worker
node worker-simplified.js

# Terminal 3: Aplicação
pnpm dev
```

## 🔧 Variáveis de Ambiente

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
ELEVENLABS_API_KEY=sk_your_elevenlabs_key
PEXELS_API_KEY=your_pexels_key
SHOTSTACK_API_KEY=your_shotstack_key
REDIS_URL=redis://localhost:6379
```

## 📚 Documentação

- **[PROGRESS-REPORT.md](./PROGRESS-REPORT.md)**: Relatório detalhado do progresso
- **[DEVELOPMENT-GUIDE.md](./DEVELOPMENT-GUIDE.md)**: Guia para continuar o desenvolvimento

## 🧪 Testes

Execute os testes individuais das APIs:

```bash
# Testar Pexels API (funcional)
node test-pexels.js

# Testar Shotstack API (parcialmente funcional)
node test-shotstack.js

# Testar ElevenLabs API (limitado)
node test-elevenlabs.js
```

## 🚀 Deploy

A aplicação está preparada para deploy em:
- **Frontend**: Vercel, Netlify
- **Backend**: Railway, Render
- **Worker**: Background job em qualquer VPS

## 📝 Scripts Disponíveis

```bash
pnpm dev          # Desenvolvimento
pnpm build        # Build de produção
pnpm start        # Produção
pnpm worker       # Worker TypeScript
node worker-simplified.js  # Worker JavaScript (recomendado)
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

Para dúvidas ou problemas:
1. Consulte a [documentação](./DEVELOPMENT-GUIDE.md)
2. Verifique os [issues](https://github.com/rodneivetepessoal/video-remix-ai/issues)
3. Abra um novo issue se necessário

## 🔄 Fluxo de Trabalho

1. O usuário insere uma URL do YouTube no frontend
2. O frontend envia a URL para uma rota de API no backend do Next.js
3. O backend orquestra o fluxo:
   - Chama a ElevenLabs AI Dubbing API para dublar o vídeo
   - Usa o texto traduzido para buscar clipes de vídeo de stock na Pexels API
   - Envia os clipes de vídeo e o áudio dublado para a Shotstack API para renderização
   - Salva a URL do vídeo final e atualiza o status do projeto
4. O frontend exibe o status e permite assistir/baixar o vídeo final

