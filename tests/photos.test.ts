import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import type { Photo } from "../lib/types";

let dataDir: string;
let users: typeof import("../lib/users");
let cleanups: typeof import("../lib/cleanups");
let photos: typeof import("../lib/photos");
let storage: typeof import("../lib/storage");
let privacy: typeof import("../lib/privacy");
let dbModule: typeof import("../lib/db");
let ids: typeof import("../lib/ids");

let userId: string;
let cleanupId: string;
let pairId: string;
let replacementInput: Buffer;

async function makeJpeg(width = 1600, height = 900, seed = 1) {
  const raw = Buffer.alloc(width * height * 3);
  for (let i = 0; i < raw.length; i += 1) {
    raw[i] = (i * seed * 37) % 256;
  }
  return sharp(raw, {
    raw: { width, height, channels: 3 },
  })
    .jpeg({ quality: 88 })
    .toBuffer();
}

beforeAll(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "shoreproof-photos-"));
  process.env.DATA_DIR = dataDir;

  users = await import("../lib/users");
  cleanups = await import("../lib/cleanups");
  photos = await import("../lib/photos");
  storage = await import("../lib/storage");
  privacy = await import("../lib/privacy");
  dbModule = await import("../lib/db");
  ids = await import("../lib/ids");

  const user = users.createUser({ displayName: "Maya C.", role: "both" });
  userId = user.id;

  const cleanup = cleanups.createCleanup({
    site: "North Jetty",
    date: "2026-10-24",
    conditions: "Low tide, overcast.",
    publicNote: null,
    leadId: user.id,
    consentVersion: "2026-10-24",
  });
  cleanupId = cleanup.id;

  const pair = cleanups.createPair({
    cleanupId,
    label: null,
    actorId: user.id,
  });
  pairId = pair.id;
});

afterAll(() => {
  fs.rmSync(dataDir, { recursive: true, force: true });
});

