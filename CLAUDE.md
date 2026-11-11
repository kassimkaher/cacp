# cacp

Control and supervision platform for Claude Code agents. Read `HANDOVER.md`
first: it has the current state, decisions already made, and what to do next.

- Design (source of truth): https://claude.ai/artifact/MQQTiEumBUVxYmg82ek2ir
- Code map: `graphify-out/GRAPH_REPORT.md` (knowledge graph of this repo).
  Read it before searching files. After changing code, refresh it with
  `graphify extract . --code-only && graphify cluster-only .`

## Commands

```bash
pnpm install
pnpm typecheck        # all packages
pnpm test             # all packages (vitest)
pnpm db:generate      # new migration after editing packages/db/src/schema.ts
pnpm db:migrate       # needs DATABASE_URL / docker compose up
pnpm dev:backend
pnpm dev:daemon
```

## Rules for this repo

- TypeScript 7, ESM, `.ts` import extensions, Zod 3. Shared types live in
  `packages/protocol` only; backend and daemon import them, never redefine.
- All Claude Code specifics (hook names, payload fields, CLI flags) stay inside
  `apps/daemon`. Verify them against https://code.claude.com/docs before use;
  they change between Claude Code versions.
- Never store, log, upload or display a Claude credential or login code.
- Automation never answers a permission prompt, never raises a permission
  mode, never retries past an authentication or billing failure.
- The user is Starsphere (GitHub `kassimkaher`). Commit or push only when asked.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
