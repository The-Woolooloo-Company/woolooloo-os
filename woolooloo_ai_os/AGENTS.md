# AGENTS.md - OpenCode Rules for Woolooloo AI OS

This document defines how OpenCode should behave when working with Woolooloo codebase.

## Code Style

### Python
- Follow PEP 8
- Use type hints on all functions
- Maximum line length: 100 characters
- Use async/await for I/O operations
- Import ordering: stdlib, third-party, local

```python
# Good
async def get_issue(issue_id: str) -> dict:
    return await linear_client.get_issue(issue_id)

# Bad
def get_issue(issue_id):
    return linear_client.get_issue(issue_id)
```

### TypeScript/JavaScript
- Use strict TypeScript where possible
- Use functional components for React
- Use named exports over default exports

## Project Structure

```
src/
├── agents/          # Agent implementations
├── api/             # FastAPI routes
├── integrations/    # Third-party integrations
├── llm/             # LLM client
├── models/          # Data models
├── workers/         # Celery tasks
└── opencode/        # OpenCode client
```

## Agent Interactions

When generating code for agents:

1. **Product Agent** - Generate feature specs, PRDs
2. **Dev Agent** - Generate code, tests, fixes
3. **Growth Agent** - Generate marketing content
4. **Sales Agent** - Generate proposals, follow-ups
5. **Ops Agent** - Generate reports, alerts
6. **Founder Agent** - Generate projects from notes

## Database (Prisma)

- Use `prisma` for all database operations
- Run `prisma generate` after schema changes
- Use migrations for schema changes: `prisma migrate dev`

## Testing

```bash
# Run tests
pytest

# Run with coverage
pytest --cov=src
```

## Linting

```bash
# Lint with ruff
ruff check src/

# Format with ruff
ruff format src/
```

## Git Conventions

- Branch: `feature/agent-name`, `fix/issue-description`
- Commits: Conventional commits (`feat:`, `fix:`, `docs:`)
- PRs: Reference Linear issue in title

## Security

- Never log API keys or secrets
- Use environment variables for all secrets
- Validate all webhook signatures
- Rate limit API endpoints