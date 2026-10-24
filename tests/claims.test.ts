import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

let dataDir: string;
let users: typeof import("../lib/users");
let cleanups: typeof import("../lib/cleanups");
let photos: typeof import("../lib/photos");
let claims: typeof import("../lib/claims");
let dbModule: typeof import("../lib/db");

let userId: string;
let otherUserId: string;
let cleanupId: string;
let beforeInput: Buffer;
let afterInput: Buffer;

let pairId: string;
let beforeId: string;
let afterId: string;

async function makeJpeg(width: number, height: number, seed: number) {
  const raw = Buffer.alloc(width * height * 3);
  for (let i = 0; i < raw.length; i += 1) {
    raw[i] = (i * seed * 29 + seed * 7) % 256;
  }
  return sharp(raw, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 88 })
    .toBuffer();
}

function latestEvent(type: string) {
  return dbModule
    .getDb()
    .prepare(
      `SELECT type, payload FROM events
        WHERE type = ?
        ORDER BY created_at DESC, rowid DESC
        LIMIT 1`,
    )
    .get(type) as { type: string; payload: string } | undefined;
}

beforeAll(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "shoreproof-claims-"));
  process.env.DATA_DIR = dataDir;

  users = await import("../lib/users");
  cleanups = await import("../lib/cleanups");
  photos = await import("../lib/photos");
  claims = await import("../lib/claims");
  dbModule = await import("../lib/db");

  const user = users.createUser({ displayName: "Maya C.", role: "both" });
  userId = user.id;
  const other = users.createUser({ displayName: "Jon R.", role: "reviewer" });
  otherUserId = other.id;

  const cleanup = cleanups.createCleanup({
    site: "North Jetty",
    date: "2026-10-24",
    conditions: "Low tide, overcast.",
    publicNote: null,
    leadId: user.id,
    consentVersion: "2026-10-24",
  });
  cleanupId = cleanup.id;

  beforeInput = await makeJpeg(1600, 900, 3);
  afterInput = await makeJpeg(1600, 900, 7);
});

beforeEach(async () => {
  const pair = cleanups.createPair({
    cleanupId,
    label: null,
    actorId: userId,
  });
  pairId = pair.id;

  const before = await photos.ingestPhoto({
    pairId,
    side: "before",
    buffer: beforeInput,
    peopleVisible: false,
    actorId: userId,
  });
  beforeId = before.id;

  const after = await photos.ingestPhoto({
    pairId,
    side: "after",
    buffer: afterInput,
    peopleVisible: false,
    actorId: userId,
  });
  afterId = after.id;
});

afterAll(() => {
  fs.rmSync(dataDir, { recursive: true, force: true });
});

const REGION = { x: 0.1, y: 0.2, w: 0.3, h: 0.25 };

