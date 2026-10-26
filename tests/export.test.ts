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
let exportModule: typeof import("../lib/export");
let publishing: typeof import("../lib/publishing");
let html: typeof import("../lib/html");
let storage: typeof import("../lib/storage");
let dbModule: typeof import("../lib/db");

let collectorId: string;
let reviewerId: string;
let cleanupId: string;
let seed = 1;

async function makeJpeg(width: number, height: number, salt: number) {
  const raw = Buffer.alloc(width * height * 3);
  for (let index = 0; index < raw.length; index += 1) {
    raw[index] = (index * salt * 31 + salt * 13) % 256;
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

async function seedPair(options?: {
  text?: string;
  category?: string;
  region?: { x: number; y: number; w: number; h: number };
  state?: "comparable" | "partial" | "not_comparable";
  peopleVisible?: boolean;
}) {
  const pair = cleanups.createPair({
    cleanupId,
    label: null,
    actorId: collectorId,
  });

  seed += 1;
  const before = await photos.ingestPhoto({
    pairId: pair.id,
    side: "before",
    buffer: await makeJpeg(1600, 900, seed),
    peopleVisible: options?.peopleVisible ?? false,
    actorId: collectorId,
  });

  seed += 1;
  const after = await photos.ingestPhoto({
    pairId: pair.id,
    side: "after",
    buffer: await makeJpeg(1600, 900, seed),
    peopleVisible: false,
    actorId: collectorId,
  });

  const claim = claims.saveDraftClaim({
    pairId: pair.id,
    photoId: before.id,
    region: options?.region ?? { x: 0.1, y: 0.2, w: 0.3, h: 0.3 },
    text: options?.text ?? "A bottle was removed from the rock line.",
    category: options?.category ?? "Beverage Bottles (Plastic)",
    actorId: collectorId,
  });

  const state = options?.state ?? "comparable";
  await comparability.setComparability({
    pairId: pair.id,
    state,
    reason: state === "comparable" ? null : "Different framing on the after photo.",
    actorId: collectorId,
  });

  submission.submitPair({ pairId: pair.id, actorId: collectorId });

  return {
    pairId: pair.id,
    beforeId: before.id,
    afterId: after.id,
    claimId: claim.id,
  };
}

function confirm(claimId: string, note: string | null = "Clear before and after.") {
  return decisions.decideClaim({
    claimId,
    actorId: reviewerId,
    decision: "confirm",
    note,
  });
}

beforeAll(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "shoreproof-export-"));
  process.env.DATA_DIR = dataDir;

  users = await import("../lib/users");
  cleanups = await import("../lib/cleanups");
  photos = await import("../lib/photos");
  claims = await import("../lib/claims");
  comparability = await import("../lib/comparability");
  submission = await import("../lib/submission");
  decisions = await import("../lib/decisions");
  exportModule = await import("../lib/export");
  publishing = await import("../lib/publishing");
  html = await import("../lib/html");
  storage = await import("../lib/storage");
  dbModule = await import("../lib/db");

  collectorId = users.createUser({ displayName: "Maya C.", role: "both" }).id;
  reviewerId = users.createUser({ displayName: "Jonas R.", role: "both" }).id;
});

beforeEach(() => {
  const cleanup = cleanups.createCleanup({
    site: "North Jetty",
    date: "2026-10-24",
    conditions: "Low tide, light west wind.",
    publicNote: "Trash line below the dune.",
    leadId: collectorId,
    consentVersion: "2026-10-24",
  });
  cleanupId = cleanup.id;
});

afterAll(() => {
  fs.rmSync(dataDir, { recursive: true, force: true });
});

