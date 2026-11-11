/**
 * Database schema (design doc, section 6).
 *
 * No table references a Claude account: `auth_profiles` holds metadata only,
 * and nothing else points at it except `runtimes`. That is what lets history,
 * notifications and monitoring survive a profile change or an expired login.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const ts = (name: string) => timestamp(name, { withTimezone: true });

export const sessionStatus = pgEnum("session_status", [
  "active",
  "waiting_permission",
  "waiting_input",
  "idle",
  "stopped",
  "failed",
  "interrupted",
  "completed",
]);
export const sessionOwnership = pgEnum("session_ownership", ["observed", "managed", "reviewer"]);
export const commandStatus = pgEnum("command_status", [
  "queued",
  "sent",
  "acked",
  "running",
  "succeeded",
  "failed",
  "expired",
  "cancelled",
]);
export const taskStatus = pgEnum("task_status", [
  "pending",
  "in_progress",
  "claimed_done",
  "verified",
  "failed",
  "blocked",
]);
export const criterionKind = pgEnum("criterion_kind", ["command", "file", "reviewer", "manual"]);
export const supervisionMode = pgEnum("supervision_mode", ["manual", "supervised", "automatic"]);
export const approvalStatus = pgEnum("approval_status", [
  "pending",
  "allowed",
  "denied",
  "timed_out",
  "cancelled",
]);

// ── Accounts and devices ────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  totpSecret: text("totp_secret"),
  createdAt: createdAt(),
});

export const devices = pgTable(
  "devices",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(), // android | ios | web
    pushToken: text("push_token"),
    name: text("name"),
    lastSeenAt: ts("last_seen_at"),
    createdAt: createdAt(),
  },
  (t) => [index("devices_user_idx").on(t.userId)],
);

// ── Machines, profiles, runtimes ────────────────────────────────────────────

export const machines = pgTable(
  "machines",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    os: text("os"),
    hostname: text("hostname"),
    keyHash: text("key_hash").notNull(),
    publicKey: text("public_key"),
    online: boolean("online").notNull().default(false),
    lastHeartbeatAt: ts("last_heartbeat_at"),
    lastAckedSeq: bigint("last_acked_seq", { mode: "number" }).notNull().default(0),
    revokedAt: ts("revoked_at"),
    createdAt: createdAt(),
  },
  (t) => [index("machines_user_idx").on(t.userId)],
);

/** Metadata about a Claude Code login on a machine. Never a token. */
export const authProfiles = pgTable("auth_profiles", {
  id: id(),
  machineId: uuid("machine_id").notNull().references(() => machines.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  configDir: text("config_dir").notNull(),
  authMethod: text("auth_method").notNull().default("none"),
  accountEmail: text("account_email"),
  organization: text("organization"),
  loggedIn: boolean("logged_in").notNull().default(false),
  expiresAt: ts("expires_at"),
  lastCheckedAt: ts("last_checked_at"),
  createdAt: createdAt(),
});

export const runtimes = pgTable("runtimes", {
  id: id(),
  machineId: uuid("machine_id").notNull().references(() => machines.id, { onDelete: "cascade" }),
  authProfileId: uuid("auth_profile_id").references(() => authProfiles.id, { onDelete: "set null" }),
  claudeCodeVersion: text("claude_code_version"),
  health: jsonb("health").notNull().default(sql`'{}'::jsonb`),
  createdAt: createdAt(),
});

// ── Projects, plans, tasks ──────────────────────────────────────────────────

export const projects = pgTable("projects", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  machineId: uuid("machine_id").references(() => machines.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  repoPath: text("repo_path"),
  status: text("status").notNull().default("active"), // active | completed | archived
  completionChecks: jsonb("completion_checks").notNull().default(sql`'[]'::jsonb`),
  createdAt: createdAt(),
});

export const plans = pgTable("plans", {
  id: id(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  version: integer("version").notNull().default(1),
  source: text("source").notNull().default("dashboard"), // dashboard | file | planning_session
  active: boolean("active").notNull().default(false),
  createdAt: createdAt(),
});

export const phases = pgTable("phases", {
  id: id(),
  planId: uuid("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  name: text("name").notNull(),
  createdAt: createdAt(),
});

export const tasks = pgTable(
  "tasks",
  {
    id: id(),
    phaseId: uuid("phase_id").notNull().references(() => phases.id, { onDelete: "cascade" }),
    ordinal: integer("ordinal").notNull().default(0),
    title: text("title").notNull(),
    description: text("description"),
    status: taskStatus("status").notNull().default("pending"),
    assignedSessionId: uuid("assigned_session_id"),
    verifiedAt: ts("verified_at"),
    createdAt: createdAt(),
  },
  (t) => [index("tasks_phase_idx").on(t.phaseId)],
);

export const taskDependencies = pgTable(
  "task_dependencies",
  {
    taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
    dependsOnTaskId: uuid("depends_on_task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.dependsOnTaskId] })],
);

export const acceptanceCriteria = pgTable("acceptance_criteria", {
  id: id(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  kind: criterionKind("kind").notNull(),
  checkSpec: jsonb("check_spec").notNull().default(sql`'{}'::jsonb`),
  status: text("status").notNull().default("unchecked"), // unchecked | passed | failed
  evidence: text("evidence"),
  createdAt: createdAt(),
});

export const verifications = pgTable("verifications", {
  id: id(),
  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  criterionId: uuid("criterion_id").references(() => acceptanceCriteria.id, { onDelete: "cascade" }),
  method: text("method").notNull(),
  passed: boolean("passed").notNull(),
  evidence: text("evidence"),
  runAt: ts("run_at").notNull().defaultNow(),
});

// ── Sessions, agents, messages ──────────────────────────────────────────────

export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** Claude Code's session id. Unique per machine, not globally. */
    claudeSessionId: text("claude_session_id").notNull(),
    machineId: uuid("machine_id").notNull().references(() => machines.id, { onDelete: "cascade" }),
    runtimeId: uuid("runtime_id").references(() => runtimes.id, { onDelete: "set null" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    parentSessionId: uuid("parent_session_id"),
    cwd: text("cwd"),
    title: text("title"),
    gitBranch: text("git_branch"),
    transcriptPath: text("transcript_path"),
    ownership: sessionOwnership("ownership").notNull().default("observed"),
    status: sessionStatus("status").notNull().default("idle"),
    stopReason: text("stop_reason"),
    currentTaskId: uuid("current_task_id"),
    /** Set when the user pauses; automation is suspended until cleared. */
    pausedByUser: boolean("paused_by_user").notNull().default(false),
    lastEventAt: ts("last_event_at"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("sessions_machine_claude_idx").on(t.machineId, t.claudeSessionId),
    index("sessions_dashboard_idx").on(t.userId, t.status, t.lastEventAt.desc()),
  ],
);

export const agents = pgTable(
  "agents",
  {
    id: id(),
    sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
    /** Null for the main agent. */
    claudeAgentId: text("claude_agent_id"),
    agentType: text("agent_type"),
    parentAgentId: uuid("parent_agent_id"),
    status: text("status").notNull().default("running"), // running | stopped | failed
    lastMessage: text("last_message"),
    startedAt: ts("started_at").notNull().defaultNow(),
    stoppedAt: ts("stopped_at"),
  },
  (t) => [uniqueIndex("agents_session_claude_idx").on(t.sessionId, t.claudeAgentId)],
);

export const messages = pgTable(
  "messages",
  {
    id: id(),
    sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id").references(() => agents.id, { onDelete: "set null" }),
    uuid: text("uuid").notNull(),
    role: text("role").notNull(),
    content: jsonb("content").notNull(),
    parentToolUseId: text("parent_tool_use_id"),
    occurredAt: ts("occurred_at").notNull(),
  },
  (t) => [
    uniqueIndex("messages_session_uuid_idx").on(t.sessionId, t.uuid),
    index("messages_session_time_idx").on(t.sessionId, t.occurredAt.desc()),
  ],
);

// ── Events ──────────────────────────────────────────────────────────────────

/** Append-only. Monthly partitioning is added when volume calls for it. */
export const events = pgTable(
  "events",
  {
    id: id(),
    machineId: uuid("machine_id").notNull().references(() => machines.id, { onDelete: "cascade" }),
    runtimeId: uuid("runtime_id"),
    sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id"),
    projectId: uuid("project_id"),
    seq: bigint("seq", { mode: "number" }).notNull(),
    type: text("type").notNull(),
    stopReason: text("stop_reason"),
    payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`),
    occurredAt: ts("occurred_at").notNull(),
    receivedAt: ts("received_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("events_machine_seq_idx").on(t.machineId, t.seq),
    index("events_session_time_idx").on(t.sessionId, t.occurredAt.desc()),
  ],
);

// ── Commands, approvals, locks ──────────────────────────────────────────────

export const commands = pgTable(
  "commands",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    machineId: uuid("machine_id").notNull().references(() => machines.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull(),
    status: commandStatus("status").notNull().default("queued"),
    idempotencyKey: text("idempotency_key").notNull(),
    /** user:<id> | apikey:<id> | supervisor:<decision id> */
    issuedBy: text("issued_by").notNull(),
    result: jsonb("result"),
    error: text("error"),
    expiresAt: ts("expires_at").notNull(),
    sentAt: ts("sent_at"),
    finishedAt: ts("finished_at"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("commands_idem_idx").on(t.userId, t.idempotencyKey),
    index("commands_machine_status_idx").on(t.machineId, t.status),
  ],
);

export const approvals = pgTable(
  "approvals",
  {
    id: id(),
    sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id"),
    toolName: text("tool_name").notNull(),
    toolInput: jsonb("tool_input").notNull(),
    status: approvalStatus("status").notNull().default("pending"),
    /** Always a user id: automation never answers a permission prompt. */
    decidedByUserId: uuid("decided_by_user_id").references(() => users.id),
    decisionMessage: text("decision_message"),
    decidedAt: ts("decided_at"),
    expiresAt: ts("expires_at"),
    createdAt: createdAt(),
  },
  (t) => [index("approvals_session_status_idx").on(t.sessionId, t.status)],
);

/** At most one row per session: one operation at a time. */
export const sessionLocks = pgTable("session_locks", {
  sessionId: uuid("session_id")
    .primaryKey()
    .references(() => sessions.id, { onDelete: "cascade" }),
  holder: text("holder").notNull(),
  commandId: uuid("command_id"),
  acquiredAt: ts("acquired_at").notNull().defaultNow(),
  expiresAt: ts("expires_at").notNull(),
});

// ── Supervision ─────────────────────────────────────────────────────────────

export const policies = pgTable(
  "policies",
  {
    id: id(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(1),
    mode: supervisionMode("mode").notNull().default("manual"),
    document: jsonb("document").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("policies_scope_idx").on(t.projectId, t.sessionId)],
);

export const reviewerAssessments = pgTable("reviewer_assessments", {
  id: id(),
  sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  reviewerSessionId: uuid("reviewer_session_id"),
  triggerEventId: uuid("trigger_event_id"),
  schemaVersion: integer("schema_version").notNull(),
  assessment: jsonb("assessment").notNull(),
  createdAt: createdAt(),
});

/** The audit record for every automatic decision. */
export const automationDecisions = pgTable(
  "automation_decisions",
  {
    id: id(),
    sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
    triggerEventId: uuid("trigger_event_id"),
    stopReason: text("stop_reason"),
    inputs: jsonb("inputs").notNull(),
    policyId: uuid("policy_id"),
    policyVersion: integer("policy_version"),
    assessmentId: uuid("assessment_id"),
    decision: text("decision").notNull(), // continue | wait_user | escalate | complete | recover
    reason: text("reason").notNull(),
    commandId: uuid("command_id"),
    createdAt: createdAt(),
  },
  (t) => [index("decisions_session_time_idx").on(t.sessionId, t.createdAt.desc())],
);

export const recoveryAttempts = pgTable("recovery_attempts", {
  id: id(),
  sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  cause: text("cause").notNull(),
  strategy: text("strategy").notNull(),
  attempt: integer("attempt").notNull(),
  outcome: text("outcome"),
  createdAt: createdAt(),
});

// ── Notifications ───────────────────────────────────────────────────────────

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "set null" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    deepLink: text("deep_link"),
    sentAt: ts("sent_at"),
    deliveredAt: ts("delivered_at"),
    openedAt: ts("opened_at"),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_time_idx").on(t.userId, t.createdAt.desc())],
);
