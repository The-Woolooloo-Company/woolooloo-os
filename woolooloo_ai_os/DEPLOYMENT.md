# Deployment Guide

## Prerequisites
- Docker & Docker Compose
- PostgreSQL 16+ (or use provided Docker service)
- Redis 7+ (or use provided Docker service)
- Domain name (for production)

## Development
```bash
cd woolooloo_ai_os
docker-compose up -d
npm run dev
```

## Production
```bash
# 1. Set environment variables
cp .env.example .env
# Edit .env with production values

# 2. Generate secure secrets
echo "SESSION_SECRET=$(openssl rand -hex 32)" >> .env
echo "DB_PASSWORD=$(openssl rand -hex 16)" >> .env

# 3. Bootstrap admin user
npm run bootstrap "YourSecurePassword"
# Add the hash to .env

# 4. Run database migrations
npx prisma migrate dev

# 5. Build and start
docker-compose -f docker-compose.yml up -d --build
```

## Health Checks
```bash
# Frontend
curl http://localhost:3000/api/config/status

# Backend
curl http://localhost:8000/
```

## Backup
```bash
# Database
docker exec postgres pg_dump -U woolooloo woolooloo_os > backup.sql

# Restore
docker exec -i postgres psql -U woolooloo -d woolooloo_os < backup.sql
```
