import { getDb } from "./db";
import { recordEvent } from "./events";
import { getClaimSummary } from "./claims";
import { getCurrentBeforePhoto } from "./claims";
import { isIccCategory } from "./icc";
import { newId } from "./ids";
import { isValidRegion, type Region } from "./region";
import { mapCocoToIcc } from "./detector/icc";
import { cocoClassName } from "./detector/coco";
import type { ClaimSummary, Suggestion, SuggestionWithRun } from "./types";

export class SuggestionError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "SuggestionError";
    this.status = status;
  }
}

export type SaveSuggestionsInput = {
  pairId: string;
  photoId: string;
  model: string;
  modelSha256: string;
  runtimeMs: number;
  inputWidth: number;
  inputHeight: number;
  boxes: Array<{
    x: number;
    y: number;
    w: number;
    h: number;
    score: number;
    cocoId: number;
  }>;
};

const SUGGESTION_SELECT = `
  SELECT s.*, r.model, r.model_sha256, r.runtime_ms, r.input_width,
         r.input_height
    FROM suggestions s
    JOIN model_runs r ON r.id = s.run_id
`;

export function getSuggestionsForPhoto(photoId: string): SuggestionWithRun[] {
  return getDb()
    .prepare(
      `${SUGGESTION_SELECT} WHERE s.photo_id = ? ORDER BY s.created_at ASC, s.id ASC`,
    )
    .all(photoId) as SuggestionWithRun[];
}

export function getSuggestion(suggestionId: string): Suggestion | null {
  const row = getDb()
    .prepare("SELECT * FROM suggestions WHERE id = ?")
    .get(suggestionId) as Suggestion | undefined;
  return row ?? null;
}

