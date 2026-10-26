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
let decisions: typeof import("../lib/decisions");
let queue: typeof import("../lib/queue.server");
let dbModule: typeof import("../lib/db");

let reviewerId: string;
let collectorId: string;
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

function eventCount(type: string): number {
  return (
    dbModule
      .getDb()
      .prepare("SELECT COUNT(*) AS count FROM events WHERE type = ?")
      .get(type) as { count: number }
  ).count;
}

beforeAll(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "shoreproof-decisions-"));
  process.env.DATA_DIR = dataDir;

  users = await import("../lib/users");
  cleanups = await import("../lib/cleanups");
  photos = await import("../lib/photos");
  claims = await import("../lib/claims");
  comparability = await import("../lib/comparability");
  submission = await import("../lib/submission");
  decisions = await import("../lib/decisions");
  queue = await import("../lib/queue.server");
  dbModule = await import("../lib/db");

  const collector = users.createUser({ displayName: "Maya C.", role: "both" });
  collectorId = collector.id;

  const reviewer = users.createUser({ displayName: "Jonas R.", role: "both" });
  reviewerId = reviewer.id;

  const cleanup = cleanups.createCleanup({
    site: "North Jetty",
    date: "2026-10-24",
    conditions: "Low tide.",
    publicNote: null,
    leadId: collectorId,
    consentVersion: "2026-10-24",
  });
  cleanupId = cleanup.id;
});

beforeEach(async () => {
  const pair = cleanups.createPair({
    cleanupId,
    label: null,
    actorId: collectorId,
  });
  pairId = pair.id;

  const before = await photos.ingestPhoto({
    pairId,
    side: "before",
    buffer: await makeJpeg(1600, 900, 3),
    peopleVisible: false,
    actorId: collectorId,
  });
  beforeId = before.id;

  await photos.ingestPhoto({
    pairId,
    side: "after",
    buffer: await makeJpeg(1600, 900, 7),
    peopleVisible: false,
    actorId: collectorId,
  });

  claims.saveDraftClaim({
    pairId,
    photoId: beforeId,
    region: { x: 0.1, y: 0.2, w: 0.3, h: 0.3 },
    text: "A bottle was removed from the rock line.",
    category: "Beverage Bottles (Plastic)",
    actorId: collectorId,
  });

  await comparability.setComparability({
    pairId,
    state: "comparable",
    reason: null,
    actorId: collectorId,
  });

  submission.submitPair({ pairId, actorId: collectorId });
});

afterAll(() => {
  fs.rmSync(dataDir, { recursive: true, force: true });
});

function pendingClaimId(): string {
  const row = dbModule
    .getDb()
    .prepare(
      "SELECT id FROM claims WHERE pair_id = ? AND status = 'pending'",
    )
    .get(pairId) as { id: string };
  return row.id;
}

