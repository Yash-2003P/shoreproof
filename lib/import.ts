import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { z } from "zod";
import { createCleanup, createPair } from "./cleanups";
import { getDataDir, getDb } from "./db";
import { recordEvent } from "./events";
import {
  computeFramingSignal,
  computeFramingSignalFromBuffers,
  type FramingWord,
} from "./framing";
import { newId } from "./ids";
import { ingestPhoto } from "./photos";
import {
  BLUR_WARN_BELOW,
  EXPOSURE_WARN_ABOVE,
  MIN_LONG_EDGE,
  hammingDistance,
} from "./preflight-core";
import { preflightFromBuffer } from "./preflight";
import {
  PhotoError,
  sanitizePhoto,
  sha256,
  type SanitizedPhoto,
} from "./privacy";
import { deletePhotoFiles, photoPath } from "./storage";
import { createUser, getUserByDisplayName } from "./users";
import { CONSENT_VERSION, todayIso } from "./validation";
import type { Photo } from "./types";
import type { PreflightNumbers } from "./preflight-core";

export const IMPORT_SCHEMA = "shoreproof.import.v1";
export const MAX_IMPORT_PHOTO_BYTES = 20 * 1024 * 1024;

const MAX_MANIFEST_BYTES = 2 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export type ImportErrorCode =
  | "manifest_read"
  | "manifest_json"
  | "manifest_schema"
  | "manifest_future_date"
  | "photo_path"
  | "photo_missing"
  | "photo_symlink"
  | "photo_not_file"
  | "photo_too_large"
  | "photo_extension"
  | "photo_invalid"
  | "duplicate_pair"
  | "external_id_conflict"
  | "write_failed";

export class ImportError extends Error {
  code: ImportErrorCode;

  constructor(code: ImportErrorCode, message: string) {
    super(message);
    this.name = "ImportError";
    this.code = code;
  }
}

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, "Use a real calendar date.");

const photoPathSchema = z.string().min(1).max(500);

export const manifestSchema = z.strictObject({
  schema: z.literal(IMPORT_SCHEMA),
  cleanup: z.strictObject({
    external_id: z
      .string()
      .min(1)
      .max(80)
      .regex(
        /^[a-z0-9][a-z0-9-]*$/,
        "Use lowercase letters, digits, and hyphens only.",
      ),
    site: z.string().trim().min(1).max(120),
    date: isoDate,
    lead: z.string().trim().min(1).max(80),
    conditions: z.string().trim().max(2000).optional(),
    public_note: z.string().trim().max(2000).optional(),
  }),
  consent: z.strictObject({
    attested: z.literal(true),
    by: z.string().trim().min(1).max(80),
    note: z.string().trim().min(1).max(500),
  }),
  pairs: z
    .array(
      z.strictObject({
        label: z.string().trim().min(1).max(120),
        before: photoPathSchema,
        after: photoPathSchema,
        before_people_visible: z.boolean().default(false),
        after_people_visible: z.boolean().default(false),
      }),
    )
    .min(1)
    .max(50),
});

export type ImportManifest = z.infer<typeof manifestSchema>;

export type ImportPhotoSummary = {
  side: "before" | "after";
  /** Relative to the manifest directory, never an absolute path. */
  path: string;
  bytes: number;
  width: number;
  height: number;
  sha256: string;
  originalSha256: string;
  dhash: string;
  blurScore: number;
  exposureClipped: number;
  peopleVisible: boolean;
  warnings: string[];
};

export type ImportPairSummary = {
  label: string;
  before: ImportPhotoSummary;
  after: ImportPhotoSummary;
  framing: {
    score: number;
    gridSim: number;
    aspectSim: number;
    word: FramingWord;
  };
  warnings: string[];
};

export type ImportSummary = {
  status: "imported" | "dry_run" | "already_imported";
  cleanupId: string | null;
  externalId: string;
  site: string;
  date: string;
  lead: string;
  consentBy: string;
  manifestSha256: string;
  pairCount: number;
  photoCount: number;
  pairs: ImportPairSummary[];
  warnings: string[];
  nextPath: string | null;
};

