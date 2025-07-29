# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Production stage with Node.js and Caddy
FROM node:18-alpine

# Install Caddy, bash, and OpenSSL (needed for migration script and Prisma)
RUN apk add --no-cache curl tar bash openssl openssl-dev && \
    curl -L "https://github.com/caddyserver/caddy/releases/download/v2.8.4/caddy_2.8.4_linux_amd64.tar.gz" | tar -xz -C /usr/local/bin/ caddy && \
    chmod +x /usr/local/bin/caddy

# Create app directory
WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy built assets and server files
COPY --from=builder /app/dist ./dist
COPY server.js ./
COPY Caddyfile ./
COPY src ./src
COPY scripts ./scripts

# Create startup script
RUN printf '#!/bin/sh\nnpx tsx server.js &\ncaddy run --config Caddyfile --adapter caddyfile\n' > /start.sh && chmod +x /start.sh

# Expose ports
EXPOSE 80 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health.json || exit 1

# Start both services
CMD ["/start.sh"]
