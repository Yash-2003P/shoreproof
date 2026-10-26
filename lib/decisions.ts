import { getClaimSummary } from "./claims";
import { getPairBlockers } from "./comparability";
import { getDb } from "./db";
import { recordEvent } from "./events";
import { isIccCategory } from "./icc";
import { newId } from "./ids";
import { regionFromRow } from "./region";
import type { Claim, ClaimSummary } from "./types";

export class DecisionError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "DecisionError";
    this.status = status;
  }
}

export type DecisionKind = "confirm" | "reject" | "insufficient";

const DECIDED_VERBS: Record<string, string> = {
  confirmed: "confirmed",
  rejected: "rejected",
  insufficient: "returned for more evidence",
  superseded: "superseded by a later revision",
};

type ClaimContext = {
  claim: Claim;
  cleanupId: string;
  comparability: string | null;
  comparabilityReason: string | null;
};

function loadContext(claimId: string): ClaimContext {
  const row = getDb()
    .prepare(
      `SELECT cl.*, p.cleanup_id, p.comparability,
              p.comparability_reason
         FROM claims cl
         JOIN pairs p ON p.id = cl.pair_id
        WHERE cl.id = ?`,
    )
    .get(claimId) as
    | (Claim & {
        cleanup_id: string;
        comparability: string | null;
        comparability_reason: string | null;
      })
    | undefined;

  if (!row) {
    throw new DecisionError("Claim not found.", 404);
  }

  return {
    claim: row,
    cleanupId: row.cleanup_id,
    comparability: row.comparability,
    comparabilityReason: row.comparability_reason,
  };
}

function decidedByName(claim: Claim): string {
  if (!claim.decided_by) return "someone else";
  const row = getDb()
    .prepare("SELECT display_name FROM users WHERE id = ?")
    .get(claim.decided_by) as { display_name: string } | undefined;
  return row?.display_name ?? "someone else";
}

function assertPending(claim: Claim): void {
  if (claim.status === "pending") return;

  if (claim.status === "draft") {
    throw new DecisionError(
      "This claim is still a draft with the collector, so it cannot be decided.",
      409,
    );
  }

  const verb = DECIDED_VERBS[claim.status] ?? "decided";
  throw new DecisionError(
    `This claim was already ${verb} by ${decidedByName(claim)}.`,
    409,
  );
}

/**
 * The UI is not the only gate. Confirmation re-checks comparability, the
 * people-visible flags, and that the claim is still complete.
 */
function assertConfirmable(claim: Claim): void {
  const warnings = getPairBlockers(claim.pair_id).filter(
    (blocker) => blocker.level === "warning",
  );

  if (warnings.some((warning) => warning.code === "not_comparable")) {
    throw new DecisionError(
      "This pair is marked not comparable. Change the comparability state with a reason, or reject the claim instead.",
      409,
    );
  }

  if (warnings.some((warning) => warning.code === "people_visible")) {
    throw new DecisionError(
      "A current photo in this pair is marked people-visible. Replace the photo or clear the flag before confirming.",
      409,
    );
  }

  if (regionFromRow(claim) === null) {
    throw new DecisionError(
      "This claim has no valid region, so it cannot be confirmed.",
      409,
    );
  }

  if (claim.text.trim().length === 0) {
    throw new DecisionError(
      "This claim has no observation, so it cannot be confirmed.",
      409,
    );
  }

  if (!claim.category || !isIccCategory(claim.category)) {
    throw new DecisionError(
      "This claim has no ICC category, so it cannot be confirmed.",
      409,
    );
  }
}

function normalizedNote(note: string | null | undefined): string | null {
  const trimmed = note?.trim() || null;
  if (trimmed && trimmed.length > 500) {
    throw new DecisionError("Keep the note under 500 characters.", 400);
  }
  return trimmed;
}

/**
 * Confirm, reject, or send back a pending claim. Confirming a revision also
 * supersedes the version it replaces, in the same transaction.
 */
export function decideClaim(input: {
  claimId: string;
  actorId: string;
  decision: DecisionKind;
  note?: string | null;
}): ClaimSummary {
  const { claim, cleanupId, comparability, comparabilityReason } =
    loadContext(input.claimId);

  assertPending(claim);

  const note = normalizedNote(input.note);
  if (input.decision !== "confirm" && !note) {
    throw new DecisionError(
      input.decision === "reject"
        ? "Give a short reason for the rejection."
        : "Say what evidence is missing, so the collector can respond.",
      400,
    );
  }

  if (input.decision === "confirm") {
    assertConfirmable(claim);
  }

  const db = getDb();
  const now = new Date().toISOString();
  const selfReviewed = claim.collector_id === input.actorId;
  const status =
    input.decision === "confirm"
      ? "confirmed"
      : input.decision === "reject"
        ? "rejected"
        : "insufficient";

  const predecessor = claim.supersedes_id
    ? (db
        .prepare("SELECT id, status FROM claims WHERE id = ?")
        .get(claim.supersedes_id) as
        | { id: string; status: string }
        | undefined)
    : undefined;

  const region = regionFromRow(claim);

  db.transaction(() => {
    db.prepare(
      `UPDATE claims
          SET status = ?, decided_by = ?, decided_at = ?, decision_note = ?,
              updated_at = ?
        WHERE id = ?`,
    ).run(status, input.actorId, now, note, now, claim.id);

    recordEvent({
      cleanupId,
      actorId: input.actorId,
      type:
        input.decision === "confirm"
          ? "claim.confirmed"
          : input.decision === "reject"
            ? "claim.rejected"
            : "claim.insufficient",
      payload: {
        claimId: claim.id,
        pairId: claim.pair_id,
        photoId: claim.photo_id,
        collectorId: claim.collector_id,
        reviewerId: input.actorId,
        selfReviewed,
        revision: claim.revision,
        category: claim.category,
        region,
        note,
        comparability,
        comparabilityReason,
      },
    });

    if (
      input.decision === "confirm" &&
      predecessor &&
      predecessor.status === "confirmed"
    ) {
      db.prepare(
        "UPDATE claims SET status = 'superseded', updated_at = ? WHERE id = ?",
      ).run(now, predecessor.id);

      recordEvent({
        cleanupId,
        actorId: input.actorId,
        type: "claim.superseded",
        payload: {
          claimId: predecessor.id,
          supersededBy: claim.id,
          pairId: claim.pair_id,
          revision: claim.revision,
        },
      });
    }
  })();

  const summary = getClaimSummary(claim.id);
  if (!summary) {
    throw new DecisionError("The decision could not be read back.", 500);
  }
  return summary;
}