describe("ingestPhoto", () => {
  it("stores a sanitized JPEG, its hash, checks, and a thumbnail", async () => {
    const input = await makeJpeg(1600, 900, 3);
    const photo = await photos.ingestPhoto({
      pairId,
      side: "before",
      buffer: input,
      peopleVisible: false,
      actorId: userId,
    });

    expect(photo.side).toBe("before");
    expect(photo.mime).toBe("image/jpeg");
    expect(photo.width).toBe(1600);
    expect(photo.height).toBe(900);
    expect(photo.original_sha256).toBe(privacy.sha256(input));
    expect(photo.sha256).not.toBe(photo.original_sha256);
    expect(photo.people_visible).toBe(0);
    expect(photo.near_duplicate_of).toBeNull();

    const stored = fs.readFileSync(storage.photoPath(photo.id));
    expect(privacy.sha256(stored)).toBe(photo.sha256);
    expect(fs.existsSync(storage.thumbPath(photo.id))).toBe(true);

    const current = photos.getCurrentPhotos(pairId);
    expect(current).toHaveLength(1);
    expect(current[0].id).toBe(photo.id);
  });

  it("supersedes the previous photo on the same side", async () => {
    const first = photos
      .getCurrentPhotos(pairId)
      .find((photo) => photo.side === "before") as Photo;
    const replacement = await makeJpeg(1500, 1000, 5);
    replacementInput = replacement;

    const next = await photos.ingestPhoto({
      pairId,
      side: "before",
      buffer: replacement,
      peopleVisible: true,
      actorId: userId,
    });

    expect(next.id).not.toBe(first.id);
    expect(next.people_visible).toBe(1);

    const old = photos.getPhoto(first.id);
    expect(old?.superseded_at).not.toBeNull();

    const current = photos.getCurrentPhotos(pairId);
    expect(current).toHaveLength(1);
    expect(current[0].id).toBe(next.id);
  });

  it("marks an exact duplicate across pairs in the same cleanup", async () => {
    const source = photos
      .getCurrentPhotos(pairId)
      .find((photo) => photo.side === "before") as Photo;

    const secondPair = cleanups.createPair({
      cleanupId,
      label: "Duplicate test",
      actorId: userId,
    });

    const duplicate = await photos.ingestPhoto({
      pairId: secondPair.id,
      side: "before",
      buffer: replacementInput,
      peopleVisible: false,
      actorId: userId,
    });

    expect(duplicate.near_duplicate_of).toBe(source.id);
    expect(duplicate.near_duplicate_distance).toBe(0);
  });

  it("does not call a flat image a near duplicate", async () => {
    const flat = await sharp({
      create: {
        width: 1600,
        height: 900,
        channels: 3,
        background: { r: 128, g: 128, b: 128 },
      },
    })
      .jpeg()
      .toBuffer();

    const thirdPair = cleanups.createPair({
      cleanupId,
      label: "Flat image test",
      actorId: userId,
    });

    const photo = await photos.ingestPhoto({
      pairId: thirdPair.id,
      side: "before",
      buffer: flat,
      peopleVisible: false,
      actorId: userId,
    });

    expect(photo.dhash).toBe("0000000000000000");
    expect(photo.near_duplicate_of).toBeNull();
  });

  it("does not call the other side of the same pair a duplicate", async () => {
    const unique = await makeJpeg(1300, 850, 23);
    const samePair = cleanups.createPair({
      cleanupId,
      label: "Same pair test",
      actorId: userId,
    });

    const before = await photos.ingestPhoto({
      pairId: samePair.id,
      side: "before",
      buffer: unique,
      peopleVisible: false,
      actorId: userId,
    });
    const after = await photos.ingestPhoto({
      pairId: samePair.id,
      side: "after",
      buffer: unique,
      peopleVisible: false,
      actorId: userId,
    });

    expect(before.near_duplicate_of).toBeNull();
    expect(after.near_duplicate_of).toBeNull();
  });

  it("refuses to replace a photo that sources a draft claim", async () => {
    const draftPair = cleanups.createPair({
      cleanupId,
      label: "Draft claim test",
      actorId: userId,
    });
    const current = await photos.ingestPhoto({
      pairId: draftPair.id,
      side: "before",
      buffer: await makeJpeg(1400, 900, 31),
      peopleVisible: false,
      actorId: userId,
    });

    const now = new Date().toISOString();
    dbModule
      .getDb()
      .prepare(
        `INSERT INTO claims (
           id, pair_id, photo_id, suggestion_id, x, y, w, h, text, category,
           status, revision, supersedes_id, collector_id, decided_by,
           decided_at, decision_note, created_at, updated_at
         ) VALUES (?, ?, ?, NULL, 0.1, 0.1, 0.2, 0.2, ?, ?, 'draft',
           1, NULL, ?, NULL, NULL, NULL, ?, ?)`,
      )
      .run(
        ids.newId(),
        draftPair.id,
        current.id,
        "A bottle was removed from the rock line.",
        "Beverage Bottles (Plastic)",
        userId,
        now,
        now,
      );

    await expect(
      photos.ingestPhoto({
        pairId: draftPair.id,
        side: "before",
        buffer: await makeJpeg(1200, 800, 9),
        peopleVisible: false,
        actorId: userId,
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("refuses to replace a photo that sources a confirmed claim", async () => {
    const current = photos
      .getCurrentPhotos(pairId)
      .find((photo) => photo.side === "before") as Photo;

    const now = new Date().toISOString();
    dbModule
      .getDb()
      .prepare(
        `INSERT INTO claims (
           id, pair_id, photo_id, suggestion_id, x, y, w, h, text, category,
           status, revision, supersedes_id, collector_id, decided_by,
           decided_at, decision_note, created_at, updated_at
         ) VALUES (?, ?, ?, NULL, 0.1, 0.1, 0.2, 0.2, ?, ?, 'confirmed',
           1, NULL, ?, ?, ?, NULL, ?, ?)`,
      )
      .run(
        ids.newId(),
        pairId,
        current.id,
        "A bottle was removed from the rock line.",
        "plastic",
        userId,
        userId,
        now,
        now,
        now,
      );

    const replacement = await makeJpeg(1200, 800, 9);

    await expect(
      photos.ingestPhoto({
        pairId,
        side: "before",
        buffer: replacement,
        peopleVisible: false,
        actorId: userId,
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("updates the people-visible flag and writes an event", async () => {
    const current = photos
      .getCurrentPhotos(pairId)
      .find((photo) => photo.side === "before") as Photo;

    photos.setPhotoPeopleVisible({
      photoId: current.id,
      peopleVisible: false,
      actorId: userId,
    });

    const updated = photos.getPhoto(current.id);
    expect(updated?.people_visible).toBe(0);

    const event = dbModule
      .getDb()
      .prepare(
        "SELECT type FROM events WHERE type = 'photo.privacy_updated' ORDER BY created_at DESC LIMIT 1",
      )
      .get() as { type: string };
    expect(event.type).toBe("photo.privacy_updated");
  });
});
