import { getDb } from "./db";
import { recordEvent } from "./events";
import { isIccCategory } from "./icc";
import { newId } from "./ids";
import { isValidRegion, regionFromRow, type Region } from "./region";
import type { Claim, ClaimSummary } from "./types";

export class ClaimError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ClaimError";
    this.status = status;
  }
}

type PairRow = {
  id: string;
  cleanup_id: string;
  consent_attested_at: string | null;
};

type BeforePhoto = {
  id: string;
  pair_id: string;
  side: "before";
  superseded_at: string | null;
};

export type SaveDraftClaimInput = {
  claimId?: string | null;
  pairId: string;
  photoId: string;
  region: Region;
  text: string;
  category: string;
  actorId: string;
};

export type DeletedDraftClaim = {
  id: string;
  pairId: string;
  cleanupId: string;
  text: string;
  category: string | null;
  region: Region | null;
};

const CLAIM_SELECT = `
  SELECT cl.*, u.display_name AS collector_name
    FROM claims cl
    JOIN users u ON u.id = cl.collector_id
`;

export function getCurrentBeforePhoto(pairId: string): BeforePhoto | null {
  const row = getDb()
    .prepare(
      `SELECT ph.id, ph.pair_id, ph.side, ph.superseded_at
         FROM photos ph
         JOIN pairs p ON p.id = ph.pair_id
        WHERE p.id = ? AND ph.side = 'before' AND ph.superseded_at IS NULL
        ORDER BY ph.created_at DESC
        LIMIT 1`,
    )
    .get(pairId) as BeforePhoto | undefined;
  return row ?? null;
}

export function getClaim(claimId: string): Claim | null {
  const row = getDb()
    .prepare("SELECT * FROM claims WHERE id = ?")
    .get(claimId) as Claim | undefined;
  return row ?? null;
}

export function getClaimSummary(claimId: string): ClaimSummary | null {
  const row = getDb()
    .prepare(`${CLAIM_SELECT} WHERE cl.id = ?`)
    .get(claimId) as ClaimSummary | undefined;
  return row ?? null;
}

export function getClaimsForPair(pairId: string): ClaimSummary[] {
  return getDb()
    .prepare(
      `${CLAIM_SELECT} WHERE cl.pair_id = ?
        ORDER BY cl.created_at ASC, cl.id ASC`,
    )
    .all(pairId) as ClaimSummary[];
}