describe("decideClaim — confirm", () => {
  it("locks the claim and records who decided it", () => {
    const claim = decisions.decideClaim({
      claimId: pendingClaimId(),
      actorId: reviewerId,
      decision: "confirm",
      note: "Clear before and after.",
    });

    expect(claim.status).toBe("confirmed");
    expect(claim.decided_by).toBe(reviewerId);
    expect(claim.decided_at).not.toBeNull();
    expect(claim.decision_note).toBe("Clear before and after.");

    const event = latestEvent("claim.confirmed");
    expect(event).toBeDefined();
    expect(JSON.parse(event?.payload ?? "{}")).toMatchObject({
      claimId: claim.id,
      reviewerId,
      selfReviewed: false,
    });
  });

  it("discloses self-review in the event payload", () => {
    const claim = decisions.decideClaim({
      claimId: pendingClaimId(),
      actorId: collectorId,
      decision: "confirm",
      note: null,
    });

    const event = latestEvent("claim.confirmed");
    expect(JSON.parse(event?.payload ?? "{}").selfReviewed).toBe(true);

    const flags = queue.getClaimForReview(claim.id, collectorId)?.flags ?? [];
    expect(flags).toContain("self_reviewed");
  });

  it("refuses a second decision with the decided-by name", () => {
    const claimId = pendingClaimId();
    decisions.decideClaim({
      claimId,
      actorId: reviewerId,
      decision: "confirm",
      note: null,
    });

    expect(() =>
      decisions.decideClaim({
        claimId,
        actorId: collectorId,
        decision: "reject",
        note: "Changed my mind.",
      }),
    ).toThrowError(/already confirmed by Jonas R\./);
  });

  it("refuses to confirm a not comparable pair", async () => {
    const claimId = pendingClaimId();

    await comparability.setComparability({
      pairId,
      state: "not_comparable",
      reason: "The camera pointed at a different patch of sand.",
      actorId: collectorId,
    });

    expect(() =>
      decisions.decideClaim({
        claimId,
        actorId: reviewerId,
        decision: "confirm",
        note: null,
      }),
    ).toThrowError(/not comparable/i);
  });

  it("refuses to confirm a people-visible photo", async () => {
    const claimId = pendingClaimId();

    const current = photos.getCurrentPhotos(pairId);
    for (const photo of current) {
      photos.setPhotoPeopleVisible({
        photoId: photo.id,
        peopleVisible: true,
        actorId: collectorId,
      });
    }

    expect(() =>
      decisions.decideClaim({
        claimId,
        actorId: reviewerId,
        decision: "confirm",
        note: null,
      }),
    ).toThrowError(/people-visible/i);
  });
});

describe("decideClaim — reject and insufficient", () => {
  it("requires a reason to reject", () => {
    expect(() =>
      decisions.decideClaim({
        claimId: pendingClaimId(),
        actorId: reviewerId,
        decision: "reject",
        note: "   ",
      }),
    ).toThrowError(decisions.DecisionError);
  });

  it("rejects with a reason and writes the event", () => {
    const claim = decisions.decideClaim({
      claimId: pendingClaimId(),
      actorId: reviewerId,
      decision: "reject",
      note: "The after photo shows a different spot.",
    });

    expect(claim.status).toBe("rejected");
    const event = latestEvent("claim.rejected");
    expect(JSON.parse(event?.payload ?? "{}")).toMatchObject({
      claimId: claim.id,
      note: "The after photo shows a different spot.",
    });
  });

  it("returns a claim as insufficient for more evidence", () => {
    const claim = decisions.decideClaim({
      claimId: pendingClaimId(),
      actorId: reviewerId,
      decision: "insufficient",
      note: "The region is too dark to read. Needs another photo.",
    });

    expect(claim.status).toBe("insufficient");

    const returned = queue.getReturnedClaims();
    expect(returned.map((item) => item.id)).toContain(claim.id);
    expect(returned.find((item) => item.id === claim.id)?.decision_note).toBe(
      "The region is too dark to read. Needs another photo.",
    );
  });
});

