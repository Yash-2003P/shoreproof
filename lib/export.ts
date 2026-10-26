import fs from "node:fs";
import sharp from "sharp";
import { getCleanup } from "./cleanups";
import { getDb } from "./db";
import { recordEvent } from "./events";
import { newId } from "./ids";
import { photoPath } from "./storage";
import { regionFromRow, type Region } from "./region";
import type { CleanupWithLead } from "./types";

/**
 * Export and receipt assembly. A receipt is the only way a claim leaves this
 * app: it names the sanitized photo, the exact region, the collector, the
 * reviewer, the decision time, the checks, and the AI provenance.
 *
 * Everything here is server-only. Crops are cut from the sanitized bytes that
 * are already served; the original upload is never read because it is never
 * kept.
 */

export type ExportMode = "export" | "public";

export type ExportBlocker = {
  code: string;
  message: string;
  claimId?: string;
};

export class ExportError extends Error {
  status: number;

  constructor(message: string, status = 409) {
    super(message);
    this.name = "ExportError";
    this.status = status;
  }
}

export type Receipt = {
  claimId: string;
  revision: number;
  text: string;
  category: string;
  pairLabel: string;
  source: {
    photoId: string;
    side: "before" | "after";
    sha256: string;
    originalSha256: string;
    width: number;
    height: number;
  };
  region: Region;
  cropDataUri: string;
  comparability: {
    state: "comparable" | "partial";
    reason: string | null;
  };
  collector: { displayName: string };
  reviewer: { displayName: string };
  decidedAt: string;
  decision: "confirmed";
  decisionNote: string | null;
  checks: {
    blurScore: number;
    exposureClipped: number;
    resolution: [number, number];
    dhash: string;
  };
  suggestion: {
    id: string;
    model: string;
    modelSha256: string;
    className: string;
    confidence: number;
    iccCategory: string | null;
    mappingUncertain: boolean;
    edited: boolean;
  } | null;
};

export type ExcludedClaim = {
  claimId: string;
  revision: number;
  pairLabel: string;
  text: string;
  category: string | null;
  status: "rejected" | "insufficient" | "superseded";
  decidedAt: string | null;
  reviewerName: string | null;
  note: string | null;
};

export type AuditEntry = {
  id: string;
  type: string;
  actorName: string | null;
  createdAt: string;
  payload: Record<string, unknown>;
};

export type ExportBundle = {
  schema: "shoreproof.export.v1";
  mode: ExportMode;
  generatedAt: string;
  cleanup: {
    id: string;
    site: string;
    date: string;
    leadName: string;
    consentName: string;
    consentVersion: string;
    consentAttestedAt: string;
    conditions: string | null;
    publicNote: string | null;
    publicEnabled: boolean;
    publicPublishedAt: string | null;
  };
  claims: Receipt[];
  excluded: ExcludedClaim[];
  audit: AuditEntry[];
};

type ConfirmedRow = {
  claim_id: string;
  revision: number;
  text: string;
  category: string | null;
  decided_at: string | null;
  decision_note: string | null;
  collector_name: string;
  reviewer_name: string | null;
  pair_id: string;
  pair_label: string;
  comparability: "comparable" | "partial" | "not_comparable" | null;
  comparability_reason: string | null;
  photo_id: string;
  photo_side: "before" | "after";
  photo_sha256: string;
  photo_original_sha256: string;
  photo_width: number;
  photo_height: number;
  photo_dhash: string;
  photo_blur: number;
  photo_exposure: number;
  photo_people_visible: number;
  photo_superseded_at: string | null;
  s_id: string | null;
  s_class: string | null;
  s_confidence: number | null;
  s_icc: string | null;
  s_mapping_uncertain: number | null;
  s_edited: number | null;
  s_model: string | null;
  s_model_sha256: string | null;
};

