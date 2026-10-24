import type { CleanupStatus } from "@/lib/types";
import { cleanupStatusLabel } from "@/lib/status";

const statusStyles: Record<CleanupStatus, string> = {
  draft: "border-line text-muted",
  in_review: "border-tide bg-tide/5 text-tide",
  reviewed: "border-tide bg-tide text-salt",
  exported: "border-ink bg-ink text-salt",
};

export function StatusChip({ status }: { status: CleanupStatus }) {
  return (
    <span className={`chip ${statusStyles[status]}`}>
      {cleanupStatusLabel[status]}
    </span>
  );
}

export function PublicChip({ published }: { published: boolean }) {
  return published ? (
    <span className="chip chip-tide">Published</span>
  ) : (
    <span className="chip text-muted">Not published</span>
  );
}
