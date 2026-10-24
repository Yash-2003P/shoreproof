import type { PairWithCounts } from "@/lib/types";

const comparabilityStyles: Record<
  NonNullable<PairWithCounts["comparability"]>,
  string
> = {
  comparable: "border-tide text-tide",
  partial: "border-flag text-flag-ink",
  not_comparable: "border-flag bg-flag/5 text-flag-ink",
};

const comparabilityLabel: Record<
  NonNullable<PairWithCounts["comparability"]>,
  string
> = {
  comparable: "Comparable",
  partial: "Partial",
  not_comparable: "Not comparable",
};

export function ComparabilityChip({
  value,
}: {
  value: PairWithCounts["comparability"];
}) {
  if (!value) {
    return <span className="chip text-muted">Not set</span>;
  }

  return (
    <span className={`chip ${comparabilityStyles[value]}`}>
      {comparabilityLabel[value]}
    </span>
  );
}
