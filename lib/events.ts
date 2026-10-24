import { getDb } from "./db";
import { newId } from "./ids";

export type EventInput = {
  cleanupId: string;
  actorId: string | null;
  type: string;
  payload?: Record<string, unknown>;
};

export function recordEvent(input: EventInput): void {
  getDb()
    .prepare(
      `INSERT INTO events (id, cleanup_id, actor_id, type, payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      newId(),
      input.cleanupId,
      input.actorId,
      input.type,
      JSON.stringify(input.payload ?? {}),
      new Date().toISOString(),
    );
}
