# Estágio 1: Builder - Instala dependências e constrói a aplicação
FROM node:20-slim AS builder
WORKDIR /app

# Instala pnpm globalmente
RUN npm install -g pnpm

# Instala as dependências do projeto
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

# Copia o restante do código e constrói a aplicação
COPY . .
# Adicionamos --no-lint para garantir que o build não falhe por regras de estilo
RUN pnpm build --no-lint

# Estágio 2: Produção - Copia os artefatos construídos para uma imagem limpa
FROM node:20-slim AS production
WORKDIR /app

# CORREÇÃO: Instala o pnpm também no estágio de produção final
RUN npm install -g pnpm

# Cria um usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia apenas os artefatos necessários do estágio de build
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
ENV PORT 3000

# CORREÇÃO: Usa a forma "shell" do CMD para garantir que o pnpm seja encontrado no PATH.
CMD pnpm start

