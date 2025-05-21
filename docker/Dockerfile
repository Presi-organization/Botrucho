# Build Stage
FROM node:22-slim AS build

WORKDIR /botrucho

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run clean && npm run build

# Production Stage
FROM node:22-slim AS production

RUN apt-get update && apt-get install -y ffmpeg

ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV TZ=America/Bogota

WORKDIR /usr/src/botrucho

RUN curl -sfS https://dotenvx.sh/install.sh | sh

COPY package*.json ./

RUN npm ci --omit=dev

COPY --from=build /botrucho/dist ./

EXPOSE 3000

CMD ["npx", "dotenvx", "run", "--", "node", "src/sharder.js"]