export function saveSuggestions(input: SaveSuggestionsInput): SuggestionWithRun[] {
  if (!Number.isInteger(input.runtimeMs) || input.runtimeMs < 0) {
    throw new SuggestionError("The detector returned an invalid runtime.", 400);
  }
  if (input.inputWidth < 1 || input.inputHeight < 1) {
    throw new SuggestionError("The detector returned an invalid input size.", 400);
  }
  if (input.boxes.length > 20) {
    throw new SuggestionError("A run can save at most 20 candidate boxes.", 400);
  }

  const db = getDb();
  const pair = db
    .prepare(
      `SELECT p.id, p.cleanup_id, c.consent_attested_at
         FROM pairs p
         JOIN cleanups c ON c.id = p.cleanup_id
        WHERE p.id = ?`,
    )
    .get(input.pairId) as
    | { id: string; cleanup_id: string; consent_attested_at: string | null }
    | undefined;

  if (!pair) {
    throw new SuggestionError("Pair not found.", 404);
  }

  if (!pair.consent_attested_at) {
    throw new SuggestionError(
      "This cleanup has no consent attestation, so suggestions cannot be saved.",
      409,
    );
  }

  const before = getCurrentBeforePhoto(pair.id);
  if (!before) {
    throw new SuggestionError(
      "Add a before photo before running the detector.",
      409,
    );
  }

  if (before.id !== input.photoId) {
    throw new SuggestionError(
      "The before photo changed. Reload the workspace and run the detector again.",
      409,
    );
  }

  const rows = input.boxes.map((box) => {
    if (!isValidRegion({ x: box.x, y: box.y, w: box.w, h: box.h })) {
      throw new SuggestionError(
        "The detector returned a box outside the photo.",
        400,
      );
    }
    if (!Number.isFinite(box.score) || box.score < 0 || box.score > 1) {
      throw new SuggestionError(
        "The detector returned an invalid confidence score.",
        400,
      );
    }
    const cocoClass = cocoClassName(box.cocoId);
    if (!cocoClass) {
      throw new SuggestionError(
        "The detector returned an unknown class.",
        400,
      );
    }
    return { ...box, cocoClass };
  });

  const runId = newId();
  const now = new Date().toISOString();

  db.transaction(() => {
    db.prepare(
      `DELETE FROM suggestions WHERE photo_id = ? AND status = 'open'`,
    ).run(input.photoId);

    db.prepare(
      `INSERT INTO model_runs (
         id, photo_id, model, model_sha256, runtime_ms, box_count,
         input_width, input_height, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      runId,
      input.photoId,
      input.model,
      input.modelSha256,
      input.runtimeMs,
      rows.length,
      input.inputWidth,
      input.inputHeight,
      now,
    );

    const insert = db.prepare(
      `INSERT INTO suggestions (
         id, photo_id, run_id, x, y, w, h, coco_id, coco_class, confidence,
         icc_category, mapping_uncertain, status, edited, reject_reason,
         created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', 0, NULL, ?)`,
    );

    for (const row of rows) {
      const mapping = mapCocoToIcc(row.cocoId);
      insert.run(
        newId(),
        input.photoId,
        runId,
        row.x,
        row.y,
        row.w,
        row.h,
        row.cocoId,
        row.cocoClass,
        row.score,
        mapping.category,
        mapping.uncertain ? 1 : 0,
        now,
      );
    }

    recordEvent({
      cleanupId: pair.cleanup_id,
      actorId: null,
      type: "suggestions.saved",
      payload: {
        runId,
        pairId: pair.id,
        photoId: input.photoId,
        model: input.model,
        modelSha256: input.modelSha256,
        runtimeMs: input.runtimeMs,
        boxCount: rows.length,
      },
    });
  })();

  return getSuggestionsForPhoto(input.photoId);
}

export function acceptSuggestion(input: {
  suggestionId: string;
  actorId: string;
  category: string;
  region?: Region | null;
}): ClaimSummary {
  const db = getDb();
  const suggestion = getSuggestion(input.suggestionId);

  if (!suggestion) {
    throw new SuggestionError("That candidate box no longer exists.", 404);
  }

  if (suggestion.status !== "open") {
    throw new SuggestionError(
      "That candidate box was already accepted or rejected.",
      409,
    );
  }

  if (!isIccCategory(input.category)) {
    throw new SuggestionError(
      "Choose an ICC category before accepting this box.",
      400,
    );
  }

  const photoRow = db
    .prepare("SELECT pair_id FROM photos WHERE id = ?")
    .get(suggestion.photo_id) as { pair_id: string } | undefined;

  if (!photoRow) {
    throw new SuggestionError("The photo for that box no longer exists.", 404);
  }

  const before = getCurrentBeforePhoto(photoRow.pair_id);
  if (!before || before.id !== suggestion.photo_id) {
    throw new SuggestionError(
      "The before photo changed. Reload the workspace and run the detector again.",
      409,
    );
  }

  const region = input.region
    ? { ...input.region }
    : { x: suggestion.x, y: suggestion.y, w: suggestion.w, h: suggestion.h };

  if (!isValidRegion(region)) {
    throw new SuggestionError(
      "That box is not a valid region on the before photo.",
      400,
    );
  }

  const claimId = newId();
  const now = new Date().toISOString();

  const pairRow = db
    .prepare(
      `SELECT p.id AS pair_id, p.cleanup_id FROM pairs p
         JOIN photos ph ON ph.pair_id = p.id
        WHERE ph.id = ?`,
    )
    .get(suggestion.photo_id) as
    | { pair_id: string; cleanup_id: string }
    | undefined;

  if (!pairRow) {
    throw new SuggestionError("The photo for that box no longer exists.", 404);
  }

  const cleanupId = pairRow.cleanup_id;

  db.transaction(() => {
    db.prepare(
      `INSERT INTO claims (
         id, pair_id, photo_id, suggestion_id, x, y, w, h, text, category,
         status, revision, supersedes_id, collector_id, decided_by, decided_at,
         decision_note, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, 'draft', 1, NULL, ?, NULL, NULL,
         NULL, ?, ?)`,
    ).run(
      claimId,
      pairRow.pair_id,
      suggestion.photo_id,
      suggestion.id,
      region.x,
      region.y,
      region.w,
      region.h,
      input.category,
      input.actorId,
      now,
      now,
    );

    db.prepare(
      `UPDATE suggestions
          SET status = 'accepted', edited = ?, icc_category = ?
        WHERE id = ?`,
    ).run(
      input.region ? 1 : suggestion.edited,
      input.category,
      suggestion.id,
    );

    recordEvent({
      cleanupId,
      actorId: input.actorId,
      type: "suggestion.accepted",
      payload: {
        suggestionId: suggestion.id,
        claimId,
        photoId: suggestion.photo_id,
        cocoClass: suggestion.coco_class,
        confidence: suggestion.confidence,
        category: input.category,
        region,
        edited: input.region ? 1 : suggestion.edited,
      },
    });
  })();

  const summary = getClaimSummary(claimId);
  if (!summary) {
    throw new SuggestionError("The draft could not be read back.", 500);
  }
  return summary;
}

export function rejectSuggestion(input: {
  suggestionId: string;
  actorId: string;
  reason: string;
}): Suggestion {
  const db = getDb();
  const suggestion = getSuggestion(input.suggestionId);

  if (!suggestion) {
    throw new SuggestionError("That candidate box no longer exists.", 404);
  }

  if (suggestion.status !== "open") {
    throw new SuggestionError(
      "That candidate box was already accepted or rejected.",
      409,
    );
  }

  const reason = input.reason.trim();
  if (reason.length > 200) {
    throw new SuggestionError("Keep the reason under 200 characters.", 400);
  }

  const pairRow = db
    .prepare(
      `SELECT p.cleanup_id FROM pairs p
         JOIN photos ph ON ph.pair_id = p.id
        WHERE ph.id = ?`,
    )
    .get(suggestion.photo_id) as { cleanup_id: string } | undefined;

  db.transaction(() => {
    db.prepare(
      `UPDATE suggestions SET status = 'rejected', reject_reason = ? WHERE id = ?`,
    ).run(reason || null, suggestion.id);

    recordEvent({
      cleanupId: pairRow?.cleanup_id ?? "",
      actorId: input.actorId,
      type: "suggestion.rejected",
      payload: {
        suggestionId: suggestion.id,
        photoId: suggestion.photo_id,
        cocoClass: suggestion.coco_class,
        confidence: suggestion.confidence,
        reason: reason || null,
      },
    });
  })();

  return getSuggestion(suggestion.id) as Suggestion;
}