describe("editAndConfirmClaim", () => {
  it("creates a confirmed revision and supersedes the pending row in one transaction", () => {
    const claimId = pendingClaimId();
    const before = claims.getClaimSummary(claimId) as {
      text: string;
      revision: number;
    };

    const revised = decisions.editAndConfirmClaim({
      claimId,
      actorId: reviewerId,
      text: "A green glass bottle was removed from the rock line.",
      category: "Glass Beverage Bottles",
      note: "Corrected the category to glass.",
    });

    expect(revised.id).not.toBe(claimId);
    expect(revised.revision).toBe(before.revision + 1);
    expect(revised.supersedes_id).toBe(claimId);
    expect(revised.status).toBe("confirmed");
    expect(revised.collector_id).toBe(collectorId);
    expect(revised.decided_by).toBe(reviewerId);

    const old = claims.getClaimSummary(claimId);
    expect(old?.status).toBe("superseded");

    // Two events, one transaction: superseded + confirmed.
    const beforeConfirmed = eventCount("claim.confirmed");
    expect(latestEvent("claim.superseded")).toBeDefined();
    expect(eventCount("claim.confirmed")).toBe(beforeConfirmed);

    const confirmed = JSON.parse(
      latestEvent("claim.confirmed")?.payload ?? "{}",
    );
    expect(confirmed).toMatchObject({
      claimId: revised.id,
      supersedesId: claimId,
      editedFields: ["text", "category"],
    });

    const lineage = queue.getClaimLineage(revised.id);
    expect(lineage.map((item) => item.status)).toEqual([
      "superseded",
      "confirmed",
    ]);
  });

  it("refuses when nothing changed", () => {
    expect(() =>
      decisions.editAndConfirmClaim({
        claimId: pendingClaimId(),
        actorId: reviewerId,
        text: "A bottle was removed from the rock line.",
        category: "Beverage Bottles (Plastic)",
        note: null,
      }),
    ).toThrowError(/use Confirm instead/);
  });

  it("refuses to confirm when the pair is not comparable", async () => {
    const claimId = pendingClaimId();

    await comparability.setComparability({
      pairId,
      state: "not_comparable",
      reason: "Different patch of sand.",
      actorId: collectorId,
    });

    expect(() =>
      decisions.editAndConfirmClaim({
        claimId,
        actorId: reviewerId,
        text: "A corrected observation.",
        category: "Other Trash",
        note: null,
      }),
    ).toThrowError(/not comparable/i);
  });
});

describe("reviseClaim", () => {
  it("opens a draft revision while the confirmed claim stays in the record", () => {
    const confirmed = decisions.decideClaim({
      claimId: pendingClaimId(),
      actorId: reviewerId,
      decision: "confirm",
      note: null,
    });

    const revision = decisions.reviseClaim({
      claimId: confirmed.id,
      actorId: reviewerId,
    });

    expect(revision.status).toBe("draft");
    expect(revision.revision).toBe(confirmed.revision + 1);
    expect(revision.supersedes_id).toBe(confirmed.id);
    expect(revision.text).toBe(confirmed.text);
    expect(revision.decided_by).toBeNull();

    // The old claim is still confirmed — the export keeps it until the
    // revision itself is confirmed.
    expect(claims.getClaimSummary(confirmed.id)?.status).toBe("confirmed");

    expect(latestEvent("claim.revision_created")).toBeDefined();
  });

  it("supersedes the predecessor when the revision is confirmed", () => {
    const confirmed = decisions.decideClaim({
      claimId: pendingClaimId(),
      actorId: reviewerId,
      decision: "confirm",
      note: null,
    });

    const revision = decisions.reviseClaim({
      claimId: confirmed.id,
      actorId: reviewerId,
    });

    submission.submitPair({ pairId, actorId: collectorId });

    const decided = decisions.decideClaim({
      claimId: revision.id,
      actorId: reviewerId,
      decision: "confirm",
      note: null,
    });

    expect(decided.status).toBe("confirmed");
    expect(claims.getClaimSummary(confirmed.id)?.status).toBe("superseded");

    const event = latestEvent("claim.superseded");
    expect(JSON.parse(event?.payload ?? "{}")).toMatchObject({
      claimId: confirmed.id,
      supersededBy: revision.id,
    });
  });

  it("refuses to revise anything but a confirmed claim", () => {
    expect(() =>
      decisions.reviseClaim({
        claimId: pendingClaimId(),
        actorId: reviewerId,
      }),
    ).toThrowError(decisions.DecisionError);
  });
});

