FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache ffmpeg python3 wget

# Set working directory
WORKDIR /app

# Download yt-dlp binary manually to ensure it's available
# We place it in /app/yt-dlp so it matches the path expected by the app (process.cwd() + 'yt-dlp')
RUN wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /app/yt-dlp && \
    chmod +x /app/yt-dlp

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies using pnpm
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build Next.js app
RUN pnpm build

# Expose port
EXPOSE 3000

# Start app
CMD ["pnpm", "start"]
