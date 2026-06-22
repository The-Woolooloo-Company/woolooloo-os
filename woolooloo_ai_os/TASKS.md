# Tasks for Woolooloo AI OS

## 🔴 Critical (Security & Auth)
- [x] Remove hardcoded passwords from auth.ts
- [x] Add bcrypt password hashing
- [x] Add zod input validation
- [x] Move API keys out of localStorage to server-side
- [x] Add server-side session management (JWT + HTTP-only cookies)
- [x] Add rate limiting middleware
- [x] Fix CORS to restrict origins
- [ ] **Complete auth migration** — Wire up /api/auth/login to use Prisma User model
- [ ] **Add password reset flow** — Magic link or reset token endpoint

## 🟡 High Priority (Infrastructure)
- [x] Add vitest test framework + auth tests
- [x] Add Prisma User/Session/AuditLog models
- [x] Update Docker Compose for production (health checks, env vars)
- [x] Add Dockerfile multi-stage build + non-root user
- [ ] **Prisma v7 migration** — Schema uses new format, needs prisma.config.ts
- [ ] **Redis session store** — Replace in-memory SessionStore with Redis
- [ ] **API rate limiting via Redis** — Distributed rate limiter
- [ ] **Backend unit tests** — pytest for agents, integrations, webhooks

## 🟠 Medium Priority (Features)
- [ ] **Social OAuth completion** — LinkedIn/Facebook OAuth flows
- [ ] **Audit logging** — Log all auth/config changes to AuditLog model
- [ ] **Config page improvements** — Load/save via /api/config (partially done)
- [ ] **E2E tests** — Playwright for login, config, agent dispatch flows

## 🟢 Nice to Have
- [ ] **API documentation** — OpenAPI/Swagger for backend + frontend API routes
- [ ] **Deployment guide** — Docker, Vercel, Railway instructions
- [ ] **Security checklist** — OWASP Top 10 compliance doc
- [ ] **Monitoring** — Health check dashboards, error tracking (Sentry)
- [ ] **Frontend i18n** — Multi-language support
- [ ] **Mobile responsive** — Improve mobile layouts

## Notes
- Prisma v7 requires prisma.config.ts instead of datasource blocks in schema
- Session store currently in-memory; needs Redis for production multi-instance
- Social OAuth needs /api/social/[platform] callback endpoints
