FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY src ./src
COPY scripts ./scripts
COPY server ./server
RUN npm run build
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
USER node
CMD ["node", "--use-env-proxy", "scripts/serve.mjs"]
