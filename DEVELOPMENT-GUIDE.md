# Guia de Próximos Passos - Vídeo Remix AI

## Como Continuar o Desenvolvimento

### 1. Corrigir o Worker de Processamento

#### Problema Atual
O worker não está processando os jobs corretamente devido a problemas de tipagem TypeScript e conexão com MongoDB.

#### Solução
```bash
# 1. Usar o worker simplificado em JavaScript
cd /home/ubuntu/video-remix-ai
node worker-simplified.js

# 2. Ou corrigir o worker TypeScript
# Editar worker.ts para resolver problemas de tipagem do Mongoose
```

#### Código de Correção para worker.ts
```typescript
// Substituir as chamadas problemáticas do Mongoose por:
const project = await VideoProject.findById(projectId).exec();
if (project) {
  project.status = "Completed";
  project.finalVideoUrl = finalVideoUrl;
  project.updatedAt = new Date();
  await project.save();
}
```

### 2. Resolver Limitações da ElevenLabs API

#### Opção A: Upgrade da API Key
- Fazer upgrade para plano Creator+ na ElevenLabs
- Isso habilitará dubbing sem watermark e text-to-speech

#### Opção B: API Alternativa
```javascript
// Usar Google Cloud Text-to-Speech
const textToSpeech = require('@google-cloud/text-to-speech');
const client = new textToSpeech.TextToSpeechClient();

// Ou AWS Polly
const AWS = require('aws-sdk');
const polly = new AWS.Polly();
```

#### Opção C: Implementação Simplificada
```javascript
// Pular dubbing por enquanto e focar em:
// 1. Extração de metadados do YouTube
// 2. Geração de vídeo apenas com stock footage
// 3. Adicionar áudio posteriormente
```

### 3. Corrigir Integração Shotstack

#### Problema
URL de verificação de status retornando 404.

#### Solução
```javascript
// Verificar documentação da API Shotstack para URL correta
// Pode ser necessário usar versão diferente da API
const statusResponse = await fetch(`https://api.shotstack.io/stage/render/${renderId}`, {
  headers: { "x-api-key": SHOTSTACK_API_KEY },
});
```

### 4. Melhorar Monitoramento

#### Adicionar Logs Detalhados
```javascript
// No worker
console.log('Job iniciado:', job.id, job.data);
console.log('Conectando ao MongoDB...');
console.log('Buscando vídeos no Pexels...');
console.log('Iniciando renderização Shotstack...');
```

#### Implementar Health Check
```javascript
// Endpoint para verificar status dos serviços
app.get('/api/health', async (req, res) => {
  const health = {
    mongodb: 'checking...',
    redis: 'checking...',
    pexels: 'checking...',
    shotstack: 'checking...'
  };
  
  // Verificar cada serviço
  res.json(health);
});
```

### 5. Comandos Úteis para Desenvolvimento

#### Iniciar Aplicação Completa
```bash
# Terminal 1: Iniciar Redis
redis-server

# Terminal 2: Iniciar Worker
cd /home/ubuntu/video-remix-ai
node worker-simplified.js

# Terminal 3: Iniciar Next.js
cd /home/ubuntu/video-remix-ai
pnpm dev
```

#### Debug e Monitoramento
```bash
# Verificar logs do worker
tail -f worker.log

# Verificar processos
ps aux | grep node

# Verificar Redis
redis-cli ping
redis-cli monitor

# Verificar MongoDB
# Usar MongoDB Compass ou mongo shell
```

### 6. Testes Recomendados

#### Teste Individual das APIs
```bash
# Testar Pexels (funcionando)
node test-pexels.js

# Testar Shotstack (parcialmente funcionando)
node test-shotstack.js

# Testar ElevenLabs (limitado)
node test-elevenlabs.js
```

#### Teste End-to-End
1. Abrir http://localhost:3001
2. Inserir URL do YouTube
3. Clicar "Gerar Vídeo"
4. Monitorar logs do worker
5. Verificar status na interface

### 7. Estrutura de Arquivos Importante

```
video-remix-ai/
├── app/
│   ├── api/
│   │   ├── projects/route.ts    # API de projetos
│   │   └── remix/route.ts       # API de processamento
│   └── page.tsx                 # Interface principal
├── lib/
│   ├── models/VideoProject.ts   # Modelo MongoDB
│   ├── mongodb.ts              # Conexão MongoDB
│   └── queue.ts                # Configuração BullMQ
├── worker.ts                   # Worker TypeScript (com problemas)
├── worker-simplified.js        # Worker JavaScript (funcional)
├── test-*.js                   # Scripts de teste das APIs
└── .env.local                  # Configurações (API keys)
```

### 8. Próximas Funcionalidades

#### Prioridade Alta
- [ ] Corrigir processamento de jobs
- [ ] Implementar verificação de status Shotstack
- [ ] Adicionar logs detalhados

#### Prioridade Média
- [ ] Implementar alternativa para ElevenLabs
- [ ] Adicionar preview de vídeos
- [ ] Melhorar interface de usuário

#### Prioridade Baixa
- [ ] Adicionar autenticação de usuários
- [ ] Implementar sistema de pagamento
- [ ] Adicionar mais fontes de stock footage

### 9. Recursos Úteis

- **Documentação Pexels**: https://www.pexels.com/api/documentation/
- **Documentação Shotstack**: https://shotstack.io/docs/api/
- **Documentação ElevenLabs**: https://elevenlabs.io/docs/
- **BullMQ Docs**: https://docs.bullmq.io/
- **Next.js Docs**: https://nextjs.org/docs

### 10. Contato e Suporte

Para questões específicas sobre as APIs ou problemas técnicos:
- Verificar documentação oficial de cada serviço
- Testar APIs individualmente antes de integrar
- Usar logs detalhados para debug
- Considerar implementação em fases (MVP primeiro)

