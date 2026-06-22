# Security Checklist

## 🔴 Critical (Must Fix)
- [x] No hardcoded passwords in source code
- [x] Passwords hashed with bcrypt (10 rounds)
- [x] API keys not exposed to client
- [x] CORS restricted to specific origins
- [x] Rate limiting on sensitive endpoints
- [x] HTTP-only session cookies
- [x] Input validation with zod
- [ ] **Database passwords in env** — Use secrets manager
- [ ] **TLS/HTTPS** — Enforce in production

## 🟡 High Priority
- [x] SQL injection prevention (Prisma ORM)
- [x] XSS prevention (React escapes HTML by default)
- [x] CSRF protection (SameSite cookies)
- [x] Session management (JWT + HTTP-only)
- [ ] **Rate limiting via Redis** — For distributed deployment
- [ ] **Audit logging** — Track all auth/config changes
- [ ] **Error handling** — Don't leak stack traces

## 🟠 Medium Priority
- [x] Password complexity requirements (8+ chars)
- [x] Password reset flow
- [x] Account lockout (implement on multiple failures)
- [ ] **2FA/MFA** — For admin accounts
- [ ] **IP allowlisting** — Restrict admin access
- [ ] **Content Security Policy** — Headers for XSS protection

## 🟢 Nice to Have
- [ ] **OWASP Top 10 compliance** — Full audit
- [ ] **Dependency scanning** — `npm audit`, `safety check`
- [ ] **Security headers** — HSTS, X-Frame-Options, etc.
- [ ] **Vulnerability disclosure** — security.txt
- [ ] **Penetration testing** — Regular external audits
- [ ] **Incident response** — Runbook for security breaches

## Compliance
- [ ] **GDPR** — Data protection, user rights
- [ ] **SOC 2** — Security controls, access management
- [ ] **HIPAA** — If handling healthcare data

## Notes
- Session cookies are HTTP-only and SameSite=lax
- API keys stored server-side only via /api/config
- Password reset tokens expire after 15 minutes
- Database uses Prisma ORM (prevents SQL injection)
- React escapes all user input (prevents XSS)