describe("saveDraftClaim", () => {
  it("saves a draft with a normalized region, text, and category", () => {
    const claim = claims.saveDraftClaim({
      pairId,
      photoId: beforeId,
      region: REGION,
      text: "  A bottle was removed from the rock line.  ",
      category: "Beverage Bottles (Plastic)",
      actorId: userId,
    });

    expect(claim.status).toBe("draft");
    expect(claim.revision).toBe(1);
    expect(claim.text).toBe("A bottle was removed from the rock line.");
    expect(claim.x).toBe(0.1);
    expect(claim.y).toBe(0.2);
    expect(claim.w).toBe(0.3);
    expect(claim.h).toBe(0.25);
    expect(claim.photo_id).toBe(beforeId);
    expect(claim.collector_id).toBe(userId);

    const list = claims.getClaimsForPair(pairId);
    expect(list).toHaveLength(1);
    expect(list[0].collector_name).toBe("Maya C.");

    const event = latestEvent("claim.created");
    expect(event).toBeDefined();
    expect(JSON.parse(event?.payload ?? "{}")).toMatchObject({
      claimId: claim.id,
      pairId,
      photoId: beforeId,
      region: REGION,
      category: "Beverage Bottles (Plastic)",
    });
  });

  it("updates an existing draft in place", () => {
    const claim = claims.saveDraftClaim({
      pairId,
      photoId: beforeId,
      region: REGION,
      text: "A bottle was removed.",
      category: "Beverage Bottles (Plastic)",
      actorId: userId,
    });

    const updated = claims.saveDraftClaim({
      claimId: claim.id,
      pairId,
      photoId: beforeId,
      region: { x: 0.4, y: 0.4, w: 0.2, h: 0.2 },
      text: "A bottle and a cap were removed.",
      category: "Caps & Lids",
      actorId: userId,
    });

    expect(updated.id).toBe(claim.id);
    expect(updated.text).toBe("A bottle and a cap were removed.");
    expect(updated.category).toBe("Caps & Lids");
    expect(updated.x).toBe(0.4);
    expect(claims.getClaimsForPair(pairId)).toHaveLength(1);
    expect(latestEvent("claim.updated")).toBeDefined();
  });

  it("allows multiple claims on one pair", () => {
    claims.saveDraftClaim({
      pairId,
      photoId: beforeId,
      region: { x: 0.05, y: 0.05, w: 0.1, h: 0.1 },
      text: "First observation.",
      category: "Food Wrappers",
      actorId: userId,
    });
    claims.saveDraftClaim({
      pairId,
      photoId: beforeId,
      region: { x: 0.5, y: 0.5, w: 0.1, h: 0.1 },
      text: "Second observation.",
      category: "Other Trash",
      actorId: userId,
    });

    expect(claims.getClaimsForPair(pairId)).toHaveLength(2);
  });

  it("rejects empty text, an invalid category, and a tiny region", () => {
    const base = {
      pairId,
      photoId: beforeId,
      region: REGION,
      text: "A bottle was removed.",
      category: "Beverage Bottles (Plastic)",
      actorId: userId,
    };

    expect(() =>
      claims.saveDraftClaim({ ...base, text: "   " }),
    ).toThrowError(claims.ClaimError);
    expect(() =>
      claims.saveDraftClaim({ ...base, text: "x".repeat(281) }),
    ).toThrowError(claims.ClaimError);
    expect(() =>
      claims.saveDraftClaim({ ...base, category: "Plastic-ish" }),
    ).toThrowError(claims.ClaimError);
    expect(() =>
      claims.saveDraftClaim({
        ...base,
        region: { x: 0.1, y: 0.1, w: 0.01, h: 0.2 },
      }),
    ).toThrowError(claims.ClaimError);

    expect(claims.getClaimsForPair(pairId)).toHaveLength(0);
  });

  it("rejects an after photo as the claim source", () => {
    expect(() =>
      claims.saveDraftClaim({
        pairId,
        photoId: afterId,
        region: REGION,
        text: "A bottle was removed.",
        category: "Beverage Bottles (Plastic)",
        actorId: userId,
      }),
    ).toThrowError(claims.ClaimError);

    expect(claims.getClaimsForPair(pairId)).toHaveLength(0);
  });

  it("rejects a pair with no before photo", () => {
    const emptyPair = cleanups.createPair({
      cleanupId,
      label: "No photo yet",
      actorId: userId,
    });

    expect(() =>
      claims.saveDraftClaim({
        pairId: emptyPair.id,
        photoId: beforeId,
        region: REGION,
        text: "A bottle was removed.",
        category: "Beverage Bottles (Plastic)",
        actorId: userId,
      }),
    ).toThrowError(claims.ClaimError);
  });

  it("rejects editing a claim that is no longer a draft", () => {
    const claim = claims.saveDraftClaim({
      pairId,
      photoId: beforeId,
      region: REGION,
      text: "A bottle was removed.",
      category: "Beverage Bottles (Plastic)",
      actorId: userId,
    });

    dbModule
      .getDb()
      .prepare(
        "UPDATE claims SET status = 'confirmed', decided_by = ?, decided_at = ? WHERE id = ?",
      )
      .run(userId, new Date().toISOString(), claim.id);

    expect(() =>
      claims.saveDraftClaim({
        claimId: claim.id,
        pairId,
        photoId: beforeId,
        region: REGION,
        text: "Rewritten after confirmation.",
        category: "Other Trash",
        actorId: userId,
      }),
    ).toThrowError(claims.ClaimError);
  });

  it("rejects editing another person's draft", () => {
    const claim = claims.saveDraftClaim({
      pairId,
      photoId: beforeId,
      region: REGION,
      text: "A bottle was removed.",
      category: "Beverage Bottles (Plastic)",
      actorId: userId,
    });

    expect(() =>
      claims.saveDraftClaim({
        claimId: claim.id,
        pairId,
        photoId: beforeId,
        region: REGION,
        text: "Edited by someone else.",
        category: "Other Trash",
        actorId: otherUserId,
      }),
    ).toThrowError(claims.ClaimError);
  });
});

describe("deleteDraftClaim", () => {
  it("removes the row and writes the draft-deleted event", () => {
    const claim = claims.saveDraftClaim({
      pairId,
      photoId: beforeId,
      region: REGION,
      text: "A bottle was removed.",
      category: "Beverage Bottles (Plastic)",
      actorId: userId,
    });

    const deleted = claims.deleteDraftClaim({
      claimId: claim.id,
      actorId: userId,
    });

    expect(deleted.id).toBe(claim.id);
    expect(deleted.pairId).toBe(pairId);
    expect(claims.getClaim(claim.id)).toBeNull();
    expect(claims.getClaimsForPair(pairId)).toHaveLength(0);

    const event = latestEvent("claim.draft_deleted");
    expect(event).toBeDefined();
    expect(JSON.parse(event?.payload ?? "{}")).toMatchObject({
      claimId: claim.id,
      pairId,
      photoId: beforeId,
      text: "A bottle was removed.",
      category: "Beverage Bottles (Plastic)",
      region: REGION,
    });
  });

  it("refuses to remove a confirmed claim", () => {
    const claim = claims.saveDraftClaim({
      pairId,
      photoId: beforeId,
      region: REGION,
      text: "A bottle was removed.",
      category: "Beverage Bottles (Plastic)",
      actorId: userId,
    });

    dbModule
      .getDb()
      .prepare("UPDATE claims SET status = 'confirmed' WHERE id = ?")
      .run(claim.id);

    expect(() =>
      claims.deleteDraftClaim({ claimId: claim.id, actorId: userId }),
    ).toThrowError(claims.ClaimError);
    expect(claims.getClaim(claim.id)).not.toBeNull();
  });

  it("refuses to remove another person's draft", () => {
    const claim = claims.saveDraftClaim({
      pairId,
      photoId: beforeId,
      region: REGION,
      text: "A bottle was removed.",
      category: "Beverage Bottles (Plastic)",
      actorId: userId,
    });

    expect(() =>
      claims.deleteDraftClaim({ claimId: claim.id, actorId: otherUserId }),
    ).toThrowError(claims.ClaimError);
  });
});
