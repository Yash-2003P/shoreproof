import { formatTimestamp } from "@/lib/format";
import { formatRegion } from "@/lib/region";
import type { Receipt as ReceiptData } from "@/lib/export";

function shortHash(hash: string, length = 20): string {
  return hash.length > length ? `${hash.slice(0, length)}…` : hash;
}

/**
 * One confirmed claim, rendered as a chain-of-custody receipt. The same
 * component serves the workspace preview and the public page; the public page
 * simply never receives excluded claims or audit rows.
 */
export function Receipt({
  receipt,
  index,
  showDecisionNote = true,
}: {
  receipt: ReceiptData;
  index: number;
  showDecisionNote?: boolean;
}) {
  const number = String(index + 1).padStart(2, "0");

  return (
    <article
      id={`claim-${receipt.claimId}`}
      className="receipt p-5 sm:p-6"
      aria-labelledby={`receipt-${receipt.claimId}-title`}
    >
      <span className="receipt-hole" aria-hidden="true" />
      <header className="flex flex-wrap items-center justify-between gap-3 pr-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          Receipt {number} · revision {receipt.revision}
        </p>
        <span className="stamp stamp-in">Confirmed</span>
      </header>

      <img
        src={receipt.cropDataUri}
        alt={`Sanitized crop of the marked region for receipt ${number}`}
        className="mt-4 h-auto w-full max-w-2xl border border-line bg-ink"
        width={640}
        height={Math.max(
          1,
          Math.round(
            (640 * receipt.region.h * receipt.source.height) /
              (receipt.region.w * receipt.source.width),
          ),
        )}
      />

      <h3
        id={`receipt-${receipt.claimId}-title`}
        className="mt-4 font-serif text-xl leading-snug text-ink"
      >
        {receipt.text}
      </h3>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-tide">
        {receipt.category}
      </p>

      <dl className="mt-4 grid gap-x-6 gap-y-3 border-t border-line pt-4 sm:grid-cols-2">
        <div>
          <dt className="field-label">Pair</dt>
          <dd className="mt-0.5 text-[13px] leading-5">{receipt.pairLabel}</dd>
        </div>
        <div>
          <dt className="field-label">Region</dt>
          <dd className="mt-0.5 font-mono text-[11px] leading-5">
            {formatRegion(receipt.region)}
          </dd>
        </div>
        <div>
          <dt className="field-label">Collector</dt>
          <dd className="mt-0.5 text-[13px] leading-5">
            {receipt.collector.displayName}
          </dd>
        </div>
        <div>
          <dt className="field-label">Reviewer</dt>
          <dd className="mt-0.5 text-[13px] leading-5">
            {receipt.reviewer.displayName}
          </dd>
        </div>
        <div>
          <dt className="field-label">Decided</dt>
          <dd className="mt-0.5 text-[13px] leading-5">
            {formatTimestamp(receipt.decidedAt)}
          </dd>
        </div>
        <div>
          <dt className="field-label">Comparability</dt>
          <dd className="mt-0.5 text-[13px] leading-5">
            {receipt.comparability.state === "partial"
              ? "Partially comparable"
              : "Comparable"}
            {receipt.comparability.reason
              ? ` — ${receipt.comparability.reason}`
              : ""}
          </dd>
        </div>
        {showDecisionNote ? (
          <div className="sm:col-span-2">
            <dt className="field-label">Decision note</dt>
            <dd className="mt-0.5 text-[13px] leading-5 text-muted">
              {receipt.decisionNote ?? "None"}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-4 border-l-[3px] border-tide bg-wash px-3.5 py-3">
        <p className="field-label">Sanitized source</p>
        <p
          className="mt-1 break-all font-mono text-[10px] leading-5 text-ink"
          title={receipt.source.sha256}
        >
          sha256 {receipt.source.sha256}
        </p>
        <p
          className="mt-1 break-all font-mono text-[10px] leading-5 text-ink"
          title={receipt.source.originalSha256}
        >
          original sha256 {receipt.source.originalSha256}{" "}
          <span className="text-muted">(upload discarded, never retained)</span>
        </p>
        <p className="mt-1 break-all font-mono text-[10px] leading-5 text-muted">
          dhash {receipt.checks.dhash} · blur{" "}
          {Math.round(receipt.checks.blurScore)} · clipped{" "}
          {(receipt.checks.exposureClipped * 100).toFixed(1)}% ·{" "}
          {receipt.checks.resolution[0]} × {receipt.checks.resolution[1]}
        </p>
      </div>

      <div className="mt-4 border-t border-line pt-3">
        {receipt.suggestion ? (
          <p className="text-xs leading-5 text-muted">
            {receipt.suggestion.model} proposed{" "}
            <strong className="font-medium text-ink">
              {receipt.suggestion.className}
            </strong>{" "}
            at {receipt.suggestion.confidence.toFixed(2)}. A human accepted the
            box {receipt.suggestion.edited ? "and edited it" : "without edits"}
            {receipt.suggestion.iccCategory
              ? `, mapped to ${receipt.suggestion.iccCategory}${
                  receipt.suggestion.mappingUncertain
                    ? " (mapping uncertain)"
                    : ""
                }`
              : ""}
            . Run {shortHash(receipt.suggestion.modelSha256, 12)}.
          </p>
        ) : (
          <p className="text-xs leading-5 text-muted">
            No AI suggestion. The region was marked by hand.
          </p>
        )}
      </div>
    </article>
  );
}