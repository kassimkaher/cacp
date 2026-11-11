# Handover

Written 2026-11-12 for a new Claude session picking this project up cold.

## What this is

A platform that supervises Claude Code from outside: a backend (TypeScript +
PostgreSQL), a daemon on each machine that runs Claude Code, a React web
dashboard and a Flutter mobile app. Claude Code does the work; the platform
monitors sessions and subagents, records why they stopped, lets the user
prompt / resume / approve remotely, sends push notifications, verifies task
completion against acceptance criteria, and (in later phases) continues
unfinished work automatically within policy limits.

Full design, 19 sections: https://claude.ai/artifact/MQQTiEumBUVxYmg82ek2ir
Read sections 2 (integration surface), 5 (event model), 8 (supervision) and
18 (roadmap) before writing code.

## Decisions already made (do not reopen without the user)

- Stack: TypeScript on Node 22, pnpm monorepo, Fastify, Drizzle, PostgreSQL 16,
  Zod; React (Vite) for web; Flutter for mobile.
- Order: design doc first (done), then code phase by phase.
- PostgreSQL is the only stateful service: queue (pg-boss), locks and pub/sub
  (LISTEN/NOTIFY) all run on it.
- The daemon is the only component that touches Claude Code. It connects
  outbound to the backend; clients never talk to a machine.
- Claude credentials never leave the machine. Remote re-login opens
  Anthropic's own page and relays only the one-time code. This follows
  Anthropic's credential rules (design section 12).
- Sessions started in a terminal are "observed": fully monitored, controlled
  only through hooks. Sessions the daemon starts are "managed": full control.
- Completion has three levels: response, task, project. A `Stop` hook only
  ever means the first.
- Repo name `cacp`, private, owner `kassimkaher`. Local path on the user's Mac:
  `~/development/cacp`.

## State of the code (Phase 0, commit cb558eb plus this handover)

| Path | What exists | Verified how |
| --- | --- | --- |
| `packages/protocol` | Zod schemas: enums, `EventEnvelope`, `CommandPayload`, `ReviewerAssessment` (+ JSON Schema), `Policy`, daemon WebSocket frames; `normalizeHook()` maps Claude Code hook payloads to events and stop reasons | 9 unit tests |
| `packages/db` | Drizzle schema, 24 tables, migration `0000_vengeful_magus.sql` | Applied to PostgreSQL 16 |
| `apps/daemon` | `hook-server.ts` (localhost, secret header, empty 200 for observation hooks, optional decision for `PermissionRequest`/`Stop`), `outbox.ts` (JSONL with per-machine seq), `install-hooks.ts` (merge into `settings.json`, backup, idempotent, clean uninstall), `cli.ts` | 11 unit tests + a smoke test with simulated hook POSTs |
| `apps/backend` | Fastify app, `GET /health` with DB check | 1 test + run against PostgreSQL |
| `apps/web`, `apps/mobile` | README placeholders | n/a |
| `apps/daemon/spikes` | `held-hook.ts` and written procedures for 3 experiments | Not run |

Not verified anywhere: the daemon against a real Claude Code session. All hook
handling so far is tested with hand-written payloads.

## Known gaps and assumptions to check

- `StopFailure` payload: the field holding the error type is unconfirmed.
  `stopFailureReason()` accepts `error_type`, `error`, `reason`, `matcher`.
  Spike 1 prints the real keys; then narrow it.
- `Notification` payload: `notification_type` is assumed as the field name.
- `SessionStart` accepts only command handlers, so the installer writes a
  `curl` command for it; every other event uses an `http` handler.
- The outbox is JSONL for Phase 0. Phase 1 replaces it with SQLite and adds
  replay from the last seq the backend acknowledged.
- `events` is not partitioned yet (design says monthly partitions).
- `sessions.parent_session_id`, `tasks.assigned_session_id`, and similar
  columns are plain UUIDs without foreign keys, to avoid circular references.
- `pnpm-workspace.yaml` lists `apps/backend` and `apps/daemon` explicitly; add
  `apps/web` there when it becomes a package.

## Open items with the user

1. **GitHub push failed** with `Repository not found` over SSH. Either the
   repo `kassimkaher/cacp` was not created yet, or the Mac's SSH key belongs
   to a different GitHub account than `kassimkaher` (the Mac user is
   `devalqaasem`). Check with `ssh -T git@github.com`. The local commit exists.
2. **Phase 0 spikes** need the user's Mac and Claude login:
   `apps/daemon/spikes/README.md`. Spike 1 decides whether observed sessions
   get remote approval or stay monitor-only. Results go in
   `docs/phase-0-results.md`.
3. Unanswered questions from design section 19: self-hosted or cloud backend
   first; single user or teams; macOS only or Linux too; store message bodies
   in the backend or metadata only.

## Next: Phase 1 (monitor)

Gate: a session started by hand in a terminal appears in the dashboard within
seconds with correct status, stop reason and subagents.

1. Backend `wss /v1/daemon`: machine-key auth, accept `events` frames,
   idempotent insert on `(machine_id, seq)`, reply `events.ack`.
2. State projection: apply each event to `sessions` and `agents` in the same
   transaction (status table in design section 5).
3. Machine enrolment: `POST /v1/machines/enroll-codes`, `cacp-daemon enroll`.
4. Daemon: SQLite outbox, WebSocket client with replay, session discovery via
   the Agent SDK's `listSessions()` / `getSessionMessages()`, transcript
   tailing, process monitor, `claude auth status` probe.
5. Backend REST: sessions, agents, messages, events; `wss /v1/stream`.
6. Web: read-only dashboard (session list, conversation, agent tree).

## Working with the user

- Goes by Starsphere. Works full-stack (PostgreSQL, backend, Android, UI).
- Arabic and English UI with right-to-left layout is a requirement for both
  clients (design section 15).
- Works from the Claude desktop app; the code lives on the Mac and is pushed
  by the user. A cloud Claude session cannot create GitHub repos or push
  unless the repo was attached when the session started.

## Code map

`graphify-out/GRAPH_REPORT.md` is a generated knowledge graph of the repo
(333 nodes, 13 communities); `graph.html` is the interactive view. Code-only
extraction, so docs are not in the graph. Refresh after code changes:

```bash
graphify extract . --code-only && graphify cluster-only .
```
