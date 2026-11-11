# Graph Report - cacp  (2026-11-12)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 333 nodes · 455 edges · 13 communities (12 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Daemon Hook Server Config
- DB Package Dependencies
- Protocol Commands and Assessments
- Database Schema Tables
- Backend Package Dependencies
- Package TypeScript Configs
- Daemon Package Setup
- Postgres Docker Compose
- Root Workspace Scripts
- Base TypeScript Compiler Options
- CI Workflow
- Backend App Bootstrap
- pnpm Workspace Config

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 15 edges
2. `Outbox` - 10 edges
3. `createHookServer()` - 9 edges
4. `@types/node` - 8 edges
5. `typescript` - 8 edges
6. `scripts` - 8 edges
7. `scripts` - 7 edges
8. `main()` - 6 edges
9. `mergeHooks()` - 6 edges
10. `postgres` - 6 edges

## Surprising Connections (you probably didn't know these)
- `createHookServer()` --calls--> `normalizeHook()`  [EXTRACTED]
  apps/daemon/src/hook-server.ts → packages/protocol/src/hooks.ts
- `@types/node@^22.20.5` --declares--> `@types/node`  [EXTRACTED]
  packages/db/package.json → apps/daemon/package.json
- `typescript@^7.0.2` --declares--> `typescript`  [EXTRACTED]
  packages/db/package.json → apps/daemon/package.json
- `@types/node@^22.20.5` --declares--> `@types/node`  [EXTRACTED]
  packages/protocol/package.json → apps/daemon/package.json
- `typescript@^7.0.2` --declares--> `typescript`  [EXTRACTED]
  packages/protocol/package.json → apps/daemon/package.json

## Import Cycles
- None detected.

## Communities (13 total, 1 thin omitted)

### Community 0 - "Daemon Hook Server Config"
Cohesion: 0.09
Nodes (30): config, main(), DaemonConfig, Env, loadConfig(), createHookServer(), DECIDABLE, DecisionHandler (+22 more)

### Community 1 - "DB Package Dependencies"
Cohesion: 0.05
Nodes (43): @types/node, typescript, dependencies, drizzle-orm@^0.45.4, pg@^8.23.1, devDependencies, drizzle-kit@^0.31.11, @types/node@^22.20.5 (+35 more)

### Community 2 - "Protocol Commands and Assessments"
Cohesion: 0.07
Nodes (33): Config, Env, ReviewerAssessment, reviewerAssessmentJsonSchema, Command, CommandPayload, CommandResult, sessionRef (+25 more)

### Community 3 - "Database Schema Tables"
Cohesion: 0.06
Nodes (31): acceptanceCriteria, agents, approvals, approvalStatus, authProfiles, automationDecisions, commands, commandStatus (+23 more)

### Community 4 - "Backend Package Dependencies"
Cohesion: 0.09
Nodes (27): dependencies, @cacp/db@workspace:*, @cacp/protocol@workspace:*, drizzle-orm@^0.45.4, fastify@^5.12.8, zod@^3.25.76, devDependencies, tsx@^4.23.15 (+19 more)

### Community 5 - "Package TypeScript Configs"
Cohesion: 0.08
Nodes (21): compilerOptions, allowImportingTsExtensions, noEmit, extends, include, compilerOptions, allowImportingTsExtensions, noEmit (+13 more)

### Community 6 - "Daemon Package Setup"
Cohesion: 0.09
Nodes (24): bin, cacp-daemon, dependencies, @cacp/protocol@workspace:*, zod@^3.25.76, devDependencies, tsx@^4.23.15, @types/node@^22.20.5 (+16 more)

### Community 7 - "Postgres Docker Compose"
Cohesion: 0.12
Nodes (16): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, interval, retries, test, timeout, environment (+8 more)

### Community 8 - "Root Workspace Scripts"
Cohesion: 0.12
Nodes (15): description, engines, node, name, packageManager, private, scripts, build (+7 more)

### Community 9 - "Base TypeScript Compiler Options"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, lib, module, moduleResolution, noUncheckedIndexedAccess (+7 more)

### Community 10 - "CI Workflow"
Cohesion: 0.13
Nodes (14): runs-on, steps, jobs, check, name, on, pull_request, push (+6 more)

### Community 11 - "Backend App Bootstrap"
Cohesion: 0.22
Nodes (8): AppDeps, buildApp(), loadConfig(), app, config, createDb(), Db, schema

## Knowledge Gaps
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `fastify` connect `Backend Package Dependencies` to `Backend App Bootstrap`?**
  _High betweenness centrality (0.254) - this node is a cross-community bridge._
- **Should `Daemon Hook Server Config` be split into smaller, more focused modules?**
  _Cohesion score 0.08687943262411348 - nodes in this community are weakly interconnected._
- **Why does `@types/node` connect `DB Package Dependencies` to `Backend Package Dependencies`, `Daemon Package Setup`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Should `DB Package Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05314009661835749 - nodes in this community are weakly interconnected._
- **Why does `typescript` connect `DB Package Dependencies` to `Backend Package Dependencies`, `Daemon Package Setup`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Should `Protocol Commands and Assessments` be split into smaller, more focused modules?**
  _Cohesion score 0.07373737373737374 - nodes in this community are weakly interconnected._
- **Should `Database Schema Tables` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._