export function saveDraftClaim(input: SaveDraftClaimInput): Claim {
  const text = input.text.trim();
  if (text.length < 1) {
    throw new ClaimError("Write one sentence about what you removed.", 400);
  }
  if (text.length > 280) {
    throw new ClaimError(
      "Keep the observation at 280 characters or fewer.",
      400,
    );
  }
  if (!isIccCategory(input.category)) {
    throw new ClaimError("Choose an ICC category, including Not sure.", 400);
  }
  if (!isValidRegion(input.region)) {
    throw new ClaimError(
      "Draw a region on the before photo. The smallest region is 2% × 2%.",
      400,
    );
  }

  const db = getDb();
  const pair = db
    .prepare(
      `SELECT p.id, p.cleanup_id, c.consent_attested_at
         FROM pairs p
         JOIN cleanups c ON c.id = p.cleanup_id
        WHERE p.id = ?`,
    )
    .get(input.pairId) as PairRow | undefined;

  if (!pair) {
    throw new ClaimError("Pair not found.", 404);
  }

  if (!pair.consent_attested_at) {
    throw new ClaimError(
      "This cleanup has no consent attestation, so a claim cannot be saved.",
      409,
    );
  }

  const before = getCurrentBeforePhoto(pair.id);
  if (!before) {
    throw new ClaimError(
      "Add a before photo before marking a claim.",
      409,
    );
  }

  if (input.photoId !== before.id) {
    throw new ClaimError(
      "The before photo changed. Reload the workspace and mark the region again.",
      409,
    );
  }

  const existing = input.claimId ? getClaim(input.claimId) : null;
  if (input.claimId && !existing) {
    throw new ClaimError("Draft claim not found.", 404);
  }

  if (existing) {
    if (existing.pair_id !== pair.id) {
      throw new ClaimError("That draft belongs to a different pair.", 409);
    }
    if (existing.status !== "draft") {
      throw new ClaimError(
        "Only a draft can be edited. Confirmed claims are immutable.",
        409,
      );
    }
    if (existing.collector_id !== input.actorId) {
      throw new ClaimError(
        "Only the collector who saved this draft can edit it.",
        403,
      );
    }
    if (existing.photo_id !== before.id) {
      throw new ClaimError(
        "This draft points at a replaced photo. Remove it and mark the region again.",
        409,
      );
    }
  }

  const now = new Date().toISOString();
  const region = input.region;
  let savedId = existing?.id ?? null;

  db.transaction(() => {
    if (existing) {
      db.prepare(
        `UPDATE claims
            SET x = ?, y = ?, w = ?, h = ?, text = ?, category = ?,
                updated_at = ?
          WHERE id = ?`,
      ).run(
        region.x,
        region.y,
        region.w,
        region.h,
        text,
        input.category,
        now,
        existing.id,
      );

      recordEvent({
        cleanupId: pair.cleanup_id,
        actorId: input.actorId,
        type: "claim.updated",
        payload: {
          claimId: existing.id,
          pairId: pair.id,
          photoId: before.id,
          region,
          category: input.category,
        },
      });
      return;
    }

    const id = newId();
    savedId = id;
    db.prepare(
      `INSERT INTO claims (
         id, pair_id, photo_id, suggestion_id, x, y, w, h, text, category,
         status, revision, supersedes_id, collector_id, decided_by, decided_at,
         decision_note, created_at, updated_at
       ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, 'draft', 1, NULL, ?, NULL,
         NULL, NULL, ?, ?)`,
    ).run(
      id,
      pair.id,
      before.id,
      region.x,
      region.y,
      region.w,
      region.h,
      text,
      input.category,
      input.actorId,
      now,
      now,
    );

    recordEvent({
      cleanupId: pair.cleanup_id,
      actorId: input.actorId,
      type: "claim.created",
      payload: {
        claimId: id,
        pairId: pair.id,
        photoId: before.id,
        region,
        category: input.category,
      },
    });
  })();

  const saved = savedId ? getClaim(savedId) : null;
  if (!saved) {
    throw new ClaimError("The draft could not be read back.", 500);
  }
  return saved;
}

export function deleteDraftClaim(input: {
  claimId: string;
  actorId: string;
}): DeletedDraftClaim {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT cl.*, p.cleanup_id
         FROM claims cl
         JOIN pairs p ON p.id = cl.pair_id
        WHERE cl.id = ?`,
    )
    .get(input.claimId) as
    | (Claim & { cleanup_id: string })
    | undefined;

  if (!row) {
    throw new ClaimError("Draft claim not found.", 404);
  }

  if (row.status !== "draft") {
    throw new ClaimError(
      "Only a draft can be removed. Submitted claims are evidence and cannot be deleted.",
      409,
    );
  }

  if (row.collector_id !== input.actorId) {
    throw new ClaimError(
      "Only the collector who saved this draft can remove it.",
      403,
    );
  }

  const region = regionFromRow(row);

  db.transaction(() => {
    db.prepare("DELETE FROM claims WHERE id = ?").run(row.id);

    recordEvent({
      cleanupId: row.cleanup_id,
      actorId: input.actorId,
      type: "claim.draft_deleted",
      payload: {
        claimId: row.id,
        pairId: row.pair_id,
        photoId: row.photo_id,
        region,
        text: row.text,
        category: row.category,
      },
    });
  })();

  return {
    id: row.id,
    pairId: row.pair_id,
    cleanupId: row.cleanup_id,
    text: row.text,
    category: row.category,
    region,
  };
}
