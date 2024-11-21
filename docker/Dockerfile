FROM node:22-alpine

# Set working directory
WORKDIR /usr/src/bot

# Copy package.json and package-lock.json first
COPY ../package*.json ./

# Install dependencies
RUN npm install --frozen-lockfile

# Copy the rest of the code
COPY ../ ./

# Expose ports and set the entry point
CMD ["npm", "start"]