type LoadedManifest = {
  manifestPath: string;
  manifestDir: string;
  raw: Buffer;
  manifestSha256: string;
  manifest: ImportManifest;
};

type ProcessedPhoto = {
  realPath: string;
  relativePath: string;
  side: "before" | "after";
  buffer: Buffer;
  sanitized: SanitizedPhoto;
  numbers: PreflightNumbers;
  peopleVisible: boolean;
};

type PlannedPhoto = ImportPhotoSummary & { realPath: string };

type PlannedPair = Omit<ImportPairSummary, "before" | "after"> & {
  before: PlannedPhoto;
  after: PlannedPhoto;
};

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error.";
}

function zodMessage(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const where = issue.path.length > 0 ? issue.path.join(".") : "manifest";
      return `${where}: ${issue.message}`;
    })
    .join("; ");
}

/**
 * Parse and validate the manifest before touching the database. Unknown keys
 * are rejected at every level, so a manifest cannot smuggle in claims,
 * observations, comparability, or review decisions.
 */
export function parseManifest(raw: string): ImportManifest {
  let value: unknown;
  try {
    value = JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch (error) {
    throw new ImportError(
      "manifest_json",
      `Manifest is not valid JSON: ${messageOf(error)}`,
    );
  }

  const parsed = manifestSchema.safeParse(value);
  if (!parsed.success) {
    throw new ImportError(
      "manifest_schema",
      `Manifest rejected: ${zodMessage(parsed.error)}`,
    );
  }

  if (parsed.data.cleanup.date > todayIso()) {
    throw new ImportError(
      "manifest_future_date",
      `Cleanup date ${parsed.data.cleanup.date} is in the future.`,
    );
  }

  return parsed.data;
}

function readManifest(manifestPath: string): LoadedManifest {
  const absolute = path.resolve(manifestPath);

  let stat: fs.Stats;
  try {
    stat = fs.statSync(absolute);
  } catch {
    throw new ImportError(
      "manifest_read",
      `Could not read the manifest at ${manifestPath}.`,
    );
  }

  if (!stat.isFile()) {
    throw new ImportError(
      "manifest_read",
      `The manifest path ${manifestPath} is not a file.`,
    );
  }

  if (stat.size > MAX_MANIFEST_BYTES) {
    throw new ImportError(
      "manifest_read",
      "The manifest is larger than 2 MB. A manifest is metadata, not a photo archive.",
    );
  }

  let raw: Buffer;
  try {
    raw = fs.readFileSync(absolute);
  } catch {
    throw new ImportError(
      "manifest_read",
      `Could not read the manifest at ${manifestPath}.`,
    );
  }

  const realManifest = fs.realpathSync(absolute);
  const manifest = parseManifest(raw.toString("utf8"));

  return {
    manifestPath: absolute,
    manifestDir: path.dirname(realManifest),
    raw,
    manifestSha256: sha256(raw),
    manifest,
  };
}

/**
 * Resolve a manifest-relative photo path without allowing an escape, an
 * absolute path, or a symlink in any component. The returned path is the real
 * path, checked to stay inside the manifest directory.
 */
function resolvePhotoPath(manifestDir: string, relative: string): string {
  if (relative.includes("\0")) {
    throw new ImportError("photo_path", "A photo path contains a null byte.");
  }

  if (path.isAbsolute(relative)) {
    throw new ImportError(
      "photo_path",
      `Photo "${relative}" is absolute. Use a path relative to the manifest.`,
    );
  }

  const normalized = path.normalize(relative);
  if (
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith(`..${path.sep}`)
  ) {
    throw new ImportError(
      "photo_path",
      `Photo "${relative}" escapes the manifest directory.`,
    );
  }

  const segments = relative.split(/[\\/]/);
  if (
    segments.some(
      (segment) => segment === "" || segment === "." || segment === "..",
    )
  ) {
    throw new ImportError(
      "photo_path",
      `Photo "${relative}" is not a clean relative path.`,
    );
  }

  let current = manifestDir;
  for (const segment of segments) {
    current = path.join(current, segment);
    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(current);
    } catch {
      throw new ImportError(
        "photo_missing",
        `Photo "${relative}" was not found next to the manifest.`,
      );
    }

    if (stat.isSymbolicLink()) {
      throw new ImportError(
        "photo_symlink",
        `Photo "${relative}" is a symlink. Symlinks are not allowed in an import.`,
      );
    }
  }

  const realDir = fs.realpathSync(manifestDir);
  let real: string;
  try {
    real = fs.realpathSync(current);
  } catch {
    throw new ImportError(
      "photo_missing",
      `Photo "${relative}" could not be resolved.`,
    );
  }

  if (real !== realDir && !real.startsWith(`${realDir}${path.sep}`)) {
    throw new ImportError(
      "photo_path",
      `Photo "${relative}" resolves outside the manifest directory.`,
    );
  }

  let stat: fs.Stats;
  try {
    stat = fs.statSync(real);
  } catch {
    throw new ImportError(
      "photo_missing",
      `Photo "${relative}" could not be read.`,
    );
  }

  if (!stat.isFile()) {
    throw new ImportError(
      "photo_not_file",
      `Photo "${relative}" is not a regular file.`,
    );
  }

  if (stat.size > MAX_IMPORT_PHOTO_BYTES) {
    throw new ImportError(
      "photo_too_large",
      `Photo "${relative}" is larger than 20 MB.`,
    );
  }

  const extension = path.extname(real).toLowerCase();
  if (!ACCEPTED_EXTENSIONS.has(extension)) {
    throw new ImportError(
      "photo_extension",
      `Photo "${relative}" must be a JPEG, PNG, or WebP file.`,
    );
  }

  return real;
}

