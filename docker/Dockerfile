# Build Stage
FROM node:22-bookworm-slim AS build

WORKDIR /botrucho

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run clean && npm run build

# Production Stage
FROM node:22-bookworm-slim AS production
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg curl

ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV TZ=America/Bogota
ENV NODE_OPTIONS="--enable-source-maps"

WORKDIR /usr/src/botrucho

# Instala dotenvx
RUN curl -sfS https://dotenvx.sh/install.sh | sh

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /botrucho/dist ./

EXPOSE 3000

CMD ["npx", "dotenvx", "run", "-f", ".env.production", "--", "node", "src/sharder.js"]