describe("escapeHtml", () => {
  it("escapes the five dangerous characters", () => {
    expect(html.escapeHtml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;",
    );
  });

  it("escapes user strings in the standalone export", async () => {
    const { claimId } = await seedPair({
      text: `<script>alert("claim")</script>`,
      category: "Other Trash",
    });
    confirm(claimId);

    dbModule
      .getDb()
      .prepare("UPDATE cleanups SET site = ? WHERE id = ?")
      .run(`<b>North Jetty</b>`, cleanupId);

    const bundle = await exportModule.buildExportBundle(cleanupId, "export");
    const document = html.renderExportHtml(bundle);

    expect(document).toContain("&lt;script&gt;alert(&quot;claim&quot;)&lt;/script&gt;");
    expect(document).toContain("&lt;b&gt;North Jetty&lt;/b&gt;");
    expect(document).not.toContain("<script>alert");
    expect(document).not.toContain("<b>North Jetty</b>");
    expect(document).toContain('name="robots" content="noindex, nofollow"');
    expect(document).toContain("Conditions (internal):");
    expect(document).toContain("Low tide, light west wind.");
  });
});

describe("buildExportBundle", () => {
  it("matches every receipt hash and field to the stored rows", async () => {
    const { beforeId, claimId } = await seedPair();
    const confirmed = confirm(claimId);
    const photo = photos.getPhoto(beforeId);
    const bundle = await exportModule.buildExportBundle(cleanupId, "export");

    expect(bundle.schema).toBe("shoreproof.export.v1");
    expect(bundle.mode).toBe("export");
    expect(bundle.claims).toHaveLength(1);

    const receipt = bundle.claims[0];
    expect(receipt.claimId).toBe(confirmed.id);
    expect(receipt.revision).toBe(1);
    expect(receipt.source.photoId).toBe(beforeId);
    expect(receipt.source.sha256).toBe(photo?.sha256);
    expect(receipt.source.originalSha256).toBe(photo?.original_sha256);
    expect(receipt.source.width).toBe(photo?.width);
    expect(receipt.source.height).toBe(photo?.height);
    expect(receipt.checks.dhash).toBe(photo?.dhash);
    expect(receipt.checks.blurScore).toBe(photo?.blur_score);
    expect(receipt.checks.exposureClipped).toBe(photo?.exposure_clipped);
    expect(receipt.region).toEqual({ x: 0.1, y: 0.2, w: 0.3, h: 0.3 });
    expect(receipt.collector.displayName).toBe("Maya C.");
    expect(receipt.reviewer.displayName).toBe("Jonas R.");
    expect(receipt.decidedAt).toBe(confirmed.decided_at);
    expect(receipt.decisionNote).toBe("Clear before and after.");
    expect(receipt.comparability.state).toBe("comparable");
    expect(receipt.suggestion).toBeNull();
  });

  it("cuts a JPEG crop no larger than 640 px", async () => {
    const { claimId } = await seedPair();
    confirm(claimId);

    const bundle = await exportModule.buildExportBundle(cleanupId, "export");
    const dataUri = bundle.claims[0].cropDataUri;

    expect(dataUri.startsWith("data:image/jpeg;base64,")).toBe(true);
    const buffer = Buffer.from(dataUri.split(",")[1], "base64");
    expect(buffer[0]).toBe(0xff);
    expect(buffer[1]).toBe(0xd8);

    const metadata = await sharp(buffer).metadata();
    expect(metadata.format).toBe("jpeg");
    expect(Math.max(metadata.width ?? 0, metadata.height ?? 0)).toBeLessThanOrEqual(
      640,
    );
  });

  it("keeps rejected and returned claims in the appendix only", async () => {
    const confirmedPair = await seedPair({ text: "Confirmed claim stays." });
    const rejectedPair = await seedPair({ text: "Rejected claim leaves." });
    const returnedPair = await seedPair({ text: "Returned claim waits." });

    confirm(confirmedPair.claimId);
    decisions.decideClaim({
      claimId: rejectedPair.claimId,
      actorId: reviewerId,
      decision: "reject",
      note: "The after photo shows a different spot.",
    });
    decisions.decideClaim({
      claimId: returnedPair.claimId,
      actorId: reviewerId,
      decision: "insufficient",
      note: "The region is too dark to read.",
    });

    const exportBundle = await exportModule.buildExportBundle(
      cleanupId,
      "export",
    );
    expect(exportBundle.claims.map((item) => item.claimId)).toEqual([
      confirmedPair.claimId,
    ]);
    expect(exportBundle.excluded.map((item) => item.status).sort()).toEqual([
      "insufficient",
      "rejected",
    ]);
    expect(exportBundle.excluded.map((item) => item.text)).toEqual(
      expect.arrayContaining(["Rejected claim leaves.", "Returned claim waits."]),
    );
    expect(exportBundle.audit.some((entry) => entry.type === "claim.confirmed")).toBe(
      true,
    );
    expect(exportBundle.cleanup.conditions).toBe("Low tide, light west wind.");
    expect(exportBundle.claims[0].decisionNote).toBe("Clear before and after.");

    const publicBundle = await exportModule.buildExportBundle(
      cleanupId,
      "public",
    );
    expect(publicBundle.claims.map((item) => item.claimId)).toEqual([
      confirmedPair.claimId,
    ]);
    expect(publicBundle.excluded).toEqual([]);
    expect(publicBundle.audit).toEqual([]);
    expect(publicBundle.cleanup.conditions).toBeNull();
    expect(publicBundle.cleanup.publicNote).toBe("Trash line below the dune.");
    expect(publicBundle.claims[0].decisionNote).toBeNull();
  });

  it("puts a superseded revision in the appendix", async () => {
    const { claimId } = await seedPair();
    const first = confirm(claimId);
    const revision = decisions.reviseClaim({
      claimId: first.id,
      actorId: reviewerId,
    });

    submission.submitPair({
      pairId: revision.pair_id,
      actorId: collectorId,
    });

    decisions.decideClaim({
      claimId: revision.id,
      actorId: reviewerId,
      decision: "confirm",
      note: "Corrected wording.",
    });

    const bundle = await exportModule.buildExportBundle(cleanupId, "export");
    expect(bundle.claims.map((item) => item.claimId)).toEqual([revision.id]);
    expect(bundle.excluded.map((item) => item.claimId)).toContain(first.id);
    expect(bundle.excluded.find((item) => item.claimId === first.id)?.status).toBe(
      "superseded",
    );
  });
});

