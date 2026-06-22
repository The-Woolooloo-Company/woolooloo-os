# Deployment Guide

## Prerequisites
- Node.js 20+ 
- PostgreSQL 16+
- Redis 7+
- Docker & Docker Compose (optional)

## Environment Variables

Create `.env` from `.env.example`:
```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `SESSION_SECRET` — Random 32-byte hex string for JWT signing
- `NEXT_PUBLIC_DEFAULT_ADMIN_HASH` — bcrypt hash of admin password

Generate admin hash:
```bash
npm run bootstrap "YourSecurePassword"
```

## Docker Deployment

```bash
docker compose up -d
```

Services:
- `dashboard` — Next.js frontend (port 3000)
- `api` — FastAPI backend (port 5002)
- `postgres` — PostgreSQL (port 5432)
- `redis` — Redis (port 6379)

## Manual Deployment

### Frontend
```bash
cd frontend
npm install
npm run build
npm start
```

### Backend
```bash
pip install -e ".[dev]"
uvicorn src.main:app --host 0.0.0.0 --port 8000
```

## Database Migration
```bash
npx prisma migrate dev
npx prisma generate
```

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Generate strong `SESSION_SECRET` (32+ bytes)
- [ ] Configure proper CORS origins
- [ ] Set up HTTPS/TLS
- [ ] Configure rate limiting via Redis
- [ ] Set up database backups
- [ ] Configure monitoring/logging
- [ ] Set up CI/CD pipeline

## Troubleshooting

### Prisma v7 Migration
Prisma v7 requires `prisma.config.ts` instead of datasource blocks in schema.
Generate client with: `npx prisma generate`

### Redis Connection
Ensure `REDIS_URL` includes password if configured:
`redis://:password@host:6379/0`

### CORS Issues
Update allowed origins in `src/main.py` (backend) and middleware (frontend).
