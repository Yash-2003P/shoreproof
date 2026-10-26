import { toPhotoSummary } from "./photos";
import type { PhotoSummary } from "./types";
import type { QueueEntry } from "./queue";
import type { ClaimStatus, ClaimSummary } from "./types";

export type ClaimLineageItem = {
  id: string;
  revision: number;
  status: ClaimStatus;
  text: string;
  decidedAt: string | null;
};

export type ClaimReviewData = {
  id: string;
  status: ClaimStatus;
  revision: number;
  text: string;
  category: string | null;
  region: { x: number; y: number; w: number; h: number } | null;
  collectorName: string;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
  pairLabel: string;
  site: string;
  cleanupDate: string;
  comparability: "comparable" | "partial" | "not_comparable" | null;
  comparabilityReason: string | null;
  framingScore: number | null;
  before: PhotoSummary | null;
  after: PhotoSummary | null;
  suggestion: {
    id: string;
    cocoClass: string;
    confidence: number;
    iccCategory: string | null;
    mappingUncertain: boolean;
    edited: boolean;
    status: string;
    model: string;
    modelSha256: string;
    runtimeMs: number;
    boxCount: number;
  } | null;
  flags: string[];
  lineage: ClaimLineageItem[];
};

export function toClaimReviewData(
  entry: QueueEntry,
  lineage: ClaimSummary[],
): ClaimReviewData {
  const claim = entry.claim;

  const lineageItems: ClaimLineageItem[] = lineage.map((item) => ({
    id: item.id,
    revision: item.revision,
    status: item.status,
    text: item.text,
    decidedAt: item.decided_at,
  }));

  return {
    id: claim.id,
    status: claim.status,
    revision: claim.revision,
    text: claim.text,
    category: claim.category,
    region:
      claim.x === null || claim.y === null || claim.w === null || claim.h === null
        ? null
        : { x: claim.x, y: claim.y, w: claim.w, h: claim.h },
    collectorName: claim.collector_name,
    decidedByName: claim.decided_by_name,
    decidedAt: claim.decided_at,
    decisionNote: claim.decision_note,
    createdAt: claim.created_at,
    pairLabel: claim.pair_label,
    site: claim.cleanup_site,
    cleanupDate: claim.cleanup_date,
    comparability: claim.comparability,
    comparabilityReason: claim.comparability_reason,
    framingScore: claim.framing_score,
    before: entry.before ? toPhotoSummary(entry.before) : null,
    after: entry.after ? toPhotoSummary(entry.after) : null,
    suggestion: entry.suggestion,
    flags: entry.flags,
    lineage: lineageItems,
  };
}