const CONFIRMED_SELECT = `
  SELECT cl.id AS claim_id, cl.revision, cl.text, cl.category,
         cl.decided_at, cl.decision_note, cl.x, cl.y, cl.w, cl.h,
         u.display_name AS collector_name,
         du.display_name AS reviewer_name,
         p.id AS pair_id, p.label AS pair_label,
         p.comparability, p.comparability_reason,
         ph.id AS photo_id, ph.side AS photo_side,
         ph.sha256 AS photo_sha256,
         ph.original_sha256 AS photo_original_sha256,
         ph.width AS photo_width, ph.height AS photo_height,
         ph.dhash AS photo_dhash, ph.blur_score AS photo_blur,
         ph.exposure_clipped AS photo_exposure,
         ph.people_visible AS photo_people_visible,
         ph.superseded_at AS photo_superseded_at,
         s.id AS s_id, s.coco_class AS s_class, s.confidence AS s_confidence,
         s.icc_category AS s_icc, s.mapping_uncertain AS s_mapping_uncertain,
         s.edited AS s_edited,
         r.model AS s_model, r.model_sha256 AS s_model_sha256
    FROM claims cl
    JOIN pairs p ON p.id = cl.pair_id
    JOIN users u ON u.id = cl.collector_id
    LEFT JOIN users du ON du.id = cl.decided_by
    JOIN photos ph ON ph.id = cl.photo_id
    LEFT JOIN suggestions s ON s.id = cl.suggestion_id
    LEFT JOIN model_runs r ON r.id = s.run_id
   WHERE p.cleanup_id = ? AND cl.status = 'confirmed'
   ORDER BY p.created_at ASC, cl.created_at ASC, cl.id ASC
`;

function confirmedRows(cleanupId: string): Array<ConfirmedRow & { x: number | null; y: number | null; w: number | null; h: number | null }> {
  return getDb()
    .prepare(CONFIRMED_SELECT)
    .all(cleanupId) as Array<
    ConfirmedRow & {
      x: number | null;
      y: number | null;
      w: number | null;
      h: number | null;
    }
  >;
}

function pairHasPeopleVisible(pairId: string): boolean {
  const row = getDb()
    .prepare(
      `SELECT 1 AS hit FROM photos
        WHERE pair_id = ? AND superseded_at IS NULL AND people_visible = 1
        LIMIT 1`,
    )
    .get(pairId) as { hit: number } | undefined;
  return Boolean(row);
}

/**
 * Everything that stands between this cleanup and a correct export. The route
 * and the publish action return these instead of shipping a broken or private
 * receipt. Export is all-or-nothing on purpose: a pack that silently drops a
 * confirmed claim is worse than no pack.
 */
export function exportBlockers(cleanupId: string): ExportBlocker[] {
  const cleanup = getCleanup(cleanupId);
  if (!cleanup) {
    return [{ code: "cleanup_missing", message: "Cleanup not found." }];
  }

  const blockers: ExportBlocker[] = [];
  const rows = confirmedRows(cleanupId);
  const checkedPairs = new Set<string>();

  for (const row of rows) {
    const claimId = row.claim_id;

    if (row.photo_superseded_at) {
      blockers.push({
        code: "source_superseded",
        message:
          "A confirmed claim points at a photo that has since been replaced. Create a revision for that claim before exporting.",
        claimId,
      });
    }

    if (
      row.photo_people_visible === 1 ||
      (!checkedPairs.has(row.pair_id) && pairHasPeopleVisible(row.pair_id))
    ) {
      checkedPairs.add(row.pair_id);
      blockers.push({
        code: "people_visible",
        message:
          "A photo in a confirmed claim's pair is marked people visible. Replace it or clear the flag before exporting.",
        claimId,
      });
    }

    if (
      row.comparability !== "comparable" &&
      row.comparability !== "partial"
    ) {
      blockers.push({
        code: "not_comparable",
        message:
          row.comparability === "not_comparable"
            ? `A confirmed claim's pair is not comparable${row.comparability_reason ? ` (${row.comparability_reason})` : ""}.`
            : "A confirmed claim's pair has no comparability decision.",
        claimId,
      });
    }

    if (regionFromRow(row) === null) {
      blockers.push({
        code: "region_missing",
        message: "A confirmed claim has no valid region.",
        claimId,
      });
    }

    if (row.text.trim().length === 0) {
      blockers.push({
        code: "text_missing",
        message: "A confirmed claim has no observation text.",
        claimId,
      });
    }

    if (!row.category) {
      blockers.push({
        code: "category_missing",
        message: "A confirmed claim has no category.",
        claimId,
      });
    }

    if (!fs.existsSync(photoPath(row.photo_id))) {
      blockers.push({
        code: "source_file_missing",
        message:
          "A confirmed claim's sanitized source file is missing from storage. The export cannot be assembled.",
        claimId,
      });
    }
  }

  return dedupeBlockers(blockers);
}