async function processPhoto(input: {
  manifestDir: string;
  relative: string;
  side: "before" | "after";
  label: string;
  peopleVisible: boolean;
}): Promise<ProcessedPhoto> {
  const realPath = resolvePhotoPath(input.manifestDir, input.relative);

  let buffer: Buffer;
  try {
    buffer = fs.readFileSync(realPath);
  } catch {
    throw new ImportError(
      "photo_missing",
      `Photo "${input.relative}" could not be read.`,
    );
  }

  if (buffer.length > MAX_IMPORT_PHOTO_BYTES) {
    throw new ImportError(
      "photo_too_large",
      `Photo "${input.relative}" is larger than 20 MB.`,
    );
  }

  let sanitized: SanitizedPhoto;
  let numbers: PreflightNumbers;
  try {
    sanitized = await sanitizePhoto(buffer);
    numbers = await preflightFromBuffer(sanitized.data);
  } catch (error) {
    const detail =
      error instanceof PhotoError
        ? error.message
        : "The photo could not be read safely.";
    throw new ImportError(
      "photo_invalid",
      `Photo "${input.relative}" for "${input.label}": ${detail}`,
    );
  }

  return {
    realPath,
    relativePath: input.relative,
    side: input.side,
    buffer,
    sanitized,
    numbers,
    peopleVisible: input.peopleVisible,
  };
}

