# Multi-stage build for frontend
ARG NODE_VERSION=20

# --------------------
# Stage 1: Dependencies
# --------------------
FROM node:${NODE_VERSION}-alpine AS deps

WORKDIR /app

# Install dependencies based on package manager
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# --------------------
# Stage 2: Builder
# --------------------
FROM node:${NODE_VERSION}-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm ci --ignore-scripts

# Copy source files
COPY . .

# Build arguments for runtime configuration
ARG VITE_API_URL=/api
ARG NODE_ENV=production

ENV VITE_API_URL=${VITE_API_URL}
ENV NODE_ENV=${NODE_ENV}

# Build the application
RUN npm run build && \
    ls -la /app/dist

# --------------------
# Stage 3: Output
# --------------------
FROM alpine:3.19 AS output

WORKDIR /app

# Install minimal dependencies
RUN apk add --no-cache bash

# Copy built files from builder
COPY --from=builder /app/dist /app/dist

# Create output directory
RUN mkdir -p /out

# Create copy script
RUN cat > /app/copy-dist.sh <<'EOF' && chmod +x /app/copy-dist.sh

#!/bin/bash
set -euo pipefail

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Starting frontend file copy..."

if [ ! -d "/app/dist" ]; then
    echo "ERROR: /app/dist directory not found!"
    exit 1
fi

if [ -z "$(ls -A /app/dist)" ]; then
    echo "ERROR: /app/dist is empty!"
    exit 1
fi

echo "Copying files from /app/dist to /out..."
cp -rv /app/dist/* /out/

echo "Verifying files in /out..."
ls -lah /out/

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Frontend files copied successfully!"
echo "Frontend build complete. Container will now exit."
EOF

CMD ["/bin/bash", "/app/copy-dist.sh"]