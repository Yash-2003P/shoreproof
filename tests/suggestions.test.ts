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
let suggestions: typeof import("../lib/suggestions");
let dbModule: typeof import("../lib/db");

let userId: string;
let cleanupId: string;
let pairId: string;
let beforeId: string;
let afterId: string;

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

const BOX = { x: 0.25, y: 0.35, w: 0.2, h: 0.3, score: 0.62, cocoId: 39 };

beforeAll(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "shoreproof-suggestions-"));
  process.env.DATA_DIR = dataDir;

  users = await import("../lib/users");
  cleanups = await import("../lib/cleanups");
  photos = await import("../lib/photos");
  claims = await import("../lib/claims");
  suggestions = await import("../lib/suggestions");
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

  const after = await photos.ingestPhoto({
    pairId,
    side: "after",
    buffer: await makeJpeg(1600, 900, 7),
    peopleVisible: false,
    actorId: userId,
  });
  afterId = after.id;
});

afterAll(() => {
  fs.rmSync(dataDir, { recursive: true, force: true });
});

function saveRun(boxes = [BOX]) {
  return suggestions.saveSuggestions({
    pairId,
    photoId: beforeId,
    model: "YOLO26n",
    modelSha256:
      "cda08d9440217e243e075ee839f40383c59b3f973e493f9f6c7452922a69436e",
    runtimeMs: 421,
    inputWidth: 640,
    inputHeight: 640,
    boxes,
  });
}

describe("saveSuggestions", () => {
  it("stores the run and the boxes with the server-side mapping", () => {
    const rows = saveRun();

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      photo_id: beforeId,
      coco_class: "bottle",
      coco_id: 39,
      confidence: 0.62,
      icc_category: "Beverage Bottles (Plastic)",
      mapping_uncertain: 0,
      status: "open",
      edited: 0,
    });
    expect(rows[0].x).toBe(0.25);
    expect(rows[0].y).toBe(0.35);
    expect(rows[0].w).toBe(0.2);
    expect(rows[0].h).toBe(0.3);
    expect(rows[0].model).toBe("YOLO26n");
    expect(rows[0].runtime_ms).toBe(421);

    const event = latestEvent("suggestions.saved");
    expect(event).toBeDefined();
    expect(JSON.parse(event?.payload ?? "{}")).toMatchObject({
      pairId,
      photoId: beforeId,
      model: "YOLO26n",
      boxCount: 1,
    });
  });

  it("marks fork mappings as uncertain", () => {
    const rows = saveRun([{ ...BOX, cocoId: 42 }]);

    expect(rows[0].icc_category).toBe("Cups & Plates");
    expect(rows[0].mapping_uncertain).toBe(1);
  });

  it("leaves unmapped classes without a category", () => {
    const rows = saveRun([{ ...BOX, cocoId: 0 }]);

    expect(rows[0].icc_category).toBeNull();
    expect(rows[0].mapping_uncertain).toBe(0);
  });

  it("rejects an after photo, an unknown class, and a broken region", () => {
    expect(() =>
      suggestions.saveSuggestions({
        pairId,
        photoId: afterId,
        model: "YOLO26n",
        modelSha256: "a".repeat(64),
        runtimeMs: 10,
        inputWidth: 640,
        inputHeight: 640,
        boxes: [BOX],
      }),
    ).toThrowError(suggestions.SuggestionError);

    expect(() =>
      suggestions.saveSuggestions({
        pairId,
        photoId: beforeId,
        model: "YOLO26n",
        modelSha256: "a".repeat(64),
        runtimeMs: 10,
        inputWidth: 640,
        inputHeight: 640,
        boxes: [{ ...BOX, cocoId: 900 }],
      }),
    ).toThrowError(suggestions.SuggestionError);

    expect(() =>
      suggestions.saveSuggestions({
        pairId,
        photoId: beforeId,
        model: "YOLO26n",
        modelSha256: "a".repeat(64),
        runtimeMs: 10,
        inputWidth: 640,
        inputHeight: 640,
        boxes: [{ ...BOX, w: 0.001 }],
      }),
    ).toThrowError(suggestions.SuggestionError);
  });

  it("replaces open suggestions when a new run is saved", () => {
    saveRun();
    const second = saveRun([{ ...BOX, cocoId: 41, score: 0.44 }]);

    const open = second.filter((row) => row.status === "open");
    expect(open).toHaveLength(1);
    expect(open[0].coco_class).toBe("cup");
  });
});

