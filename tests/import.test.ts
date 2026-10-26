import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

let dataDir: string;
let importsDir: string;
let importModule: typeof import("../lib/import");
let dbModule: typeof import("../lib/db");
let users: typeof import("../lib/users");
let storage: typeof import("../lib/storage");
let privacy: typeof import("../lib/privacy");

let imgA: Buffer;
let imgB: Buffer;
let imgC: Buffer;
let imgD: Buffer;
let smallA: Buffer;
let smallB: Buffer;

type PairSpec = {
  label: string;
  before: string;
  after: string;
  beforePeopleVisible?: boolean;
  afterPeopleVisible?: boolean;
};

async function makeJpeg(width: number, height: number, seed: number) {
  const raw = Buffer.alloc(width * height * 3);
  for (let index = 0; index < raw.length; index += 1) {
    raw[index] = (index * seed * 37 + seed * 13) % 256;
  }
  return sharp(raw, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 88 })
    .toBuffer();
}

async function withExif(buffer: Buffer) {
  return sharp(buffer)
    .withMetadata({
      exif: { IFD0: { ImageDescription: "ShoreProof import test" } },
    })
    .jpeg({ quality: 90 })
    .toBuffer();
}

async function writeImport(input: {
  name: string;
  externalId: string;
  photos: Record<string, Buffer>;
  pairs?: PairSpec[];
  date?: string;
  lead?: string;
  consentBy?: string;
  consentAttested?: boolean;
  omitConsent?: boolean;
  extraRoot?: Record<string, unknown>;
}) {
  const dir = fs.mkdtempSync(path.join(importsDir, `${input.name}-`));

  for (const [relative, buffer] of Object.entries(input.photos)) {
    const target = path.join(dir, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, buffer);
  }

  const pairs = input.pairs ?? [
    {
      label: "Rock line",
      before: "photos/pair-1-before.jpg",
      after: "photos/pair-1-after.jpg",
    },
  ];

  const manifest: Record<string, unknown> = {
    schema: "shoreproof.import.v1",
    cleanup: {
      external_id: input.externalId,
      site: "North Jetty",
      date: input.date ?? "2026-10-24",
      lead: input.lead ?? "Maya C.",
      conditions: "Low tide, overcast.",
      public_note: "Volunteers removed debris from the rock line.",
    },
    consent: {
      attested: input.consentAttested ?? true,
      by: input.consentBy ?? "Maya C.",
      note: "Photos taken by the cleanup lead; no identifiable people.",
    },
    pairs: pairs.map((pair) => ({
      label: pair.label,
      before: pair.before,
      after: pair.after,
      before_people_visible: pair.beforePeopleVisible ?? false,
      after_people_visible: pair.afterPeopleVisible ?? false,
    })),
    ...input.extraRoot,
  };

  if (input.omitConsent) {
    delete manifest.consent;
  }

  const manifestPath = path.join(dir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  return { dir, manifestPath };
}

function count(table: string): number {
  return (
    dbModule
      .getDb()
      .prepare(`SELECT COUNT(*) AS count FROM ${table}`)
      .get() as { count: number }
  ).count;
}

function snapshot() {
  return {
    cleanups: count("cleanups"),
    pairs: count("pairs"),
    photos: count("photos"),
    claims: count("claims"),
    suggestions: count("suggestions"),
    batches: count("import_batches"),
    events: count("events"),
  };
}

function cleanupByExternal(externalId: string) {
  return dbModule
    .getDb()
    .prepare("SELECT * FROM cleanups WHERE external_id = ?")
    .get(externalId) as
    | {
        id: string;
        lead_id: string;
        consent_attested_by: string;
        consent_version: string;
        public_enabled: number;
      }
    | undefined;
}

function countsForCleanup(cleanupId: string) {
  const db = dbModule.getDb();
  return {
    pairs: (
      db
        .prepare("SELECT COUNT(*) AS count FROM pairs WHERE cleanup_id = ?")
        .get(cleanupId) as { count: number }
    ).count,
    photos: (
      db
        .prepare(
          `SELECT COUNT(*) AS count
             FROM photos ph
             JOIN pairs p ON p.id = ph.pair_id
            WHERE p.cleanup_id = ?`,
        )
        .get(cleanupId) as { count: number }
    ).count,
    claims: (
      db
        .prepare(
          `SELECT COUNT(*) AS count
             FROM claims cl
             JOIN pairs p ON p.id = cl.pair_id
            WHERE p.cleanup_id = ?`,
        )
        .get(cleanupId) as { count: number }
    ).count,
    suggestions: (
      db
        .prepare(
          `SELECT COUNT(*) AS count
             FROM suggestions s
             JOIN photos ph ON ph.id = s.photo_id
             JOIN pairs p ON p.id = ph.pair_id
            WHERE p.cleanup_id = ?`,
        )
        .get(cleanupId) as { count: number }
    ).count,
  };
}

beforeAll(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "shoreproof-import-"));
  importsDir = fs.mkdtempSync(path.join(os.tmpdir(), "shoreproof-import-src-"));
  process.env.DATA_DIR = dataDir;

  importModule = await import("../lib/import");
  dbModule = await import("../lib/db");
  users = await import("../lib/users");
  storage = await import("../lib/storage");
  privacy = await import("../lib/privacy");

  imgA = await makeJpeg(1600, 900, 11);
  imgB = await makeJpeg(1600, 900, 23);
  imgC = await makeJpeg(1600, 900, 37);
  imgD = await makeJpeg(1600, 900, 41);
  smallA = await makeJpeg(800, 600, 53);
  smallB = await makeJpeg(800, 600, 67);
});

