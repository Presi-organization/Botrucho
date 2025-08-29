# Build Stage
FROM node:22-alpine AS build

WORKDIR /botrucho

# Instala herramientas necesarias para compilar addons nativos
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    pkgconfig \
    pixman \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    pixman-dev

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run clean && npm run build

# Production Stage
FROM node:22-alpine AS production
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    pkgconfig \
    pixman \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    pixman-dev

RUN apk add --no-cache ffmpeg curl

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
