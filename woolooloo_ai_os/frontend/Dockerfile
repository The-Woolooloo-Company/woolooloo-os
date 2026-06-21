# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV WORKSPACE_ROOT=/app

COPY package.json package-lock.json* ./
RUN apk add --no-cache git openssh-client wget && npm ci --omit=dev

RUN mkdir -p /workspace && git config --global user.email "agent@woolooloo.com" && git config --global user.name "Woolooloo Agent"

# Copy Next.js standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
