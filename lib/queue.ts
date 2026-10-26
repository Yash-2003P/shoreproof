import type {
  ClaimSummary,
  Pair,
  Photo,
  Suggestion,
} from "./types";

/**
 * The review queue. Nothing here decides anything: flags are text for a
 * human to read, and the order only puts the riskiest claims first.
 *
 * This module is intentionally free of database access so it can be imported
 * by client components.
 */

export type QueueFlagCode =
  | "no_region"
  | "not_comparable"
  | "people_visible"
  | "near_duplicate"
  | "absolute_wording"
  | "low_resolution"
  | "self_reviewed"
  | "ai_box_unedited";

/** Lower runs first. A claim with no flag sits at 100. */
export const FLAG_PRIORITY: Record<QueueFlagCode, number> = {
  no_region: 10,
  not_comparable: 20,
  people_visible: 25,
  near_duplicate: 30,
  absolute_wording: 40,
  low_resolution: 50,
  self_reviewed: 60,
  ai_box_unedited: 70,
};

export const NO_FLAG_PRIORITY = 100;

export const FLAG_LABELS: Record<QueueFlagCode, string> = {
  no_region: "no region",
  not_comparable: "not comparable",
  people_visible: "photo marked people-visible",
  near_duplicate: "near-duplicate",
  absolute_wording: "uses absolute language",
  low_resolution: "low resolution",
  self_reviewed: "same person collected and reviewed",
  ai_box_unedited: "accepted AI suggestion without edits",
};

/** Display order for the chips, matching the priority order. */
export const FLAG_ORDER: QueueFlagCode[] = (
  Object.keys(FLAG_PRIORITY) as QueueFlagCode[]
).sort((a, b) => FLAG_PRIORITY[a] - FLAG_PRIORITY[b]);

const ABSOLUTE_PATTERN =
  /\b(entire|all|none|every|completely|fully|clean)\b/i;

const MIN_LONG_EDGE = 1280;

export function usesAbsoluteWording(text: string): boolean {
  return ABSOLUTE_PATTERN.test(text);
}

export function isLowResolution(width: number, height: number): boolean {
  return Math.max(width, height) < MIN_LONG_EDGE;
}

export type FlagInput = {
  hasRegion: boolean;
  comparability: Pair["comparability"];
  anyPeopleVisible: boolean;
  nearDuplicate: boolean;
  text: string;
  photoWidth: number;
  photoHeight: number;
  collectorId: string;
  reviewerId: string;
  hasSuggestion: boolean;
  suggestionEdited: boolean;
};

export function computeFlags(input: FlagInput): QueueFlagCode[] {
  const flags: QueueFlagCode[] = [];

  if (!input.hasRegion) flags.push("no_region");
  if (input.comparability === "not_comparable") flags.push("not_comparable");
  if (input.anyPeopleVisible) flags.push("people_visible");
  if (input.nearDuplicate) flags.push("near_duplicate");
  if (usesAbsoluteWording(input.text)) flags.push("absolute_wording");
  if (isLowResolution(input.photoWidth, input.photoHeight)) {
    flags.push("low_resolution");
  }
  if (input.collectorId === input.reviewerId) flags.push("self_reviewed");
  if (input.hasSuggestion && !input.suggestionEdited) {
    flags.push("ai_box_unedited");
  }

  return flags;
}

export function priorityForFlags(flags: QueueFlagCode[]): number {
  if (flags.length === 0) return NO_FLAG_PRIORITY;
  return Math.min(...flags.map((flag) => FLAG_PRIORITY[flag]));
}

export function sortQueue(entries: QueueEntry[]): QueueEntry[] {
  return [...entries].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (a.claim.created_at !== b.claim.created_at) {
      return a.claim.created_at < b.claim.created_at ? -1 : 1;
    }
    return a.claim.id < b.claim.id ? -1 : a.claim.id > b.claim.id ? 1 : 0;
  });
}

/** A pending or decided claim with the context a reviewer needs. */
export type ReviewClaim = ClaimSummary & {
  pair_label: string;
  cleanup_id: string;
  cleanup_site: string;
  cleanup_date: string;
  comparability: Pair["comparability"];
  comparability_reason: string | null;
  framing_score: number | null;
  decided_by_name: string | null;
};

export type ClaimSuggestion = {
  id: string;
  cocoClass: string;
  confidence: number;
  iccCategory: string | null;
  mappingUncertain: boolean;
  edited: boolean;
  status: Suggestion["status"];
  model: string;
  modelSha256: string;
  runtimeMs: number;
  boxCount: number;
};

export type QueueEntry = {
  claim: ReviewClaim;
  before: Photo | null;
  after: Photo | null;
  suggestion: ClaimSuggestion | null;
  flags: QueueFlagCode[];
  priority: number;
};
