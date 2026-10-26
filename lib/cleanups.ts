import { getDb } from "./db";
import { recordEvent } from "./events";
import { newId, newPublicSlug } from "./ids";
import { deriveCleanupStatus } from "./status";
import type {
  CleanupCounts,
  CleanupListItem,
  CleanupWithLead,
  Pair,
  PairWithCleanup,
  PairWithCounts,
} from "./types";

const CLEANUP_SELECT = `
  SELECT c.*, u.display_name AS lead_name,
    cu.display_name AS consent_name,
    (SELECT COUNT(*) FROM pairs p WHERE p.cleanup_id = c.id) AS pair_count,
    (SELECT COUNT(*) FROM claims cl
       JOIN pairs p ON p.id = cl.pair_id
      WHERE p.cleanup_id = c.id AND cl.status = 'confirmed') AS confirmed_count,
    (SELECT COUNT(*) FROM claims cl
       JOIN pairs p ON p.id = cl.pair_id
      WHERE p.cleanup_id = c.id AND cl.status = 'pending') AS pending_count,
    (SELECT COUNT(*) FROM claims cl
       JOIN pairs p ON p.id = cl.pair_id
      WHERE p.cleanup_id = c.id AND cl.status = 'insufficient') AS insufficient_count,
    (SELECT COUNT(*) FROM claims cl
       JOIN pairs p ON p.id = cl.pair_id
      WHERE p.cleanup_id = c.id AND cl.status = 'rejected') AS rejected_count,
    (SELECT COUNT(*) FROM exports e WHERE e.cleanup_id = c.id) AS export_count
  FROM cleanups c
  JOIN users u ON u.id = c.lead_id
  JOIN users cu ON cu.id = c.consent_attested_by
`;

type CleanupRow = CleanupWithLead & CleanupCounts;

function toListItem(row: CleanupRow): CleanupListItem {
  return {
    ...row,
    status: deriveCleanupStatus({
      pending: row.pending_count,
      insufficient: row.insufficient_count,
      confirmed: row.confirmed_count,
      rejected: row.rejected_count,
      exports: row.export_count,
    }),
  };
}

export type CreateCleanupInput = {
  site: string;
  date: string;
  conditions: string | null;
  publicNote: string | null;
  leadId: string;
  consentVersion: string;
  /** Set by the manifest importer; capture leaves it null. */
  externalId?: string | null;
  /** Defaults to the lead when the consenting person is the same. */
  consentById?: string;
};

export function createCleanup(input: CreateCleanupInput): CleanupWithLead {
  const db = getDb();
  const id = newId();
  const now = new Date().toISOString();

  let publicSlug = newPublicSlug();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const taken = db
      .prepare("SELECT 1 FROM cleanups WHERE public_slug = ?")
      .get(publicSlug);
    if (!taken) break;
    publicSlug = newPublicSlug();
  }

  db.prepare(
    `INSERT INTO cleanups (
       id, external_id, public_slug, site, date, lead_id,
       conditions, public_note, consent_attested_by, consent_attested_at,
       consent_version, public_enabled, public_published_at, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?)`,
  ).run(
    id,
    input.externalId ?? null,
    publicSlug,
    input.site,
    input.date,
    input.leadId,
    input.conditions,
    input.publicNote,
    input.consentById ?? input.leadId,
    now,
    input.consentVersion,
    now,
  );

  recordEvent({
    cleanupId: id,
    actorId: input.leadId,
    type: "cleanup.created",
    payload: { site: input.site, date: input.date },
  });

  return getCleanup(id) as CleanupWithLead;
}

export function getCleanup(id: string): CleanupWithLead | null {
  const row = getDb()
    .prepare(
      `SELECT c.*, u.display_name AS lead_name,
              cu.display_name AS consent_name
         FROM cleanups c
         JOIN users u ON u.id = c.lead_id
         JOIN users cu ON cu.id = c.consent_attested_by
        WHERE c.id = ?`,
    )
    .get(id) as CleanupWithLead | undefined;
  return row ?? null;
}