afterAll(() => {
  try {
    dbModule.getDb().close();
  } catch {
    // Already closed.
  }
  fs.rmSync(dataDir, { recursive: true, force: true });
  fs.rmSync(importsDir, { recursive: true, force: true });
});

describe("runImport", () => {
  it("imports a two-pair manifest with zero claims and zero suggestions", async () => {
    const { manifestPath } = await writeImport({
      name: "two-pair",
      externalId: "2026-10-24-north-jetty",
      pairs: [
        {
          label: "Rock line",
          before: "photos/a-before.jpg",
          after: "photos/a-after.jpg",
        },
        {
          label: "Wrack line",
          before: "photos/b-before.jpg",
          after: "photos/b-after.jpg",
        },
      ],
      photos: {
        "photos/a-before.jpg": imgA,
        "photos/a-after.jpg": imgB,
        "photos/b-before.jpg": imgC,
        "photos/b-after.jpg": imgD,
      },
    });

    const summary = await importModule.runImport({ manifestPath });

    expect(summary.status).toBe("imported");
    expect(summary.pairCount).toBe(2);
    expect(summary.photoCount).toBe(4);
    expect(summary.cleanupId).toBeTruthy();
    expect(summary.nextPath).toBe(`/cleanups/${summary.cleanupId}`);
    expect(summary.pairs).toHaveLength(2);
    expect(summary.pairs[0].framing.score).toBeGreaterThanOrEqual(0);
    expect(summary.pairs[0].framing.word).toBeTruthy();

    const cleanup = cleanupByExternal("2026-10-24-north-jetty");
    expect(cleanup).toBeTruthy();
    expect(cleanup?.id).toBe(summary.cleanupId);
    expect(cleanup?.public_enabled).toBe(0);
    expect(cleanup?.consent_version).toBe("2026-10-24");

    const db = dbModule.getDb();
    const pairs = db
      .prepare("SELECT * FROM pairs WHERE cleanup_id = ? ORDER BY created_at ASC")
      .all(cleanup?.id) as Array<{
      id: string;
      comparability: string | null;
      framing_score: number | null;
      framing_detail: string | null;
    }>;

    expect(pairs).toHaveLength(2);
    for (const pair of pairs) {
      expect(pair.comparability).toBeNull();
      expect(pair.framing_score).not.toBeNull();
      expect(JSON.parse(pair.framing_detail ?? "{}").word).toBeTruthy();
    }

    const photos = db
      .prepare(
        `SELECT ph.*
           FROM photos ph
           JOIN pairs p ON p.id = ph.pair_id
          WHERE p.cleanup_id = ?`,
      )
      .all(cleanup?.id) as Array<{
      id: string;
      sha256: string;
      original_sha256: string;
      people_visible: number;
    }>;

    expect(photos).toHaveLength(4);
    for (const photo of photos) {
      expect(photo.people_visible).toBe(0);
      expect(fs.existsSync(storage.photoPath(photo.id))).toBe(true);
      expect(fs.existsSync(storage.thumbPath(photo.id))).toBe(true);
      expect(privacy.sha256(fs.readFileSync(storage.photoPath(photo.id)))).toBe(
        photo.sha256,
      );
      expect(photo.original_sha256).not.toBe(photo.sha256);
    }

    expect(countsForCleanup(cleanup?.id ?? "")).toEqual({
      pairs: 2,
      photos: 4,
      claims: 0,
      suggestions: 0,
    });

    const batch = db
      .prepare("SELECT * FROM import_batches WHERE cleanup_id = ?")
      .get(cleanup?.id) as {
      manifest_sha256: string;
      pair_count: number;
      photo_count: number;
    };

    expect(batch.pair_count).toBe(2);
    expect(batch.photo_count).toBe(4);
    expect(batch.manifest_sha256).toHaveLength(64);

    const events = db
      .prepare(
        "SELECT * FROM events WHERE cleanup_id = ? AND type = 'cleanup.imported'",
      )
      .all(cleanup?.id) as Array<{ payload: string }>;

    expect(events).toHaveLength(1);
    expect(JSON.parse(events[0].payload).manifestSha256).toBe(
      batch.manifest_sha256,
    );
  });

  it("skips an already imported manifest without writing again", async () => {
    const { manifestPath } = await writeImport({
      name: "idempotent",
      externalId: "idempotent-import",
      photos: {
        "photos/pair-1-before.jpg": imgA,
        "photos/pair-1-after.jpg": imgB,
      },
    });

    const first = await importModule.runImport({ manifestPath });
    const before = snapshot();
    const second = await importModule.runImport({ manifestPath });

    expect(second.status).toBe("already_imported");
    expect(second.cleanupId).toBe(first.cleanupId);
    expect(second.pairs).toEqual([]);
    expect(snapshot()).toEqual(before);
  });

  it("rejects claims and review keys before any write", async () => {
    for (const key of ["claims", "observations", "comparability", "review"]) {
      const externalId = `forbidden-${key}`;
      const { manifestPath } = await writeImport({
        name: externalId,
        externalId,
        photos: {
          "photos/pair-1-before.jpg": imgA,
          "photos/pair-1-after.jpg": imgB,
        },
        extraRoot: { [key]: [] },
      });

      await expect(
        importModule.runImport({ manifestPath }),
      ).rejects.toMatchObject({ code: "manifest_schema" });
      expect(cleanupByExternal(externalId)).toBeUndefined();
    }
  });

  it("rejects absolute paths, parent escapes, and symlinks", async () => {
    const escape = await writeImport({
      name: "escape",
      externalId: "escape",
      pairs: [
        {
          label: "Escape",
          before: "../outside.jpg",
          after: "photos/pair-1-after.jpg",
        },
      ],
      photos: {
        "../outside.jpg": imgA,
        "photos/pair-1-after.jpg": imgB,
      },
    });

    await expect(
      importModule.runImport({ manifestPath: escape.manifestPath }),
    ).rejects.toMatchObject({ code: "photo_path" });

    const absolute = await writeImport({
      name: "absolute",
      externalId: "absolute",
      pairs: [
        {
          label: "Absolute",
          before: "/etc/hosts",
          after: "photos/pair-1-after.jpg",
        },
      ],
      photos: { "photos/pair-1-after.jpg": imgB },
    });

    await expect(
      importModule.runImport({ manifestPath: absolute.manifestPath }),
    ).rejects.toMatchObject({ code: "photo_path" });

    const link = await writeImport({
      name: "symlink",
      externalId: "symlink",
      pairs: [
        {
          label: "Symlink",
          before: "photos/link.jpg",
          after: "photos/pair-1-after.jpg",
        },
      ],
      photos: {
        "photos/real.jpg": imgA,
        "photos/pair-1-after.jpg": imgB,
      },
    });

    fs.symlinkSync(
      path.join(link.dir, "photos/real.jpg"),
      path.join(link.dir, "photos/link.jpg"),
    );

    await expect(
      importModule.runImport({ manifestPath: link.manifestPath }),
    ).rejects.toMatchObject({ code: "photo_symlink" });
  });

  it("rejects missing or unattested consent", async () => {
    const missing = await writeImport({
      name: "no-consent",
      externalId: "no-consent",
      omitConsent: true,
      photos: {
        "photos/pair-1-before.jpg": imgA,
        "photos/pair-1-after.jpg": imgB,
      },
    });

    await expect(
      importModule.runImport({ manifestPath: missing.manifestPath }),
    ).rejects.toMatchObject({ code: "manifest_schema" });

    const unattested = await writeImport({
      name: "unattested",
      externalId: "unattested",
      consentAttested: false,
      photos: {
        "photos/pair-1-before.jpg": imgA,
        "photos/pair-1-after.jpg": imgB,
      },
    });

    await expect(
      importModule.runImport({ manifestPath: unattested.manifestPath }),
    ).rejects.toMatchObject({ code: "manifest_schema" });
  });

  it("rejects a future cleanup date", async () => {
    const tomorrow = new Date(Date.now() + 86_400_000)
      .toISOString()
      .slice(0, 10);

    const { manifestPath } = await writeImport({
      name: "future",
      externalId: "future",
      date: tomorrow,
      photos: {
        "photos/pair-1-before.jpg": imgA,
        "photos/pair-1-after.jpg": imgB,
      },
    });

    await expect(
      importModule.runImport({ manifestPath }),
    ).rejects.toMatchObject({ code: "manifest_future_date" });
  });

  it("rejects a pair whose before and after are the same image", async () => {
    const { manifestPath } = await writeImport({
      name: "duplicate-pair",
      externalId: "duplicate-pair",
      pairs: [
        {
          label: "Duplicate",
          before: "photos/same.jpg",
          after: "photos/same.jpg",
        },
      ],
      photos: { "photos/same.jpg": imgA },
    });

    await expect(
      importModule.runImport({ manifestPath }),
    ).rejects.toMatchObject({ code: "duplicate_pair" });
    expect(cleanupByExternal("duplicate-pair")).toBeUndefined();
  });

  it("validates a dry run without writing anything", async () => {
    const { manifestPath } = await writeImport({
      name: "dry-run",
      externalId: "dry-run",
      pairs: [
        {
          label: "Low resolution",
          before: "photos/small-before.jpg",
          after: "photos/small-after.jpg",
          beforePeopleVisible: true,
        },
      ],
      photos: {
        "photos/small-before.jpg": smallA,
        "photos/small-after.jpg": smallB,
      },
    });

    const before = snapshot();
    const summary = await importModule.runImport({
      manifestPath,
      dryRun: true,
    });

    expect(summary.status).toBe("dry_run");
    expect(summary.cleanupId).toBeNull();
    expect(summary.pairs).toHaveLength(1);
    expect(summary.pairs[0].framing.score).toBeGreaterThanOrEqual(0);
    expect(summary.pairs[0].before.peopleVisible).toBe(true);
    expect(
      summary.warnings.some((warning) =>
        warning.includes("long edge is below 1,280 px"),
      ),
    ).toBe(true);
    expect(
      summary.warnings.some((warning) =>
        warning.includes("people-visible"),
      ),
    ).toBe(true);
    expect(snapshot()).toEqual(before);
    expect(cleanupByExternal("dry-run")).toBeUndefined();
  });

  it("resolves the lead and consenting person by display name", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
    const leadName = `Lead ${suffix}`;
    const consentName = `Consent ${suffix}`;
    const externalId = `people-${suffix}`;

    const { manifestPath } = await writeImport({
      name: "people",
      externalId,
      lead: leadName,
      consentBy: consentName,
      photos: {
        "photos/pair-1-before.jpg": imgA,
        "photos/pair-1-after.jpg": imgB,
      },
    });

    const summary = await importModule.runImport({ manifestPath });
    const cleanup = cleanupByExternal(externalId);
    const lead = users.getUserByDisplayName(leadName);
    const consent = users.getUserByDisplayName(consentName);

    expect(summary.lead).toBe(leadName);
    expect(summary.consentBy).toBe(consentName);
    expect(lead?.role).toBe("collector");
    expect(consent?.role).toBe("collector");
    expect(cleanup?.lead_id).toBe(lead?.id);
    expect(cleanup?.consent_attested_by).toBe(consent?.id);
  });

  it("rejects an external id reused by a different manifest", async () => {
    const first = await writeImport({
      name: "conflict-a",
      externalId: "same-external",
      photos: {
        "photos/pair-1-before.jpg": imgA,
        "photos/pair-1-after.jpg": imgB,
      },
    });
    await importModule.runImport({ manifestPath: first.manifestPath });

    const second = await writeImport({
      name: "conflict-b",
      externalId: "same-external",
      pairs: [
        {
          label: "A different rock line",
          before: "photos/pair-1-before.jpg",
          after: "photos/pair-1-after.jpg",
        },
      ],
      photos: {
        "photos/pair-1-before.jpg": imgC,
        "photos/pair-1-after.jpg": imgD,
      },
    });

    await expect(
      importModule.runImport({ manifestPath: second.manifestPath }),
    ).rejects.toMatchObject({ code: "external_id_conflict" });

    const rows = dbModule
      .getDb()
      .prepare("SELECT COUNT(*) AS count FROM cleanups WHERE external_id = ?")
      .get("same-external") as { count: number };
    expect(rows.count).toBe(1);
  });

  it("stores sanitized bytes with no EXIF and the original hash", async () => {
    const tagged = await withExif(imgA);
    const { manifestPath } = await writeImport({
      name: "exif",
      externalId: "exif",
      photos: {
        "photos/pair-1-before.jpg": tagged,
        "photos/pair-1-after.jpg": imgB,
      },
    });

    await importModule.runImport({ manifestPath });
    const cleanup = cleanupByExternal("exif");

    const before = dbModule
      .getDb()
      .prepare(
        `SELECT ph.*
           FROM photos ph
           JOIN pairs p ON p.id = ph.pair_id
          WHERE p.cleanup_id = ? AND ph.side = 'before'`,
      )
      .get(cleanup?.id) as {
      id: string;
      sha256: string;
      original_sha256: string;
    };

    const metadata = await sharp(
      fs.readFileSync(storage.photoPath(before.id)),
    ).metadata();

    expect(metadata.exif).toBeUndefined();
    expect((metadata as { gps?: Buffer }).gps).toBeUndefined();
    expect(before.original_sha256).toBe(privacy.sha256(tagged));
    expect(before.sha256).not.toBe(before.original_sha256);
  });

  it("rejects photos over 20 MB before reading them", async () => {
    const { dir, manifestPath } = await writeImport({
      name: "oversize",
      externalId: "oversize",
      photos: { "photos/pair-1-after.jpg": imgB },
    });

    const big = path.join(dir, "photos/pair-1-before.jpg");
    fs.writeFileSync(big, "");
    fs.truncateSync(big, importModule.MAX_IMPORT_PHOTO_BYTES + 1);

    await expect(
      importModule.runImport({ manifestPath }),
    ).rejects.toMatchObject({ code: "photo_too_large" });
  });

  it("rejects directories and unsupported extensions", async () => {
    const directory = await writeImport({
      name: "directory",
      externalId: "directory",
      pairs: [
        {
          label: "Directory",
          before: "photos",
          after: "photos/pair-1-after.jpg",
        },
      ],
      photos: { "photos/pair-1-after.jpg": imgB },
    });

    await expect(
      importModule.runImport({ manifestPath: directory.manifestPath }),
    ).rejects.toMatchObject({ code: "photo_not_file" });

    const extension = await writeImport({
      name: "extension",
      externalId: "extension",
      pairs: [
        {
          label: "Text",
          before: "photos/note.txt",
          after: "photos/pair-1-after.jpg",
        },
      ],
      photos: {
        "photos/note.txt": Buffer.from("not a photo"),
        "photos/pair-1-after.jpg": imgB,
      },
    });

    await expect(
      importModule.runImport({ manifestPath: extension.manifestPath }),
    ).rejects.toMatchObject({ code: "photo_extension" });
  });
});
