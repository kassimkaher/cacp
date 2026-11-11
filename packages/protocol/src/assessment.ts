import { z } from "zod";

/** What the independent reviewer returns (design doc, section 9). */
export const ReviewerAssessment = z.object({
  schema_version: z.literal(1),
  project_status: z.enum(["in_progress", "blocked", "complete", "unknown"]),
  stop_reason: z.enum([
    "finished_task",
    "stopped_early",
    "blocked_by_error",
    "needs_permission",
    "needs_input",
    "unclear",
  ]),
  stop_reason_detail: z.string(),
  task_complete: z.boolean(),
  criteria: z
    .array(z.object({ criterion_id: z.string(), met: z.boolean(), evidence: z.string() }))
    .default([]),
  remaining_work: z.array(z.string()).default([]),
  blockers: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  can_continue: z.boolean(),
  needs_human: z.boolean(),
  needs_human_reason: z.string().nullable().default(null),
  next_instruction: z.string().nullable().default(null),
  confidence: z.enum(["low", "medium", "high"]),
});
export type ReviewerAssessment = z.infer<typeof ReviewerAssessment>;

/**
 * Plain JSON Schema for the same shape, passed to Claude Code as the
 * structured-output schema for the reviewer session.
 */
export const reviewerAssessmentJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "schema_version",
    "project_status",
    "stop_reason",
    "stop_reason_detail",
    "task_complete",
    "can_continue",
    "needs_human",
    "confidence",
  ],
  properties: {
    schema_version: { const: 1 },
    project_status: { enum: ["in_progress", "blocked", "complete", "unknown"] },
    stop_reason: {
      enum: [
        "finished_task",
        "stopped_early",
        "blocked_by_error",
        "needs_permission",
        "needs_input",
        "unclear",
      ],
    },
    stop_reason_detail: { type: "string" },
    task_complete: { type: "boolean" },
    criteria: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["criterion_id", "met", "evidence"],
        properties: {
          criterion_id: { type: "string" },
          met: { type: "boolean" },
          evidence: { type: "string" },
        },
      },
    },
    remaining_work: { type: "array", items: { type: "string" } },
    blockers: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
    can_continue: { type: "boolean" },
    needs_human: { type: "boolean" },
    needs_human_reason: { type: ["string", "null"] },
    next_instruction: { type: ["string", "null"] },
    confidence: { enum: ["low", "medium", "high"] },
  },
} as const;
