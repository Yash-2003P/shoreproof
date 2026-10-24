import type { ClaimStatus } from "@/lib/types";

const LABELS: Record<ClaimStatus, string> = {
  draft: "Draft",
  pending: "Pending review",
  confirmed: "Confirmed",
  rejected: "Rejected",
  insufficient: "Sent back",
  superseded: "Superseded",
};

const CLASSES: Record<ClaimStatus, string> = {
  draft: "chip text-muted",
  pending: "chip chip-flag",
  confirmed: "chip chip-tide",
  rejected: "chip chip-flag",
  insufficient: "chip chip-flag",
  superseded: "chip text-muted",
};

export function ClaimStatusChip({ status }: { status: ClaimStatus }) {
  return <span className={CLASSES[status]}>{LABELS[status]}</span>;
}
