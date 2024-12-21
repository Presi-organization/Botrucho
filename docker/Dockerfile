FROM node:22-bookworm-slim

# Install FFMPEG
RUN apt-get update && apt-get install -y ffmpeg

ENV FFMPEG_PATH=/usr/bin/ffmpeg

# Set working directory
WORKDIR /usr/src/bot

# Copy package.json and package-lock.json first
COPY ../package*.json ./

# Install dependencies
RUN npm install --verbose --frozen-lockfile

# Copy the rest of the code
COPY ../ ./

# Compile TypeScript files
RUN npm run build

# Expose ports and set the entry point
CMD ["npm", "start"]
