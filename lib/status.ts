import type { CleanupStatus } from "./types";

export type StatusCounts = {
  pending: number;
  insufficient: number;
  confirmed: number;
  rejected: number;
  exports: number;
};

export function deriveCleanupStatus(counts: StatusCounts): CleanupStatus {
  if (counts.exports > 0) return "exported";
  if (counts.pending + counts.insufficient > 0) return "in_review";
  if (counts.confirmed + counts.rejected > 0) return "reviewed";
  return "draft";
}

export const cleanupStatusLabel: Record<CleanupStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  reviewed: "Reviewed",
  exported: "Exported",
};

export const roleLabel = {
  collector: "Collector",
  reviewer: "Reviewer",
  both: "Collector + reviewer",
} as const;