function photoWarnings(input: {
  side: "before" | "after";
  label: string;
  numbers: PreflightNumbers;
  peopleVisible: boolean;
}): string[] {
  const name = `${input.side === "before" ? "Before" : "After"} photo for "${input.label}"`;
  const warnings: string[] = [];

  if (input.numbers.longEdge < MIN_LONG_EDGE) {
    warnings.push(
      `${name} is ${input.numbers.width} × ${input.numbers.height}; the long edge is below 1,280 px.`,
    );
  }

  if (input.numbers.blurScore < BLUR_WARN_BELOW) {
    warnings.push(
      `${name} is soft (Laplacian ${Math.round(input.numbers.blurScore)}, warn below ${BLUR_WARN_BELOW}).`,
    );
  }

  if (input.numbers.exposureClipped > EXPOSURE_WARN_ABOVE) {
    warnings.push(
      `${name} is ${(input.numbers.exposureClipped * 100).toFixed(1)}% clipped (warn above 25%).`,
    );
  }

  if (input.peopleVisible) {
    warnings.push(
      `${name} is marked people-visible; confirmation, export, and publishing stay blocked until it is replaced.`,
    );
  }

  return warnings;
}

function toPhotoSummary(
  photo: ProcessedPhoto,
  warnings: string[],
): PlannedPhoto {
  return {
    side: photo.side,
    path: photo.relativePath,
    bytes: photo.sanitized.data.length,
    width: photo.numbers.width,
    height: photo.numbers.height,
    sha256: photo.sanitized.sha256,
    originalSha256: photo.sanitized.originalSha256,
    dhash: photo.numbers.dhash,
    blurScore: photo.numbers.blurScore,
    exposureClipped: photo.numbers.exposureClipped,
    peopleVisible: photo.peopleVisible,
    warnings,
    realPath: photo.realPath,
  };
}

function publicPhoto(photo: PlannedPhoto): ImportPhotoSummary {
  return {
    side: photo.side,
    path: photo.path,
    bytes: photo.bytes,
    width: photo.width,
    height: photo.height,
    sha256: photo.sha256,
    originalSha256: photo.originalSha256,
    dhash: photo.dhash,
    blurScore: photo.blurScore,
    exposureClipped: photo.exposureClipped,
    peopleVisible: photo.peopleVisible,
    warnings: photo.warnings,
  };
}

function publicPair(pair: PlannedPair): ImportPairSummary {
  return {
    label: pair.label,
    before: publicPhoto(pair.before),
    after: publicPhoto(pair.after),
    framing: pair.framing,
    warnings: pair.warnings,
  };
}

async function buildPlan(loaded: LoadedManifest): Promise<PlannedPair[]> {
  const pairs: PlannedPair[] = [];

  for (const pair of loaded.manifest.pairs) {
    const before = await processPhoto({
      manifestDir: loaded.manifestDir,
      relative: pair.before,
      side: "before",
      label: pair.label,
      peopleVisible: pair.before_people_visible,
    });
    const after = await processPhoto({
      manifestDir: loaded.manifestDir,
      relative: pair.after,
      side: "after",
      label: pair.label,
      peopleVisible: pair.after_people_visible,
    });

    if (
      before.sanitized.sha256 === after.sanitized.sha256 ||
      hammingDistance(before.numbers.dhash, after.numbers.dhash) === 0
    ) {
      throw new ImportError(
        "duplicate_pair",
        `Pair "${pair.label}" uses the same image for before and after. Replace one photo and try again.`,
      );
    }

    const framing = await computeFramingSignalFromBuffers(
      before.sanitized.data,
      after.sanitized.data,
    );

    const beforeWarnings = photoWarnings({
      side: "before",
      label: pair.label,
      numbers: before.numbers,
      peopleVisible: pair.before_people_visible,
    });
    const afterWarnings = photoWarnings({
      side: "after",
      label: pair.label,
      numbers: after.numbers,
      peopleVisible: pair.after_people_visible,
    });

    pairs.push({
      label: pair.label,
      before: toPhotoSummary(before, beforeWarnings),
      after: toPhotoSummary(after, afterWarnings),
      framing: {
        score: framing.score,
        gridSim: framing.gridSim,
        aspectSim: framing.aspectSim,
        word: framing.word,
      },
      warnings: [...beforeWarnings, ...afterWarnings],
    });
  }

  return pairs;
}

