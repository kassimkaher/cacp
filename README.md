# cacp

A control and supervision layer that runs beside Claude Code: it watches
sessions on your machines, records what happened and why they stopped, lets
you prompt, resume and approve from web or mobile, and (later phases) checks
whether work is really finished before continuing it.

This is an independent project. It drives the unmodified `claude` binary and
never stores Claude credentials.

Design: `docs/DESIGN.md` links to the full technical design.

## Status: Phase 0

| Part | State |
| --- | --- |
| `packages/protocol` | Event, command, policy, reviewer-assessment and daemon-frame schemas; hook-to-event mapping. Tested. |
| `packages/db` | Full PostgreSQL schema (24 tables) and first migration. Applied against PostgreSQL 16. |
| `apps/daemon` | Local hook server, event outbox (JSONL), hook installer/uninstaller. Tested with simulated hooks; not yet run against a real Claude Code session. |
| `apps/backend` | Fastify app with `/health`. |
| `apps/web`, `apps/mobile` | Not started. |
| Phase 0 spikes | Written, not yet run: `apps/daemon/spikes/README.md`. |

## Getting started

Requires Node 22+, pnpm 10, Docker (for PostgreSQL).

```bash
pnpm install
cp .env.example .env
docker compose -f deploy/docker-compose.yml up -d
pnpm db:migrate
pnpm typecheck && pnpm test
pnpm dev:backend        # http://localhost:8080/health
```

Watch your own Claude Code sessions locally:

```bash
export CACP_HOOK_SECRET="$(openssl rand -hex 16)"
pnpm --filter @cacp/daemon hooks:install -- --dry-run   # see what would change
pnpm --filter @cacp/daemon hooks:install                # backs up settings.json first
pnpm dev:daemon                                         # prints events as they arrive
```

`pnpm --filter @cacp/daemon hooks:uninstall` removes the hooks again.

## Layout

```text
apps/backend     API, WebSocket gateway, supervisor workers
apps/daemon      Per-machine daemon: hooks, monitors, session driver
apps/web         React dashboard (Phase 1)
apps/mobile      Flutter app (Phase 3)
packages/protocol  Shared schemas
packages/db        Drizzle schema and migrations
deploy/          Docker Compose
```
