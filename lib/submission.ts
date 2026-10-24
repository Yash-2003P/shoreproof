import { getDb } from "./db";
import { recordEvent } from "./events";
import { getPairBlockers, type PairBlocker } from "./comparability";
import type { Claim } from "./types";

export class SubmissionError extends Error {
  status: number;
  blockers: PairBlocker[];

  constructor(message: string, blockers: PairBlocker[] = []) {
    super(message);
    this.name = "SubmissionError";
    this.status = 409;
    this.blockers = blockers;
  }
}

/**
 * Moves every draft claim in the pair into the review queue. The pair must
 * have both photos, a comparability decision, and at least one complete
 * claim.
 */
export function submitPair(input: {
  pairId: string;
  actorId: string;
}): { claims: Claim[] } {
  const db = getDb();

  const pair = db
    .prepare("SELECT id, cleanup_id FROM pairs WHERE id = ?")
    .get(input.pairId) as
    | { id: string; cleanup_id: string }
    | undefined;

  if (!pair) {
    throw new SubmissionError("Pair not found.", [
      { code: "pair_missing", message: "Pair not found.", level: "blocker" },
    ]);
  }

  const blockers = getPairBlockers(input.pairId).filter(
    (blocker) => blocker.level === "blocker",
  );

  if (blockers.length > 0) {
    throw new SubmissionError(blockers[0].message, blockers);
  }

  const drafts = db
    .prepare(
      `SELECT * FROM claims WHERE pair_id = ? AND status = 'draft' ORDER BY created_at ASC`,
    )
    .all(input.pairId) as Claim[];

  const alreadyPending = db
    .prepare(
      `SELECT COUNT(*) AS count FROM claims WHERE pair_id = ? AND status = 'pending'`,
    )
    .get(input.pairId) as { count: number };

  if (drafts.length === 0 && alreadyPending.count === 0) {
    throw new SubmissionError("There is nothing to submit.", [
      {
        code: "claims_missing",
        message: "Mark at least one claim.",
        level: "blocker",
      },
    ]);
  }

  const now = new Date().toISOString();

  db.transaction(() => {
    for (const claim of drafts) {
      db.prepare(
        `UPDATE claims SET status = 'pending', updated_at = ? WHERE id = ?`,
      ).run(now, claim.id);

      recordEvent({
        cleanupId: pair.cleanup_id,
        actorId: input.actorId,
        type: "claim.submitted",
        payload: {
          claimId: claim.id,
          pairId: pair.id,
          photoId: claim.photo_id,
          collectorId: claim.collector_id,
          region: {
            x: claim.x,
            y: claim.y,
            w: claim.w,
            h: claim.h,
          },
          category: claim.category,
        },
      });
    }

    recordEvent({
      cleanupId: pair.cleanup_id,
      actorId: input.actorId,
      type: "pair.submitted",
      payload: {
        pairId: pair.id,
        submittedClaims: drafts.length,
      },
    });
  })();

  const claims = db
    .prepare(
      `SELECT * FROM claims WHERE pair_id = ? AND status = 'pending' ORDER BY created_at ASC`,
    )
    .all(input.pairId) as Claim[];

  return { claims };
}