function buildSummary(
  loaded: LoadedManifest,
  status: ImportSummary["status"],
  cleanupId: string | null,
  pairs: PlannedPair[],
): ImportSummary {
  return {
    status,
    cleanupId,
    externalId: loaded.manifest.cleanup.external_id,
    site: loaded.manifest.cleanup.site,
    date: loaded.manifest.cleanup.date,
    lead: loaded.manifest.cleanup.lead,
    consentBy: loaded.manifest.consent.by,
    manifestSha256: loaded.manifestSha256,
    pairCount: loaded.manifest.pairs.length,
    photoCount: loaded.manifest.pairs.length * 2,
    pairs: pairs.map(publicPair),
    warnings: pairs.flatMap((pair) => pair.warnings),
    nextPath: cleanupId ? `/cleanups/${cleanupId}` : null,
  };
}

type ImportLookup = {
  alreadyImportedCleanupId: string | null;
  conflictingCleanupId: string | null;
};

function findImportState(
  manifestSha256: string,
  externalId: string,
): ImportLookup {
  const dbPath = path.join(getDataDir(), "shoreproof.db");
  if (!fs.existsSync(dbPath)) {
    return { alreadyImportedCleanupId: null, conflictingCleanupId: null };
  }

  let db: Database.Database;
  let shouldClose = false;
  try {
    db = new Database(dbPath, { readonly: true, fileMustExist: true });
    shouldClose = true;
  } catch {
    db = getDb();
  }

  try {
    const existing = db
      .prepare("SELECT cleanup_id FROM import_batches WHERE manifest_sha256 = ?")
      .get(manifestSha256) as { cleanup_id: string } | undefined;
    if (existing) {
      return {
        alreadyImportedCleanupId: existing.cleanup_id,
        conflictingCleanupId: null,
      };
    }

    const conflict = db
      .prepare("SELECT id FROM cleanups WHERE external_id = ?")
      .get(externalId) as { id: string } | undefined;

    return {
      alreadyImportedCleanupId: null,
      conflictingCleanupId: conflict?.id ?? null,
    };
  } finally {
    if (shouldClose) db.close();
  }
}

function resolveUser(displayName: string): { id: string; display_name: string } {
  const existing = getUserByDisplayName(displayName);
  if (existing) {
    return existing;
  }
  return createUser({ displayName, role: "collector" });
}

async function ingestPlannedPhoto(
  pairId: string,
  planned: PlannedPhoto,
  actorId: string,
): Promise<Photo> {
  let buffer: Buffer;
  try {
    buffer = fs.readFileSync(planned.realPath);
  } catch {
    throw new ImportError(
      "photo_missing",
      `Photo "${planned.path}" disappeared during the import.`,
    );
  }

  if (buffer.length > MAX_IMPORT_PHOTO_BYTES) {
    throw new ImportError(
      "photo_too_large",
      `Photo "${planned.path}" is larger than 20 MB.`,
    );
  }

  try {
    return await ingestPhoto({
      pairId,
      side: planned.side,
      buffer,
      peopleVisible: planned.peopleVisible,
      actorId,
    });
  } catch (error) {
    if (error instanceof PhotoError) {
      throw new ImportError(
        "photo_invalid",
        `Photo "${planned.path}": ${error.message}`,
      );
    }
    throw error;
  }
}

