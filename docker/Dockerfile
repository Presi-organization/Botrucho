# Build Stage
FROM node:22-slim AS build

WORKDIR /botrucho

COPY package*.json .

RUN npm install

COPY . .

RUN npm run build

# Production Stage
FROM node:22-slim AS production

RUN apt-get update && apt-get install -y ffmpeg

ENV FFMPEG_PATH=/usr/bin/ffmpeg

WORKDIR /usr/src/botrucho

COPY package*.json .

RUN npm ci --only=production

COPY --from=build /botrucho/dist ./

EXPOSE 3000

CMD ["node", "src/sharder.js"]
