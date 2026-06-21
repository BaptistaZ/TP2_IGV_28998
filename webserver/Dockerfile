FROM node:20-alpine

# Diretório de trabalho dentro do container.
WORKDIR /app

# Instala apenas as dependências necessárias para execução.
COPY package.json ./
RUN npm install --no-audit --no-fund --omit=dev

# Copia o código da aplicação para o container.
COPY . .

# Porta usada pelo servidor Express.
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]