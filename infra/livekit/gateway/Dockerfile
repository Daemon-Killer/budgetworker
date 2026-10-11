FROM node:24-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server.mjs ./
RUN mkdir /state && chown node:node /state
USER node
CMD ["node", "server.mjs"]