describe("exportBlockers", () => {
  it("is empty for a clean confirmed record", async () => {
    const { claimId } = await seedPair();
    confirm(claimId);

    expect(exportModule.exportBlockers(cleanupId)).toEqual([]);
    expect(exportModule.publicBlockers(cleanupId)).toEqual([]);
  });

  it("requires at least one confirmed claim only for public", async () => {
    expect(exportModule.exportBlockers(cleanupId)).toEqual([]);
    expect(exportModule.publicBlockers(cleanupId).map((item) => item.code)).toEqual([
      "no_confirmed_claims",
    ]);
  });

  it("blocks a people-visible photo in the pair", async () => {
    const { claimId, afterId } = await seedPair();
    confirm(claimId);

    photos.setPhotoPeopleVisible({
      photoId: afterId,
      peopleVisible: true,
      actorId: collectorId,
    });

    const codes = exportModule
      .exportBlockers(cleanupId)
      .map((item) => item.code);
    expect(codes).toContain("people_visible");
  });

  it("blocks a pair that was later marked not comparable", async () => {
    const { claimId, pairId } = await seedPair();
    confirm(claimId);

    await comparability.setComparability({
      pairId,
      state: "not_comparable",
      reason: "The camera pointed at a different patch of sand.",
      actorId: collectorId,
    });

    const blockers = exportModule.exportBlockers(cleanupId);
    expect(blockers.map((item) => item.code)).toContain("not_comparable");
    expect(blockers.find((item) => item.code === "not_comparable")?.message).toMatch(
      /different patch of sand/,
    );
  });

  it("blocks a confirmed claim whose source photo was superseded", async () => {
    const { claimId, beforeId } = await seedPair();
    confirm(claimId);

    dbModule
      .getDb()
      .prepare("UPDATE photos SET superseded_at = ? WHERE id = ?")
      .run(new Date().toISOString(), beforeId);

    expect(
      exportModule.exportBlockers(cleanupId).map((item) => item.code),
    ).toContain("source_superseded");
  });

  it("fails loudly when the sanitized source file is missing", async () => {
    const { claimId, beforeId } = await seedPair();
    confirm(claimId);
    fs.rmSync(storage.photoPath(beforeId));

    expect(
      exportModule.exportBlockers(cleanupId).map((item) => item.code),
    ).toContain("source_file_missing");

    await expect(
      exportModule.buildExportBundle(cleanupId, "export"),
    ).rejects.toThrow(/source file is missing/i);
  });

  it("blocks a confirmed claim that lost its region, text, or category", async () => {
    const { claimId } = await seedPair();
    confirm(claimId);

    dbModule
      .getDb()
      .prepare("UPDATE claims SET x = NULL, text = '', category = NULL WHERE id = ?")
      .run(claimId);

    const codes = exportModule
      .exportBlockers(cleanupId)
      .map((item) => item.code);
    expect(codes).toEqual(
      expect.arrayContaining(["region_missing", "text_missing", "category_missing"]),
    );
  });
});

