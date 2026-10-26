import { getDb } from "./db";
import { getCurrentPhotos } from "./photos";
import {
  computeFlags,
  priorityForFlags,
  sortQueue,
  type QueueEntry,
  type QueueFlagCode,
  type ReviewClaim,
} from "./queue";
import { regionFromRow } from "./region";
import type { ClaimSummary, Pair, Photo, Suggestion } from "./types";

/** Database-backed review-queue queries. Server only. */

const MIN_LONG_EDGE = 1280;

type ClaimRow = ClaimSummary & {
  pair_label: string;
  cleanup_id: string;
  cleanup_site: string;
  cleanup_date: string;
  comparability: Pair["comparability"];
  comparability_reason: string | null;
  framing_score: number | null;
  decided_by_name: string | null;
  s_coco_class: string | null;
  s_confidence: number | null;
  s_icc_category: string | null;
  s_mapping_uncertain: number | null;
  s_edited: number | null;
  s_status: string | null;
  s_model: string | null;
  s_model_sha256: string | null;
  s_runtime_ms: number | null;
  s_box_count: number | null;
};

const CLAIM_CONTEXT_SELECT = `
  SELECT cl.*, u.display_name AS collector_name,
         du.display_name AS decided_by_name,
         p.label AS pair_label, p.comparability, p.comparability_reason,
         p.framing_score,
         c.id AS cleanup_id, c.site AS cleanup_site, c.date AS cleanup_date,
         s.coco_class AS s_coco_class,
         s.confidence AS s_confidence,
         s.icc_category AS s_icc_category,
         s.mapping_uncertain AS s_mapping_uncertain,
         s.edited AS s_edited,
         s.status AS s_status,
         r.model AS s_model,
         r.model_sha256 AS s_model_sha256,
         r.runtime_ms AS s_runtime_ms,
         r.box_count AS s_box_count
    FROM claims cl
    JOIN pairs p ON p.id = cl.pair_id
    JOIN cleanups c ON c.id = p.cleanup_id
    JOIN users u ON u.id = cl.collector_id
    LEFT JOIN users du ON du.id = cl.decided_by
    LEFT JOIN suggestions s ON s.id = cl.suggestion_id
    LEFT JOIN model_runs r ON r.id = s.run_id
`;

function toReviewClaim(row: ClaimRow): ReviewClaim {
  const {
    pair_label,
    cleanup_id,
    cleanup_site,
    cleanup_date,
    comparability,
    comparability_reason,
    framing_score,
    decided_by_name,
    ...claim
  } = row;

  return {
    ...claim,
    pair_label,
    cleanup_id,
    cleanup_site,
    cleanup_date,
    comparability,
    comparability_reason,
    framing_score,
    decided_by_name,
  };
}

function toSuggestion(row: ClaimRow): QueueEntry["suggestion"] {
  if (!row.suggestion_id || !row.s_coco_class || row.s_status === null) {
    return null;
  }

  return {
    id: row.suggestion_id,
    cocoClass: row.s_coco_class,
    confidence: row.s_confidence ?? 0,
    iccCategory: row.s_icc_category,
    mappingUncertain: row.s_mapping_uncertain === 1,
    edited: row.s_edited === 1,
    status: row.s_status as Suggestion["status"],
    model: row.s_model ?? "unknown model",
    modelSha256: row.s_model_sha256 ?? "",
    runtimeMs: row.s_runtime_ms ?? 0,
    boxCount: row.s_box_count ?? 0,
  };
}

function flagsForEntry(
  claim: ReviewClaim,
  photos: Photo[],
  reviewerId: string,
  suggestion: QueueEntry["suggestion"],
): QueueFlagCode[] {
  const before = photos.find((photo) => photo.side === "before");
  const reference = before ?? photos[0] ?? null;

  return computeFlags({
    hasRegion: regionFromRow(claim) !== null,
    comparability: claim.comparability,
    anyPeopleVisible: photos.some((photo) => photo.people_visible === 1),
    nearDuplicate: photos.some((photo) => photo.near_duplicate_of !== null),
    text: claim.text,
    photoWidth: reference?.width ?? MIN_LONG_EDGE,
    photoHeight: reference?.height ?? MIN_LONG_EDGE,
    collectorId: claim.collector_id,
    reviewerId,
    hasSuggestion: claim.suggestion_id !== null,
    suggestionEdited: suggestion?.edited ?? false,
  });
}

