import { getDb } from "./db";
import { recordEvent } from "./events";
import { newId } from "./ids";
import { hammingDistance, isInformativeDhash, SIMILAR_MAX } from "./preflight-core";
import { preflightFromBuffer } from "./preflight";
import { PhotoError, sanitizePhoto } from "./privacy";
import { deletePhotoFiles, writePhotoFiles } from "./storage";
import type { Photo, PhotoSummary } from "./types";

type PairRow = {
  id: string;
  cleanup_id: string;
  consent_attested_at: string | null;
};

type Candidate = {
  id: string;
  sha256: string;
  dhash: string;
};

export type IngestPhotoInput = {
  pairId: string;
  side: "before" | "after";
  buffer: Buffer;
  peopleVisible: boolean;
  actorId: string;
};

function findDuplicate(input: {
  cleanupId: string;
  sha256: string;
  dhash: string;
  excludePhotoId: string | null;
}): { id: string; distance: number } | null {
  const rows = getDb()
    .prepare(
      `SELECT ph.id, ph.sha256, ph.dhash
         FROM photos ph
         JOIN pairs p ON p.id = ph.pair_id
        WHERE p.cleanup_id = ?
          AND ph.superseded_at IS NULL
          AND (? IS NULL OR ph.id <> ?)`,
    )
    .all(input.cleanupId, input.excludePhotoId, input.excludePhotoId) as
    Candidate[];

  const exact = rows.find((row) => row.sha256 === input.sha256);
  if (exact) {
    return { id: exact.id, distance: 0 };
  }

  // A flat image produces an all-zero or all-one dHash, which carries no
  // texture information and collides with other flat images. Do not call that
  // a near-duplicate.
  if (!isInformativeDhash(input.dhash)) {
    return null;
  }

  let best: { id: string; distance: number } | null = null;
  for (const row of rows) {
    if (!isInformativeDhash(row.dhash)) continue;
    const distance = hammingDistance(input.dhash, row.dhash);
    if (distance <= SIMILAR_MAX && (!best || distance < best.distance)) {
      best = { id: row.id, distance };
    }
  }
  return best;
}

