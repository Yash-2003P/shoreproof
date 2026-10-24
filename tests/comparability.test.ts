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
let comparability: typeof import("../lib/comparability");
let submission: typeof import("../lib/submission");
let dbModule: typeof import("../lib/db");

let userId: string;
let cleanupId: string;
let pairId: string;
let beforeId: string;

async function makeJpeg(width: number, height: number, seed: number) {
  const raw = Buffer.alloc(width * height * 3);
  for (let index = 0; index < raw.length; index += 1) {
    raw[index] = (index * seed * 29 + seed * 7) % 256;
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
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "shoreproof-comparability-"));
  process.env.DATA_DIR = dataDir;

  users = await import("../lib/users");
  cleanups = await import("../lib/cleanups");
  photos = await import("../lib/photos");
  claims = await import("../lib/claims");
  comparability = await import("../lib/comparability");
  submission = await import("../lib/submission");
  dbModule = await import("../lib/db");

  const user = users.createUser({ displayName: "Maya C.", role: "both" });
  userId = user.id;

  const cleanup = cleanups.createCleanup({
    site: "North Jetty",
    date: "2026-10-24",
    conditions: "Low tide.",
    publicNote: null,
    leadId: user.id,
    consentVersion: "2026-10-24",
  });
  cleanupId = cleanup.id;
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
    buffer: await makeJpeg(1600, 900, 3),
    peopleVisible: false,
    actorId: userId,
  });
  beforeId = before.id;
});

afterAll(() => {
  fs.rmSync(dataDir, { recursive: true, force: true });
});

async function addAfter(seed = 7) {
  return photos.ingestPhoto({
    pairId,
    side: "after",
    buffer: await makeJpeg(1600, 900, seed),
    peopleVisible: false,
    actorId: userId,
  });
}

function addClaim(text = "A bottle was removed from the rock line.") {
  return claims.saveDraftClaim({
    pairId,
    photoId: beforeId,
    region: { x: 0.1, y: 0.2, w: 0.3, h: 0.3 },
    text,
    category: "Beverage Bottles (Plastic)",
    actorId: userId,
  });
}

describe("setComparability", () => {
  it("stores the state, the score, and the reason", async () => {
    await addAfter();

    const result = await comparability.setComparability({
      pairId,
      state: "partial",
      reason: "Tide was higher and the camera moved left.",
      actorId: userId,
    });

    expect(result.state).toBe("partial");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);

    const row = dbModule
      .getDb()
      .prepare(
        "SELECT comparability, comparability_reason, framing_score, framing_detail FROM pairs WHERE id = ?",
      )
      .get(pairId) as {
      comparability: string;
      comparability_reason: string;
      framing_score: number;
      framing_detail: string;
    };

    expect(row.comparability).toBe("partial");
    expect(row.comparability_reason).toBe("Tide was higher and the camera moved left.");
    expect(row.framing_score).toBe(result.score);
    expect(JSON.parse(row.framing_detail).word).toBe(result.word);

    const event = latestEvent("comparability.set");
    expect(event).toBeDefined();
    expect(JSON.parse(event?.payload ?? "{}")).toMatchObject({
      pairId,
      state: "partial",
      reason: "Tide was higher and the camera moved left.",
    });
  });

  it("requires a reason for partial and not comparable", async () => {
    await addAfter();

    await expect(
      comparability.setComparability({
        pairId,
        state: "not_comparable",
        reason: "   ",
        actorId: userId,
      }),
    ).rejects.toThrowError(comparability.ComparabilityError);

    await expect(
      comparability.setComparability({
        pairId,
        state: "partial",
        reason: null,
        actorId: userId,
      }),
    ).rejects.toThrowError(comparability.ComparabilityError);
  });

  it("needs both photos", async () => {
    await expect(
      comparability.setComparability({
        pairId,
        state: "comparable",
        reason: null,
        actorId: userId,
      }),
    ).rejects.toThrowError(comparability.ComparabilityError);
  });
});

describe("getPairBlockers", () => {
  it("lists what is missing before a pair can be submitted", () => {
    const codes = comparability
      .getPairBlockers(pairId)
      .map((blocker) => blocker.code);

    expect(codes).toContain("after_missing");
    expect(codes).toContain("comparability_missing");
    expect(codes).toContain("claims_missing");
  });

  it("flags a people-visible photo as a warning, not a submission blocker", async () => {
    await addAfter();
    const after = await photos.getCurrentPhotos(pairId);
    const afterPhoto = after.find((photo) => photo.side === "after");
    dbModule
      .getDb()
      .prepare("UPDATE photos SET people_visible = 1 WHERE id = ?")
      .run(afterPhoto?.id);

    const blockers = comparability.getPairBlockers(pairId);
    const warning = blockers.find((blocker) => blocker.code === "people_visible");

    expect(warning?.level).toBe("warning");
    expect(blockers.filter((blocker) => blocker.level === "blocker")).not.toContainEqual(
      expect.objectContaining({ code: "people_visible" }),
    );
  });

  it("flags an incomplete claim", async () => {
    await addAfter();
    addClaim();
    dbModule
      .getDb()
      .prepare("UPDATE claims SET text = '' WHERE pair_id = ?")
      .run(pairId);

    const codes = comparability
      .getPairBlockers(pairId)
      .map((blocker) => blocker.code);

    expect(codes).toContain("claims_incomplete");
  });
});

describe("submitPair", () => {
  it("refuses to submit without both photos, comparability, and a claim", async () => {
    expect(() =>
      submission.submitPair({ pairId, actorId: userId }),
    ).toThrowError(submission.SubmissionError);

    await addAfter();
    expect(() =>
      submission.submitPair({ pairId, actorId: userId }),
    ).toThrowError(submission.SubmissionError);

    await comparability.setComparability({
      pairId,
      state: "comparable",
      reason: null,
      actorId: userId,
    });

    expect(() =>
      submission.submitPair({ pairId, actorId: userId }),
    ).toThrowError(submission.SubmissionError);

    expect(claims.getClaimsForPair(pairId)).toHaveLength(0);
  });

  it("refuses to submit an incomplete claim", async () => {
    await addAfter();
    addClaim();
    await comparability.setComparability({
      pairId,
      state: "comparable",
      reason: null,
      actorId: userId,
    });

    dbModule
      .getDb()
      .prepare("UPDATE claims SET text = '' WHERE pair_id = ?")
      .run(pairId);

    expect(() =>
      submission.submitPair({ pairId, actorId: userId }),
    ).toThrowError(submission.SubmissionError);
  });

  it("moves complete claims into the review queue and writes the events", async () => {
    await addAfter();
    addClaim();
    await comparability.setComparability({
      pairId,
      state: "partial",
      reason: "The tide moved two metres.",
      actorId: userId,
    });

    const result = submission.submitPair({ pairId, actorId: userId });

    expect(result.claims).toHaveLength(1);
    expect(result.claims[0].status).toBe("pending");

    const event = latestEvent("claim.submitted");
    expect(event).toBeDefined();
    expect(JSON.parse(event?.payload ?? "{}")).toMatchObject({
      pairId,
      collectorId: userId,
    });
    expect(latestEvent("pair.submitted")).toBeDefined();
  });
});