/**
 * Edit and confirm. The corrected claim is a new row with `revision + 1`
 * and `supersedes_id` set; the pending row it replaces becomes `superseded`
 * in the same transaction, with two events.
 */
export function editAndConfirmClaim(input: {
  claimId: string;
  actorId: string;
  text: string;
  category: string;
  note?: string | null;
}): ClaimSummary {
  const { claim, cleanupId, comparability, comparabilityReason } =
    loadContext(input.claimId);

  assertPending(claim);
  assertConfirmable(claim);

  const text = input.text.trim();
  if (text.length < 1 || text.length > 280) {
    throw new DecisionError(
      "Keep the observation between 1 and 280 characters.",
      400,
    );
  }

  if (!isIccCategory(input.category)) {
    throw new DecisionError("Choose an ICC category, including Not sure.", 400);
  }

  const region = regionFromRow(claim);
  if (!region) {
    throw new DecisionError(
      "This claim has no valid region, so it cannot be confirmed.",
      409,
    );
  }

  const editedFields: string[] = [];
  if (text !== claim.text) editedFields.push("text");
  if (input.category !== claim.category) editedFields.push("category");
  if (editedFields.length === 0) {
    throw new DecisionError(
      "Change the observation or the category, or use Confirm instead.",
      400,
    );
  }

  const note = normalizedNote(input.note);
  const db = getDb();
  const now = new Date().toISOString();
  const newClaimId = newId();

  db.transaction(() => {
    db.prepare(
      `INSERT INTO claims (
         id, pair_id, photo_id, suggestion_id, x, y, w, h, text, category,
         status, revision, supersedes_id, collector_id, decided_by, decided_at,
         decision_note, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, ?, ?, ?,
         ?, ?)`,
    ).run(
      newClaimId,
      claim.pair_id,
      claim.photo_id,
      claim.suggestion_id,
      region.x,
      region.y,
      region.w,
      region.h,
      text,
      input.category,
      claim.revision + 1,
      claim.id,
      claim.collector_id,
      input.actorId,
      now,
      note,
      now,
      now,
    );

    db.prepare(
      "UPDATE claims SET status = 'superseded', updated_at = ? WHERE id = ?",
    ).run(now, claim.id);

    recordEvent({
      cleanupId,
      actorId: input.actorId,
      type: "claim.superseded",
      payload: {
        claimId: claim.id,
        supersededBy: newClaimId,
        pairId: claim.pair_id,
        revision: claim.revision,
      },
    });

    recordEvent({
      cleanupId,
      actorId: input.actorId,
      type: "claim.confirmed",
      payload: {
        claimId: newClaimId,
        supersedesId: claim.id,
        pairId: claim.pair_id,
        photoId: claim.photo_id,
        collectorId: claim.collector_id,
        reviewerId: input.actorId,
        selfReviewed: claim.collector_id === input.actorId,
        revision: claim.revision + 1,
        category: input.category,
        region,
        note,
        editedFields,
        comparability,
        comparabilityReason,
      },
    });
  })();

  const summary = getClaimSummary(newClaimId);
  if (!summary) {
    throw new DecisionError("The revision could not be read back.", 500);
  }
  return summary;
}

/**
 * A correction to a confirmed claim. The old row stays confirmed and
 * exported until the new draft revision is itself confirmed.
 */
export function reviseClaim(input: {
  claimId: string;
  actorId: string;
}): ClaimSummary {
  const { claim, cleanupId } = loadContext(input.claimId);

  if (claim.status !== "confirmed") {
    throw new DecisionError(
      "Only a confirmed claim can be revised. Decide it first, or mark a new region.",
      409,
    );
  }

  const region = regionFromRow(claim);
  if (!region) {
    throw new DecisionError(
      "This claim has no valid region, so it cannot be revised.",
      409,
    );
  }

  const db = getDb();
  const now = new Date().toISOString();
  const revisionId = newId();

  db.transaction(() => {
    db.prepare(
      `INSERT INTO claims (
         id, pair_id, photo_id, suggestion_id, x, y, w, h, text, category,
         status, revision, supersedes_id, collector_id, decided_by, decided_at,
         decision_note, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, NULL, NULL,
         NULL, ?, ?)`,
    ).run(
      revisionId,
      claim.pair_id,
      claim.photo_id,
      claim.suggestion_id,
      region.x,
      region.y,
      region.w,
      region.h,
      claim.text,
      claim.category,
      claim.revision + 1,
      claim.id,
      claim.collector_id,
      now,
      now,
    );

    recordEvent({
      cleanupId,
      actorId: input.actorId,
      type: "claim.revision_created",
      payload: {
        claimId: revisionId,
        supersedesId: claim.id,
        pairId: claim.pair_id,
        revision: claim.revision + 1,
      },
    });
  })();

  const summary = getClaimSummary(revisionId);
  if (!summary) {
    throw new DecisionError("The revision could not be read back.", 500);
  }
  return summary;
}
