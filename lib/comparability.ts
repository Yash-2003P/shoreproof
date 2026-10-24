import { getDb } from "./db";
import { recordEvent } from "./events";
import { computeFramingSignal } from "./framing";
import { getCurrentPhotos } from "./photos";
import { photoPath } from "./storage";
import { getClaimsForPair } from "./claims";
import { isValidRegion } from "./region";
import type { Pair } from "./types";

export type ComparabilityState = "comparable" | "partial" | "not_comparable";

export const COMPARABILITY_LABELS: Record<ComparabilityState, string> = {
  comparable: "Comparable",
  partial: "Partially comparable",
  not_comparable: "Not comparable",
};

export class ComparabilityError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ComparabilityError";
    this.status = status;
  }
}

export type PairBlocker = {
  code: string;
  message: string;
  level: "blocker" | "warning";
};

export type FramingDetail = {
  gridSim: number;
  aspectSim: number;
  word: string;
  computedAt: string;
};

export async function setComparability(input: {
  pairId: string;
  state: ComparabilityState;
  reason: string | null;
  actorId: string;
}): Promise<{
  state: ComparabilityState;
  reason: string | null;
  score: number;
  word: string;
}> {
  const db = getDb();
  const pair = db
    .prepare("SELECT * FROM pairs WHERE id = ?")
    .get(input.pairId) as Pair | undefined;

  if (!pair) {
    throw new ComparabilityError("Pair not found.", 404);
  }

  if (
    input.state !== "comparable" &&
    input.state !== "partial" &&
    input.state !== "not_comparable"
  ) {
    throw new ComparabilityError("Choose a comparability state.", 400);
  }

  const reason = input.reason?.trim() || null;

  if (input.state !== "comparable" && !reason) {
    throw new ComparabilityError(
      "Give a short reason for this comparability decision.",
      400,
    );
  }

  const photos = getCurrentPhotos(input.pairId);
  const before = photos.find((photo) => photo.side === "before");
  const after = photos.find((photo) => photo.side === "after");

  if (!before || !after) {
    throw new ComparabilityError(
      "Add both photos before setting comparability.",
      409,
    );
  }

  const signal = await computeFramingSignal(
    photoPath(before.id),
    photoPath(after.id),
  );
  const now = new Date().toISOString();

  const detail: FramingDetail = {
    gridSim: signal.gridSim,
    aspectSim: signal.aspectSim,
    word: signal.word,
    computedAt: now,
  };

  db.prepare(
    `UPDATE pairs
        SET comparability = ?, comparability_reason = ?, comparability_by = ?,
            comparability_at = ?, framing_score = ?, framing_detail = ?
      WHERE id = ?`,
  ).run(
    input.state,
    reason,
    input.actorId,
    now,
    signal.score,
    JSON.stringify(detail),
    input.pairId,
  );

  recordEvent({
    cleanupId: pair.cleanup_id,
    actorId: input.actorId,
    type: "comparability.set",
    payload: {
      pairId: pair.id,
      state: input.state,
      reason,
      framingScore: signal.score,
      framingWord: signal.word,
      gridSim: signal.gridSim,
      aspectSim: signal.aspectSim,
    },
  });

  return {
    state: input.state,
    reason,
    score: signal.score,
    word: signal.word,
  };
}

/**
 * The blockers that stand between this pair and a submission, plus the
 * warnings that will stop a reviewer from confirming later.
 */
export function getPairBlockers(pairId: string): PairBlocker[] {
  const db = getDb();
  const blockers: PairBlocker[] = [];

  const pair = db
    .prepare("SELECT * FROM pairs WHERE id = ?")
    .get(pairId) as Pair | undefined;

  if (!pair) {
    return [
      {
        code: "pair_missing",
        message: "Pair not found.",
        level: "blocker",
      },
    ];
  }

  const photos = getCurrentPhotos(pairId);
  const before = photos.find((photo) => photo.side === "before");
  const after = photos.find((photo) => photo.side === "after");

  if (!before) {
    blockers.push({
      code: "before_missing",
      message: "Add a before photo.",
      level: "blocker",
    });
  }

  if (!after) {
    blockers.push({
      code: "after_missing",
      message: "Add an after photo.",
      level: "blocker",
    });
  }

  if (!pair.comparability) {
    blockers.push({
      code: "comparability_missing",
      message: "Set comparability.",
      level: "blocker",
    });
  }

  const claims = getClaimsForPair(pairId);

  if (claims.length === 0) {
    blockers.push({
      code: "claims_missing",
      message: "Mark at least one claim.",
      level: "blocker",
    });
  }

  const incomplete = claims.filter(
    (claim) =>
      claim.status === "draft" &&
      (claim.text.trim().length === 0 ||
        !claim.category ||
        !isValidRegion({
          x: claim.x ?? -1,
          y: claim.y ?? -1,
          w: claim.w ?? 0,
          h: claim.h ?? 0,
        })),
  );

  if (incomplete.length > 0) {
    blockers.push({
      code: "claims_incomplete",
      message: `${incomplete.length} ${incomplete.length === 1 ? "claim is" : "claims are"} missing an observation, a category, or a region.`,
      level: "blocker",
    });
  }

  const peopleVisible = photos.filter((photo) => photo.people_visible === 1);
  if (peopleVisible.length > 0) {
    blockers.push({
      code: "people_visible",
      message:
        "A current photo is marked people visible. It blocks confirmation, export, and publishing.",
      level: "warning",
    });
  }

  if (pair.comparability === "not_comparable") {
    blockers.push({
      code: "not_comparable",
      message:
        "Not comparable blocks confirmation. Change the state with a reason before a claim can be confirmed.",
      level: "warning",
    });
  }

  return blockers;
}

export function getPairFramingDetail(pairId: string): FramingDetail | null {
  const row = getDb()
    .prepare("SELECT framing_detail FROM pairs WHERE id = ?")
    .get(pairId) as { framing_detail: string | null } | undefined;

  if (!row?.framing_detail) return null;

  try {
    return JSON.parse(row.framing_detail) as FramingDetail;
  } catch {
    return null;
  }
}