describe("the queue", () => {
  it("sits a not comparable claim above a plain one", async () => {
    // Isolated cleanup so no leftover pending claims from earlier tests.
    const queueUser = users.createUser({ displayName: "Sam Q.", role: "both" });
    const queueCleanup = cleanups.createCleanup({
      site: "South Beach",
      date: "2026-10-24",
      conditions: "Low tide.",
      publicNote: null,
      leadId: queueUser.id,
      consentVersion: "2026-10-24",
    });

    // First pair: plain claim, then marked not comparable.
    const pair1 = cleanups.createPair({
      cleanupId: queueCleanup.id,
      label: null,
      actorId: queueUser.id,
    });
    const before1 = await photos.ingestPhoto({
      pairId: pair1.id,
      side: "before",
      buffer: await makeJpeg(1600, 900, 3),
      peopleVisible: false,
      actorId: queueUser.id,
    });
    await photos.ingestPhoto({
      pairId: pair1.id,
      side: "after",
      buffer: await makeJpeg(1600, 900, 7),
      peopleVisible: false,
      actorId: queueUser.id,
    });
    claims.saveDraftClaim({
      pairId: pair1.id,
      photoId: before1.id,
      region: { x: 0.1, y: 0.2, w: 0.3, h: 0.3 },
      text: "A bottle was removed from the rock line.",
      category: "Beverage Bottles (Plastic)",
      actorId: queueUser.id,
    });
    await comparability.setComparability({
      pairId: pair1.id,
      state: "comparable",
      reason: null,
      actorId: queueUser.id,
    });
    submission.submitPair({ pairId: pair1.id, actorId: queueUser.id });

    // Second pair: plain comparable claim.
    const pair2 = cleanups.createPair({
      cleanupId: queueCleanup.id,
      label: "Second view",
      actorId: queueUser.id,
    });
    const before2 = await photos.ingestPhoto({
      pairId: pair2.id,
      side: "before",
      buffer: await makeJpeg(1600, 900, 11),
      peopleVisible: false,
      actorId: queueUser.id,
    });
    await photos.ingestPhoto({
      pairId: pair2.id,
      side: "after",
      buffer: await makeJpeg(1600, 900, 13),
      peopleVisible: false,
      actorId: queueUser.id,
    });
    claims.saveDraftClaim({
      pairId: pair2.id,
      photoId: before2.id,
      region: { x: 0.2, y: 0.2, w: 0.2, h: 0.2 },
      text: "A can was removed from the wrack line.",
      category: "Beverage Cans",
      actorId: queueUser.id,
    });
    await comparability.setComparability({
      pairId: pair2.id,
      state: "comparable",
      reason: null,
      actorId: queueUser.id,
    });
    submission.submitPair({ pairId: pair2.id, actorId: queueUser.id });

    // The first pair becomes not comparable after submission.
    await comparability.setComparability({
      pairId: pair1.id,
      state: "not_comparable",
      reason: "Different patch of sand.",
      actorId: queueUser.id,
    });

    const entries = queue.getReviewQueue(queueUser.id);

    const mine = entries.filter(
      (entry) => entry.claim.pair_id === pair1.id || entry.claim.pair_id === pair2.id,
    );
    expect(mine).toHaveLength(2);

    // The riskiest claim runs first; priorities never decrease down the list.
    const priorities = entries.map((entry) => entry.priority);
    for (let index = 1; index < priorities.length; index += 1) {
      expect(priorities[index]).toBeGreaterThanOrEqual(priorities[index - 1]);
    }
    expect(priorities[0]!).toBe(20); // not_comparable

    const first = mine.find((entry) => entry.claim.pair_id === pair1.id);
    const second = mine.find((entry) => entry.claim.pair_id === pair2.id);
    expect(first?.flags).toContain("not_comparable");
    expect(second?.flags).not.toContain("not_comparable");

    // not_comparable sorts above comparable when priorities differ.
    expect(first!.priority).toBeLessThan(second!.priority);

    // Reason text is visible without hovering — it is in the row data.
    expect(first?.claim.comparability_reason).toBe("Different patch of sand.");
  });
});
