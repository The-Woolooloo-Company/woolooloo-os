# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first (for layer caching)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV WORKSPACE_ROOT=/app

# Install dependencies (only production) + git for agent MCP tools
COPY package.json package-lock.json* ./
RUN apk add --no-cache git openssh-client && npm ci --omit=dev

# Setup workspace for agent MCP tools
RUN mkdir -p /workspace && git config --global user.email "agent@woolooloo.com" && git config --global user.name "Woolooloo Agent"

# Copy built app from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the app
CMD ["npm", "start"]