export function getCleanupSummary(id: string): CleanupListItem | null {
  const row = getDb()
    .prepare(`${CLEANUP_SELECT} WHERE c.id = ?`)
    .get(id) as CleanupRow | undefined;
  return row ? toListItem(row) : null;
}

export function listCleanups(): CleanupListItem[] {
  const rows = getDb()
    .prepare(`${CLEANUP_SELECT} ORDER BY c.date DESC, c.created_at DESC`)
    .all() as CleanupRow[];
  return rows.map(toListItem);
}

export function listPairs(cleanupId: string): PairWithCounts[] {
  return getDb()
    .prepare(
      `SELECT p.*,
         (SELECT COUNT(*) FROM photos ph
            WHERE ph.pair_id = p.id AND ph.side = 'before'
              AND ph.superseded_at IS NULL) AS before_count,
         (SELECT COUNT(*) FROM photos ph
            WHERE ph.pair_id = p.id AND ph.side = 'after'
              AND ph.superseded_at IS NULL) AS after_count,
         (SELECT COUNT(*) FROM claims cl
            WHERE cl.pair_id = p.id
              AND cl.status IN ('draft','pending','confirmed','rejected','insufficient')) AS claim_count,
         (SELECT ph.id FROM photos ph
            WHERE ph.pair_id = p.id AND ph.side = 'before'
              AND ph.superseded_at IS NULL
            ORDER BY ph.created_at DESC LIMIT 1) AS before_photo_id,
         (SELECT ph.id FROM photos ph
            WHERE ph.pair_id = p.id AND ph.side = 'after'
              AND ph.superseded_at IS NULL
            ORDER BY ph.created_at DESC LIMIT 1) AS after_photo_id
       FROM pairs p
      WHERE p.cleanup_id = ?
      ORDER BY p.created_at ASC`,
    )
    .all(cleanupId) as PairWithCounts[];
}

export function getPair(
  cleanupId: string,
  pairId: string,
): PairWithCleanup | null {
  const row = getDb()
    .prepare(
      `SELECT p.*, c.site AS cleanup_site, c.date AS cleanup_date
         FROM pairs p
         JOIN cleanups c ON c.id = p.cleanup_id
        WHERE p.id = ? AND p.cleanup_id = ?`,
    )
    .get(pairId, cleanupId) as PairWithCleanup | undefined;
  return row ?? null;
}

export function getPairById(pairId: string): PairWithCleanup | null {
  const row = getDb()
    .prepare(
      `SELECT p.*, c.site AS cleanup_site, c.date AS cleanup_date
         FROM pairs p
         JOIN cleanups c ON c.id = p.cleanup_id
        WHERE p.id = ?`,
    )
    .get(pairId) as PairWithCleanup | undefined;
  return row ?? null;
}

export function createPair(input: {
  cleanupId: string;
  label: string | null;
  actorId: string;
}): Pair {
  const db = getDb();
  const cleanup = getCleanup(input.cleanupId);
  if (!cleanup) {
    throw new Error("Cleanup not found.");
  }

  const count = db
    .prepare("SELECT COUNT(*) AS count FROM pairs WHERE cleanup_id = ?")
    .get(input.cleanupId) as { count: number };

  const pair: Pair = {
    id: newId(),
    cleanup_id: input.cleanupId,
    label: input.label?.trim() || `Pair ${count.count + 1}`,
    comparability: null,
    comparability_reason: null,
    comparability_by: null,
    comparability_at: null,
    framing_score: null,
    framing_detail: null,
    created_at: new Date().toISOString(),
  };

  db.prepare(
    `INSERT INTO pairs (
       id, cleanup_id, label, comparability, comparability_reason,
       comparability_by, comparability_at, framing_score, framing_detail, created_at
     ) VALUES (?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, ?)`,
  ).run(pair.id, pair.cleanup_id, pair.label, pair.created_at);

  recordEvent({
    cleanupId: input.cleanupId,
    actorId: input.actorId,
    type: "pair.created",
    payload: { pairId: pair.id, label: pair.label },
  });

  return pair;
}
