# Build Stage
FROM node:26-trixie-slim AS build

WORKDIR /botrucho

ENV YOUTUBE_DL_SKIP_PYTHON_CHECK=1

COPY package*.json ./
RUN npm ci --include=dev

COPY . .
RUN npm run clean && npm run build

# Production Stage
FROM node:26-trixie-slim AS production
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    python3 \
    python3-pip \
    && pip3 install --no-cache-dir --break-system-packages yt-dlp \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV TZ=America/Bogota
ENV NODE_OPTIONS="--enable-source-maps --max-old-space-size=96 --max-semi-space-size=4"
ENV YOUTUBE_DL_SKIP_PYTHON_CHECK=1

WORKDIR /usr/src/botrucho

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /botrucho/dist ./
COPY .env.production ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
    CMD curl --fail --silent http://127.0.0.1:3000/ || exit 1

CMD ["./node_modules/.bin/dotenvx", "run", "--strict", "-f", ".env.production", "--", "node", "src/sharder.js"]
