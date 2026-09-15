# ---------- imagem base ----------
FROM node:20-alpine

# Diretório de trabalho dentro do container
WORKDIR /app

# Copia apenas os arquivos de dependência primeiro (melhor cache de camadas)
COPY package*.json ./

# Instala apenas dependências de produção
RUN npm ci --omit=dev

# Copia o código da aplicação
COPY api_dashboard.js ./
COPY public ./public 

# Cria usuário não-root por segurança
RUN addgroup -S app && adduser -S app -G app
USER app

# Documenta a porta usada pela API
EXPOSE 3000

# Comando padrão ao iniciar o container
CMD ["node", "api_dashboard.js"]