describe("publishing", () => {
  it("rotates the slug on publish and unpublish and records both events", async () => {
    const { claimId } = await seedPair();
    confirm(claimId);

    const before = cleanups.getCleanup(cleanupId);
    expect(before?.public_enabled).toBe(0);

    const published = publishing.publishCleanup({
      cleanupId,
      actorId: reviewerId,
    });

    expect(published.public_enabled).toBe(1);
    expect(published.public_published_at).not.toBeNull();
    expect(published.public_slug).not.toBe(before?.public_slug);
    expect(publishing.getPublishedCleanupBySlug(published.public_slug)?.id).toBe(
      cleanupId,
    );
    expect(
      publishing.getPublishedCleanupBySlug(before?.public_slug ?? ""),
    ).toBeNull();

    const publishedEvent = latestEvent("public.published");
    expect(JSON.parse(publishedEvent?.payload ?? "{}")).toMatchObject({
      slug: published.public_slug,
      claimCount: 1,
    });

    const unpublished = publishing.unpublishCleanup({
      cleanupId,
      actorId: reviewerId,
    });

    expect(unpublished.public_enabled).toBe(0);
    expect(unpublished.public_slug).not.toBe(published.public_slug);
    expect(
      publishing.getPublishedCleanupBySlug(published.public_slug),
    ).toBeNull();

    const unpublishedEvent = latestEvent("public.unpublished");
    expect(JSON.parse(unpublishedEvent?.payload ?? "{}")).toMatchObject({
      previousSlug: published.public_slug,
    });
  });

  it("refuses to publish a record with no confirmed claims", async () => {
    expect(() =>
      publishing.publishCleanup({ cleanupId, actorId: reviewerId }),
    ).toThrowError(publishing.PublishingError);

    try {
      publishing.publishCleanup({ cleanupId, actorId: reviewerId });
    } catch (error) {
      expect((error as InstanceType<typeof publishing.PublishingError>).status).toBe(
        409,
      );
      expect(
        (error as InstanceType<typeof publishing.PublishingError>).blockers.map(
          (item) => item.code,
        ),
      ).toContain("no_confirmed_claims");
    }

    expect(cleanups.getCleanup(cleanupId)?.public_enabled).toBe(0);
  });

  it("refuses to publish a people-visible record", async () => {
    const { claimId, beforeId } = await seedPair();
    confirm(claimId);
    photos.setPhotoPeopleVisible({
      photoId: beforeId,
      peopleVisible: true,
      actorId: collectorId,
    });

    expect(() =>
      publishing.publishCleanup({ cleanupId, actorId: reviewerId }),
    ).toThrowError(/blockers/i);
    expect(cleanups.getCleanup(cleanupId)?.public_enabled).toBe(0);
  });
});

describe("recordExport", () => {
  it("writes the exports row and the append-only event", () => {
    const exportId = exportModule.recordExport({
      cleanupId,
      actorId: reviewerId,
      kind: "json",
      claimCount: 3,
    });

    const row = dbModule
      .getDb()
      .prepare("SELECT * FROM exports WHERE id = ?")
      .get(exportId) as
      | { cleanup_id: string; actor_id: string; kind: string }
      | undefined;

    expect(row).toMatchObject({
      cleanup_id: cleanupId,
      actor_id: reviewerId,
      kind: "json",
    });

    const event = latestEvent("export.downloaded");
    expect(JSON.parse(event?.payload ?? "{}")).toMatchObject({
      exportId,
      kind: "json",
      claimCount: 3,
    });
  });
});
