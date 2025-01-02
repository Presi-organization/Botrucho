# Build Stage
FROM node:22-alpine AS build

WORKDIR /botrucho

COPY package*.json .

RUN npm install

COPY . .

RUN npm run build

# Production Stage
FROM node:22-alpine AS production

RUN apk add --no-cache ffmpeg

ENV FFMPEG_PATH=/usr/bin/ffmpeg

WORKDIR /usr/src/botrucho

COPY package*.json .

RUN npm ci --only=production

COPY --from=build /botrucho/dist ./

CMD ["node", "src/sharder.js"]