export async function ingestPhoto(input: IngestPhotoInput): Promise<Photo> {
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
    throw new PhotoError("Pair not found.", 404);
  }

  if (!pair.consent_attested_at) {
    throw new PhotoError(
      "This cleanup has no consent attestation, so photos cannot be stored.",
      409,
    );
  }

  const current = db
    .prepare(
      `SELECT * FROM photos
        WHERE pair_id = ? AND side = ? AND superseded_at IS NULL`,
    )
    .get(pair.id, input.side) as Photo | undefined;

  if (current) {
    const confirmed = db
      .prepare(
        `SELECT 1 FROM claims
          WHERE photo_id = ? AND status = 'confirmed' LIMIT 1`,
      )
      .get(current.id);

    if (confirmed) {
      throw new PhotoError(
        "This photo is the source of a confirmed claim. Create a revision before replacing it.",
        409,
      );
    }
  }

  const sanitized = await sanitizePhoto(input.buffer);
  const numbers = await preflightFromBuffer(sanitized.data);
  const duplicate = findDuplicate({
    cleanupId: pair.cleanup_id,
    sha256: sanitized.sha256,
    dhash: numbers.dhash,
    excludePhotoId: current?.id ?? null,
  });

  const id = newId();
  const now = new Date().toISOString();
  const photo: Photo = {
    id,
    pair_id: pair.id,
    side: input.side,
    stored_path: `${id}.jpg`,
    mime: "image/jpeg",
    bytes: sanitized.data.length,
    width: numbers.width,
    height: numbers.height,
    sha256: sanitized.sha256,
    original_sha256: sanitized.originalSha256,
    dhash: numbers.dhash,
    blur_score: numbers.blurScore,
    exposure_clipped: numbers.exposureClipped,
    near_duplicate_of: duplicate?.id ?? null,
    near_duplicate_distance: duplicate?.distance ?? null,
    people_visible: input.peopleVisible ? 1 : 0,
    uploaded_by: input.actorId,
    superseded_at: null,
    created_at: now,
  };

  writePhotoFiles(id, sanitized.data, sanitized.thumb);

  try {
    db.transaction(() => {
      if (current) {
        db.prepare("UPDATE photos SET superseded_at = ? WHERE id = ?").run(
          now,
          current.id,
        );
      }

      db.prepare(
        `INSERT INTO photos (
           id, pair_id, side, stored_path, mime, bytes, width, height,
           sha256, original_sha256, dhash, blur_score, exposure_clipped,
           near_duplicate_of, near_duplicate_distance, people_visible,
           uploaded_by, superseded_at, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
      ).run(
        photo.id,
        photo.pair_id,
        photo.side,
        photo.stored_path,
        photo.mime,
        photo.bytes,
        photo.width,
        photo.height,
        photo.sha256,
        photo.original_sha256,
        photo.dhash,
        photo.blur_score,
        photo.exposure_clipped,
        photo.near_duplicate_of,
        photo.near_duplicate_distance,
        photo.people_visible,
        photo.uploaded_by,
        photo.created_at,
      );

      recordEvent({
        cleanupId: pair.cleanup_id,
        actorId: input.actorId,
        type: "photo.uploaded",
        payload: {
          photoId: photo.id,
          pairId: photo.pair_id,
          side: photo.side,
          sha256: photo.sha256,
          originalSha256: photo.original_sha256,
          peopleVisible: photo.people_visible === 1,
          replacedPhotoId: current?.id ?? null,
          nearDuplicateOf: photo.near_duplicate_of,
          nearDuplicateDistance: photo.near_duplicate_distance,
        },
      });
    })();
  } catch (error) {
    deletePhotoFiles(id);
    throw error;
  }

  return photo;
}

export function getCurrentPhotos(pairId: string): Photo[] {
  return getDb()
    .prepare(
      `SELECT * FROM photos
        WHERE pair_id = ? AND superseded_at IS NULL
        ORDER BY side ASC`,
    )
    .all(pairId) as Photo[];
}

export function getCurrentPhotosForCleanup(cleanupId: string): Photo[] {
  return getDb()
    .prepare(
      `SELECT ph.*
         FROM photos ph
         JOIN pairs p ON p.id = ph.pair_id
        WHERE p.cleanup_id = ? AND ph.superseded_at IS NULL
        ORDER BY ph.created_at ASC`,
    )
    .all(cleanupId) as Photo[];
}

export function getPhoto(photoId: string): Photo | null {
  const row = getDb().prepare("SELECT * FROM photos WHERE id = ?").get(photoId) as
    | Photo
    | undefined;
  return row ?? null;
}

export function setPhotoPeopleVisible(input: {
  photoId: string;
  peopleVisible: boolean;
  actorId: string;
}): void {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT ph.id, ph.superseded_at, p.cleanup_id
         FROM photos ph
         JOIN pairs p ON p.id = ph.pair_id
        WHERE ph.id = ?`,
    )
    .get(input.photoId) as
    | { id: string; superseded_at: string | null; cleanup_id: string }
    | undefined;

  if (!row) {
    throw new PhotoError("Photo not found.", 404);
  }

  if (row.superseded_at) {
    throw new PhotoError("That photo has been replaced.", 409);
  }

  db.prepare("UPDATE photos SET people_visible = ? WHERE id = ?").run(
    input.peopleVisible ? 1 : 0,
    input.photoId,
  );

  recordEvent({
    cleanupId: row.cleanup_id,
    actorId: input.actorId,
    type: "photo.privacy_updated",
    payload: {
      photoId: input.photoId,
      peopleVisible: input.peopleVisible,
    },
  });
}

export function toPhotoSummary(photo: Photo): PhotoSummary {
  return {
    id: photo.id,
    pair_id: photo.pair_id,
    side: photo.side,
    mime: photo.mime,
    bytes: photo.bytes,
    width: photo.width,
    height: photo.height,
    sha256: photo.sha256,
    original_sha256: photo.original_sha256,
    dhash: photo.dhash,
    blur_score: photo.blur_score,
    exposure_clipped: photo.exposure_clipped,
    near_duplicate_of: photo.near_duplicate_of,
    near_duplicate_distance: photo.near_duplicate_distance,
    people_visible: photo.people_visible,
    superseded_at: photo.superseded_at,
    created_at: photo.created_at,
  };
}
