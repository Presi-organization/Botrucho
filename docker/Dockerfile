FROM node:22-bookworm-slim

# Set working directory
WORKDIR /usr/src/bot

# Copy package.json and package-lock.json first
COPY ../package*.json ./

# Install dependencies
RUN npm install --verbose --frozen-lockfile

# Copy the rest of the code
COPY ../ ./

# Expose ports and set the entry point
CMD ["npm", "start"]