function dedupeBlockers(blockers: ExportBlocker[]): ExportBlocker[] {
  const seen = new Set<string>();
  const unique: ExportBlocker[] = [];

  for (const blocker of blockers) {
    const key = `${blocker.code}:${blocker.claimId ?? ""}:${blocker.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(blocker);
  }

  return unique;
}

/** Public pages also need at least one confirmed claim to say anything. */
export function publicBlockers(cleanupId: string): ExportBlocker[] {
  const blockers = exportBlockers(cleanupId);
  const confirmed = confirmedRows(cleanupId);

  if (confirmed.length === 0) {
    blockers.push({
      code: "no_confirmed_claims",
      message:
        "This record has no confirmed claims yet, so there is nothing public to show.",
    });
  }

  return dedupeBlockers(blockers);
}

function clampCrop(photo: ConfirmedRow, region: Region) {
  const left = Math.min(
    photo.photo_width - 1,
    Math.max(0, Math.round(region.x * photo.photo_width)),
  );
  const top = Math.min(
    photo.photo_height - 1,
    Math.max(0, Math.round(region.y * photo.photo_height)),
  );
  const width = Math.max(
    1,
    Math.min(
      photo.photo_width - left,
      Math.round(region.w * photo.photo_width),
    ),
  );
  const height = Math.max(
    1,
    Math.min(
      photo.photo_height - top,
      Math.round(region.h * photo.photo_height),
    ),
  );

  return { left, top, width, height };
}

/** 640 px max-edge JPEG crop of the marked region, as a data URI. */
async function cropDataUri(row: ConfirmedRow, region: Region): Promise<string> {
  const file = photoPath(row.photo_id);
  if (!fs.existsSync(file)) {
    throw new ExportError(
      "A confirmed claim's sanitized source file is missing from storage.",
      409,
    );
  }

  const crop = clampCrop(row, region);
  const buffer = await sharp(file)
    .extract(crop)
    .resize({ width: 640, height: 640, fit: "inside" })
    .jpeg({ quality: 72 })
    .toBuffer();

  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

function toReceipt(
  row: ConfirmedRow,
  region: Region,
  crop: string,
  mode: ExportMode,
): Receipt {
  const comparability =
    row.comparability === "comparable" || row.comparability === "partial"
      ? row.comparability
      : "comparable";

  return {
    claimId: row.claim_id,
    revision: row.revision,
    text: row.text,
    category: row.category ?? "Not sure",
    pairLabel: row.pair_label,
    source: {
      photoId: row.photo_id,
      side: row.photo_side,
      sha256: row.photo_sha256,
      originalSha256: row.photo_original_sha256,
      width: row.photo_width,
      height: row.photo_height,
    },
    region,
    cropDataUri: crop,
    comparability: {
      state: comparability,
      reason: row.comparability_reason,
    },
    collector: { displayName: row.collector_name },
    reviewer: { displayName: row.reviewer_name ?? "Unrecorded reviewer" },
    decidedAt: row.decided_at ?? "",
    decision: "confirmed",
    decisionNote: mode === "export" ? row.decision_note : null,
    checks: {
      blurScore: row.photo_blur,
      exposureClipped: row.photo_exposure,
      resolution: [row.photo_width, row.photo_height],
      dhash: row.photo_dhash,
    },
    suggestion:
      row.s_id && row.s_class && row.s_model
        ? {
            id: row.s_id,
            model: row.s_model,
            modelSha256: row.s_model_sha256 ?? "",
            className: row.s_class,
            confidence: row.s_confidence ?? 0,
            iccCategory: row.s_icc,
            mappingUncertain: row.s_mapping_uncertain === 1,
            edited: row.s_edited === 1,
          }
        : null,
  };
}

type ExcludedRow = {
  claim_id: string;
  revision: number;
  pair_label: string;
  text: string;
  category: string | null;
  status: ExcludedClaim["status"];
  decided_at: string | null;
  reviewer_name: string | null;
  decision_note: string | null;
};

function excludedClaims(cleanupId: string): ExcludedClaim[] {
  const rows = getDb()
    .prepare(
      `SELECT cl.id AS claim_id, cl.revision, cl.text, cl.category,
              cl.status, cl.decided_at, cl.decision_note,
              p.label AS pair_label,
              du.display_name AS reviewer_name
         FROM claims cl
         JOIN pairs p ON p.id = cl.pair_id
         LEFT JOIN users du ON du.id = cl.decided_by
        WHERE p.cleanup_id = ?
          AND cl.status IN ('rejected', 'insufficient', 'superseded')
        ORDER BY cl.decided_at ASC, cl.created_at ASC`,
    )
    .all(cleanupId) as ExcludedRow[];

  return rows.map((row) => ({
    claimId: row.claim_id,
    revision: row.revision,
    pairLabel: row.pair_label,
    text: row.text,
    category: row.category,
    status: row.status,
    decidedAt: row.decided_at,
    reviewerName: row.reviewer_name,
    note: row.decision_note,
  }));
}

type AuditRow = {
  id: string;
  type: string;
  payload: string;
  created_at: string;
  actor_name: string | null;
};

function auditEntries(cleanupId: string): AuditEntry[] {
  const rows = getDb()
    .prepare(
      `SELECT e.id, e.type, e.payload, e.created_at, u.display_name AS actor_name
         FROM events e
         LEFT JOIN users u ON u.id = e.actor_id
        WHERE e.cleanup_id = ?
        ORDER BY e.created_at ASC, e.rowid ASC`,
    )
    .all(cleanupId) as AuditRow[];

  return rows.map((row) => {
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(row.payload) as Record<string, unknown>;
    } catch {
      payload = { raw: row.payload };
    }

    return {
      id: row.id,
      type: row.type,
      actorName: row.actor_name,
      createdAt: row.created_at,
      payload,
    };
  });
}

function toCleanupHeader(cleanup: CleanupWithLead, mode: ExportMode) {
  return {
    id: cleanup.id,
    site: cleanup.site,
    date: cleanup.date,
    leadName: cleanup.lead_name,
    consentName: cleanup.consent_name,
    consentVersion: cleanup.consent_version,
    consentAttestedAt: cleanup.consent_attested_at,
    conditions: mode === "export" ? cleanup.conditions : null,
    publicNote: cleanup.public_note,
    publicEnabled: cleanup.public_enabled === 1,
    publicPublishedAt: cleanup.public_published_at,
  };
}

/**
 * Assemble the whole pack. Public mode omits the excluded-claims appendix, the
 * internal conditions, and the audit log by construction, not by filtering a
 * shared render later.
 */
export async function buildExportBundle(
  cleanupId: string,
  mode: ExportMode,
): Promise<ExportBundle> {
  const cleanup = getCleanup(cleanupId);
  if (!cleanup) {
    throw new ExportError("Cleanup not found.", 404);
  }

  const rows = confirmedRows(cleanupId);
  const claims: Receipt[] = [];

  for (const row of rows) {
    const region = regionFromRow(row);
    if (!region) {
      throw new ExportError(
        "A confirmed claim has no valid region. The export cannot be assembled.",
        409,
      );
    }

    const crop = await cropDataUri(row, region);
    claims.push(toReceipt(row, region, crop, mode));
  }

  return {
    schema: "shoreproof.export.v1",
    mode,
    generatedAt: new Date().toISOString(),
    cleanup: toCleanupHeader(cleanup, mode),
    claims,
    excluded: mode === "export" ? excludedClaims(cleanupId) : [],
    audit: mode === "export" ? auditEntries(cleanupId) : [],
  };
}

/** Record a completed download: one exports row and one append-only event. */
export function recordExport(input: {
  cleanupId: string;
  actorId: string;
  kind: "html" | "json";
  claimCount: number;
}): string {
  const db = getDb();
  const exportId = newId();
  const now = new Date().toISOString();

  db.transaction(() => {
    db.prepare(
      `INSERT INTO exports (id, cleanup_id, actor_id, kind, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(exportId, input.cleanupId, input.actorId, input.kind, now);

    recordEvent({
      cleanupId: input.cleanupId,
      actorId: input.actorId,
      type: "export.downloaded",
      payload: {
        exportId,
        kind: input.kind,
        claimCount: input.claimCount,
      },
    });
  })();

  return exportId;
}