function entryFromRow(row: ClaimRow, reviewerId: string): QueueEntry {
  const claim = toReviewClaim(row);
  const photos = getCurrentPhotos(claim.pair_id);
  const suggestion = toSuggestion(row);
  const flags = flagsForEntry(claim, photos, reviewerId, suggestion);

  return {
    claim,
    before: photos.find((photo) => photo.side === "before") ?? null,
    after: photos.find((photo) => photo.side === "after") ?? null,
    suggestion,
    flags,
    priority: priorityForFlags(flags),
  };
}

/** Every pending claim, riskiest first. Photos are fetched once per pair. */
export function getReviewQueue(reviewerId: string): QueueEntry[] {
  const rows = getDb()
    .prepare(
      `${CLAIM_CONTEXT_SELECT}
        WHERE cl.status = 'pending'
        ORDER BY cl.created_at ASC, cl.id ASC`,
    )
    .all() as ClaimRow[];

  const photosByPair = new Map<string, Photo[]>();
  const entries = rows.map((row) => {
    let photos = photosByPair.get(row.pair_id);
    if (!photos) {
      photos = getCurrentPhotos(row.pair_id);
      photosByPair.set(row.pair_id, photos);
    }
    return entryFromRow({ ...row }, reviewerId);
  });

  return sortQueue(entries);
}

/** Claims sent back to collectors. Shown in a strip above the queue. */
export function getReturnedClaims(): ReviewClaim[] {
  const rows = getDb()
    .prepare(
      `${CLAIM_CONTEXT_SELECT}
        WHERE cl.status = 'insufficient'
        ORDER BY cl.decided_at ASC, cl.created_at ASC`,
    )
    .all() as ClaimRow[];

  return rows.map(toReviewClaim);
}

export function pendingReviewCount(): number {
  const row = getDb()
    .prepare(
      "SELECT COUNT(*) AS count FROM claims WHERE status = 'pending'",
    )
    .get() as { count: number };
  return row.count;
}

/** One claim in any state, with the same context the queue rows carry. */
export function getClaimForReview(
  claimId: string,
  reviewerId: string,
): QueueEntry | null {
  const row = getDb()
    .prepare(`${CLAIM_CONTEXT_SELECT} WHERE cl.id = ?`)
    .get(claimId) as ClaimRow | undefined;

  if (!row) return null;
  return entryFromRow(row, reviewerId);
}

/** The whole revision chain around a claim, oldest first. */
export function getClaimLineage(claimId: string): ClaimSummary[] {
  const db = getDb();
  const seen = new Set<string>();
  const pending = [claimId];

  while (pending.length > 0) {
    const current = pending.pop() as string;
    if (seen.has(current)) continue;
    seen.add(current);

    const parent = db
      .prepare("SELECT supersedes_id FROM claims WHERE id = ?")
      .get(current) as { supersedes_id: string | null } | undefined;
    if (parent?.supersedes_id) pending.push(parent.supersedes_id);

    const children = db
      .prepare("SELECT id FROM claims WHERE supersedes_id = ?")
      .all(current) as Array<{ id: string }>;
    for (const child of children) pending.push(child.id);
  }

  if (seen.size === 0) return [];

  const placeholders = Array.from(seen, () => "?").join(", ");
  const rows = db
    .prepare(
      `SELECT cl.*, u.display_name AS collector_name
         FROM claims cl
         JOIN users u ON u.id = cl.collector_id
        WHERE cl.id IN (${placeholders})
        ORDER BY cl.revision ASC, cl.created_at ASC`,
    )
    .all(...seen) as ClaimSummary[];

  return rows;
}
