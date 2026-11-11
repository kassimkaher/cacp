import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface OutboxEvent {
  seq: number;
  occurredAt: string;
  type: string;
  sessionId: string | null;
  agentId: string | null;
  agentType: string | null;
  stopReason: string | null;
  payload: Record<string, unknown>;
}

/**
 * Local, append-only event log with a per-machine sequence number.
 *
 * Phase 0 uses a JSONL file so the spike has no native dependencies. Phase 1
 * swaps this for SQLite with the same interface and adds replay from the last
 * sequence the backend acknowledged.
 */
export class Outbox {
  private seq = 0;
  private readonly file: string;

  constructor(dataDir: string) {
    mkdirSync(dataDir, { recursive: true });
    this.file = join(dataDir, "events.jsonl");
    if (existsSync(this.file)) {
      const lines = readFileSync(this.file, "utf8").trimEnd().split("\n");
      const last = lines.at(-1);
      if (last) {
        try {
          this.seq = (JSON.parse(last) as OutboxEvent).seq;
        } catch {
          this.seq = lines.length;
        }
      }
    }
  }

  append(event: Omit<OutboxEvent, "seq" | "occurredAt">): OutboxEvent {
    const row: OutboxEvent = { seq: ++this.seq, occurredAt: new Date().toISOString(), ...event };
    appendFileSync(this.file, JSON.stringify(row) + "\n");
    return row;
  }

  get lastSeq(): number {
    return this.seq;
  }
}
