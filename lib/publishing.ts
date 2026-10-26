import { getCleanup } from "./cleanups";
import { getDb } from "./db";
import { recordEvent } from "./events";
import { newPublicSlug } from "./ids";
import { publicBlockers, type ExportBlocker } from "./export";
import type { CleanupWithLead } from "./types";

/**
 * Public-page lifecycle. Publishing is the only way a record becomes readable
 * without the workspace cookie, and it is gated by the same blockers as the
 * export. The slug is rotated on publish and on unpublish, so a link that was
 * shared once cannot be used to find the record again after it is taken down.
 */

export class PublishingError extends Error {
  status: number;
  blockers: ExportBlocker[];

  constructor(message: string, status = 400, blockers: ExportBlocker[] = []) {
    super(message);
    this.name = "PublishingError";
    this.status = status;
    this.blockers = blockers;
  }
}

function freshSlug(): string {
  const db = getDb();
  const taken = db.prepare("SELECT 1 AS hit FROM cleanups WHERE public_slug = ?");

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const slug = newPublicSlug();
    if (!taken.get(slug)) return slug;
  }

  throw new PublishingError(
    "Could not allocate a public link. Try again in a moment.",
    500,
  );
}

export function publishCleanup(input: {
  cleanupId: string;
  actorId: string;
}): CleanupWithLead {
  const cleanup = getCleanup(input.cleanupId);
  if (!cleanup) {
    throw new PublishingError("Cleanup not found.", 404);
  }

  const blockers = publicBlockers(cleanup.id);
  if (blockers.length > 0) {
    throw new PublishingError(
      "This record cannot be published while it has blockers.",
      409,
      blockers,
    );
  }

  const db = getDb();
  const slug = freshSlug();
  const now = new Date().toISOString();
  const confirmed = db
    .prepare(
      `SELECT COUNT(*) AS count
         FROM claims cl
         JOIN pairs p ON p.id = cl.pair_id
        WHERE p.cleanup_id = ? AND cl.status = 'confirmed'`,
    )
    .get(cleanup.id) as { count: number };

  db.transaction(() => {
    db.prepare(
      `UPDATE cleanups
          SET public_slug = ?, public_enabled = 1, public_published_at = ?
        WHERE id = ?`,
    ).run(slug, now, cleanup.id);

    recordEvent({
      cleanupId: cleanup.id,
      actorId: input.actorId,
      type: "public.published",
      payload: { slug, claimCount: confirmed.count },
    });
  })();

  return getCleanup(cleanup.id) as CleanupWithLead;
}

export function unpublishCleanup(input: {
  cleanupId: string;
  actorId: string;
}): CleanupWithLead {
  const cleanup = getCleanup(input.cleanupId);
  if (!cleanup) {
    throw new PublishingError("Cleanup not found.", 404);
  }

  const db = getDb();
  const slug = freshSlug();

  db.transaction(() => {
    db.prepare(
      `UPDATE cleanups
          SET public_slug = ?, public_enabled = 0
        WHERE id = ?`,
    ).run(slug, cleanup.id);

    recordEvent({
      cleanupId: cleanup.id,
      actorId: input.actorId,
      type: "public.unpublished",
      payload: { previousSlug: cleanup.public_slug },
    });
  })();

  return getCleanup(cleanup.id) as CleanupWithLead;
}

/**
 * Resolve a public URL. Disabled records and unknown slugs are the same answer:
 * not found. There is deliberately no way to enumerate published records.
 */
export function getPublishedCleanupBySlug(slug: string): CleanupWithLead | null {
  const row = getDb()
    .prepare(
      `SELECT c.*, u.display_name AS lead_name,
              cu.display_name AS consent_name
         FROM cleanups c
         JOIN users u ON u.id = c.lead_id
         JOIN users cu ON cu.id = c.consent_attested_by
        WHERE c.public_slug = ? AND c.public_enabled = 1`,
    )
    .get(slug) as CleanupWithLead | undefined;

  return row ?? null;
}