describe("acceptSuggestion", () => {
  it("creates a draft claim with the same region and the suggestion id", () => {
    const [suggestion] = saveRun();

    const claim = suggestions.acceptSuggestion({
      suggestionId: suggestion.id,
      actorId: userId,
      category: "Beverage Bottles (Plastic)",
    });

    expect(claim.status).toBe("draft");
    expect(claim.suggestion_id).toBe(suggestion.id);
    expect(claim.photo_id).toBe(beforeId);
    expect(claim.x).toBe(0.25);
    expect(claim.y).toBe(0.35);
    expect(claim.w).toBe(0.2);
    expect(claim.h).toBe(0.3);
    expect(claim.category).toBe("Beverage Bottles (Plastic)");
    expect(claim.text).toBe("");
    expect(claim.collector_id).toBe(userId);

    const updated = suggestions.getSuggestion(suggestion.id);
    expect(updated?.status).toBe("accepted");

    const event = latestEvent("suggestion.accepted");
    expect(event).toBeDefined();
    expect(JSON.parse(event?.payload ?? "{}")).toMatchObject({
      suggestionId: suggestion.id,
      claimId: claim.id,
      cocoClass: "bottle",
      category: "Beverage Bottles (Plastic)",
    });
  });

  it("stores an edited region and marks the box as edited", () => {
    const [suggestion] = saveRun();

    const claim = suggestions.acceptSuggestion({
      suggestionId: suggestion.id,
      actorId: userId,
      category: "Beverage Bottles (Plastic)",
      region: { x: 0.4, y: 0.4, w: 0.25, h: 0.25 },
    });

    expect(claim.x).toBe(0.4);
    expect(claim.w).toBe(0.25);
    expect(suggestions.getSuggestion(suggestion.id)?.edited).toBe(1);
  });

  it("refuses a box with no category and a box that was already answered", () => {
    const [suggestion] = saveRun();

    expect(() =>
      suggestions.acceptSuggestion({
        suggestionId: suggestion.id,
        actorId: userId,
        category: "Plastic-ish",
      }),
    ).toThrowError(suggestions.SuggestionError);

    suggestions.acceptSuggestion({
      suggestionId: suggestion.id,
      actorId: userId,
      category: "Beverage Bottles (Plastic)",
    });

    expect(() =>
      suggestions.acceptSuggestion({
        suggestionId: suggestion.id,
        actorId: userId,
        category: "Beverage Bottles (Plastic)",
      }),
    ).toThrowError(suggestions.SuggestionError);
  });

  it("creates a claim that the collector can complete", () => {
    const [suggestion] = saveRun();
    const claim = suggestions.acceptSuggestion({
      suggestionId: suggestion.id,
      actorId: userId,
      category: "Beverage Bottles (Plastic)",
    });

    const saved = claims.saveDraftClaim({
      claimId: claim.id,
      pairId,
      photoId: beforeId,
      region: { x: claim.x ?? 0, y: claim.y ?? 0, w: claim.w ?? 0, h: claim.h ?? 0 },
      text: "A bottle was removed from the rock line.",
      category: "Beverage Bottles (Plastic)",
      actorId: userId,
    });

    expect(saved.text).toBe("A bottle was removed from the rock line.");
    expect(saved.suggestion_id).toBe(suggestion.id);
  });
});

describe("rejectSuggestion", () => {
  it("records the reason, writes the event, and creates no claim", () => {
    const [suggestion] = saveRun();

    const rejected = suggestions.rejectSuggestion({
      suggestionId: suggestion.id,
      actorId: userId,
      reason: "False positive",
    });

    expect(rejected.status).toBe("rejected");
    expect(rejected.reject_reason).toBe("False positive");
    expect(claims.getClaimsForPair(pairId)).toHaveLength(0);

    const event = latestEvent("suggestion.rejected");
    expect(event).toBeDefined();
    expect(JSON.parse(event?.payload ?? "{}")).toMatchObject({
      suggestionId: suggestion.id,
      reason: "False positive",
    });
  });

  it("refuses to reject an accepted box", () => {
    const [suggestion] = saveRun();
    suggestions.acceptSuggestion({
      suggestionId: suggestion.id,
      actorId: userId,
      category: "Beverage Bottles (Plastic)",
    });

    expect(() =>
      suggestions.rejectSuggestion({
        suggestionId: suggestion.id,
        actorId: userId,
        reason: "False positive",
      }),
    ).toThrowError(suggestions.SuggestionError);
  });
});