async function writeImport(
  loaded: LoadedManifest,
  pairs: PlannedPair[],
): Promise<ImportSummary> {
  const db = getDb();
  const createdPhotoIds: string[] = [];
  let cleanupId = "";

  // A manual transaction lets the async photo pipeline run inside one atomic
  // unit. better-sqlite3 turns the nested transactions inside ingestPhoto into
  // savepoints, and any failure rolls every row back.
  db.exec("BEGIN IMMEDIATE");

  try {
    const lead = resolveUser(loaded.manifest.cleanup.lead);
    const consent = resolveUser(loaded.manifest.consent.by);

    const cleanup = createCleanup({
      site: loaded.manifest.cleanup.site,
      date: loaded.manifest.cleanup.date,
      conditions: loaded.manifest.cleanup.conditions ?? null,
      publicNote: loaded.manifest.cleanup.public_note ?? null,
      leadId: lead.id,
      consentById: consent.id,
      consentVersion: CONSENT_VERSION,
      externalId: loaded.manifest.cleanup.external_id,
    });
    cleanupId = cleanup.id;

    for (const planned of pairs) {
      const pair = createPair({
        cleanupId,
        label: planned.label,
        actorId: lead.id,
      });

      const before = await ingestPlannedPhoto(pair.id, planned.before, lead.id);
      createdPhotoIds.push(before.id);
      const after = await ingestPlannedPhoto(pair.id, planned.after, lead.id);
      createdPhotoIds.push(after.id);

      if (
        before.sha256 !== planned.before.sha256 ||
        after.sha256 !== planned.after.sha256
      ) {
        throw new ImportError(
          "write_failed",
          `Photos for "${planned.label}" changed during the import. Run it again.`,
        );
      }

      if (
        before.sha256 === after.sha256 ||
        hammingDistance(before.dhash, after.dhash) === 0
      ) {
        throw new ImportError(
          "duplicate_pair",
          `Pair "${planned.label}" uses the same image for before and after.`,
        );
      }

      const framing = await computeFramingSignal(
        photoPath(before.id),
        photoPath(after.id),
      );
      const detail = {
        gridSim: framing.gridSim,
        aspectSim: framing.aspectSim,
        word: framing.word,
        computedAt: new Date().toISOString(),
      };

      db.prepare(
        "UPDATE pairs SET framing_score = ?, framing_detail = ? WHERE id = ?",
      ).run(framing.score, JSON.stringify(detail), pair.id);
    }

    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO import_batches (
         id, cleanup_id, manifest_sha256, pair_count, photo_count,
         actor_id, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      newId(),
      cleanupId,
      loaded.manifestSha256,
      pairs.length,
      pairs.length * 2,
      lead.id,
      now,
    );

    recordEvent({
      cleanupId,
      actorId: lead.id,
      type: "cleanup.imported",
      payload: {
        manifestSha256: loaded.manifestSha256,
        externalId: loaded.manifest.cleanup.external_id,
        pairCount: pairs.length,
        photoCount: pairs.length * 2,
      },
    });

    db.exec("COMMIT");
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // The transaction may already be closed; the original error is the one
      // worth reporting.
    }
    for (const id of createdPhotoIds) {
      deletePhotoFiles(id);
    }
    if (error instanceof ImportError) {
      throw error;
    }
    throw new ImportError(
      "write_failed",
      `Import failed and was rolled back: ${messageOf(error)}`,
    );
  }

  return buildSummary(loaded, "imported", cleanupId, pairs);
}

/**
 * Import a real cleanup from a manifest and a folder of photos. The importer
 * creates the cleanup, pairs, sanitized photos, preflight results, framing
 * signal, and an import audit row. It never creates claims, suggestions,
 * comparability, or review decisions.
 */
export async function runImport(input: {
  manifestPath: string;
  dryRun?: boolean;
}): Promise<ImportSummary> {
  const loaded = readManifest(input.manifestPath);
  const state = findImportState(
    loaded.manifestSha256,
    loaded.manifest.cleanup.external_id,
  );

  if (state.alreadyImportedCleanupId) {
    return buildSummary(
      loaded,
      "already_imported",
      state.alreadyImportedCleanupId,
      [],
    );
  }

  if (state.conflictingCleanupId) {
    throw new ImportError(
      "external_id_conflict",
      `External id "${loaded.manifest.cleanup.external_id}" already belongs to cleanup ${state.conflictingCleanupId}, imported from a different manifest. Use a new external_id or remove that record first.`,
    );
  }

  const pairs = await buildPlan(loaded);

  if (input.dryRun) {
    return buildSummary(loaded, "dry_run", null, pairs);
  }

  return writeImport(loaded, pairs);
}
