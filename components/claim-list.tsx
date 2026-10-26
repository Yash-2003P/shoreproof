"use client";

import { ClaimStatusChip } from "@/components/claim-status-chip";
import { formatTimestamp } from "@/lib/format";
import { formatRegion, regionFromRow } from "@/lib/region";
import type { ClaimSummary } from "@/lib/types";

export function ClaimList({
  claims,
  selectedId,
  onSelect,
}: {
  claims: ClaimSummary[];
  selectedId: string | null;
  onSelect: (claim: ClaimSummary) => void;
}) {
  if (claims.length === 0) {
    return (
      <div className="panel p-5">
        <h2 className="panel-title">Claims</h2>
        <p className="dense-text mt-2 text-ink">No claims yet.</p>
        <p className="mt-1 text-xs leading-5 text-muted">
          Mark a region on the before photo, then write one sentence about what
          you removed and from where. One observation = one region + one
          sentence + one category.
        </p>
      </div>
    );
  }

  return (
    <section className="panel" aria-labelledby="claims-heading">
      <div className="panel-header">
        <h2 id="claims-heading" className="panel-title">
          Claims
        </h2>
        <span className="mono text-xs text-muted">{claims.length} total</span>
      </div>

      <ul className="divide-y divide-line">
        {claims.map((claim, index) => {
          const region = regionFromRow(claim);
          const selected = claim.id === selectedId;

          return (
            <li key={claim.id}>
              <button
                type="button"
                onClick={() => onSelect(claim)}
                aria-pressed={selected}
                className={`w-full px-4 py-3.5 text-left transition-colors ${
                  selected ? "bg-wash" : "hover:bg-wash/60"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="mono text-xs text-muted">
                    C-{String(index + 1).padStart(2, "0")}
                  </span>
                  <ClaimStatusChip status={claim.status} />
                </div>

                <p className="mt-2 text-sm leading-6 text-ink">
                  {claim.text.trim().length > 0
                    ? claim.text
                    : "Awaiting observation — write what was removed."}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-xs text-muted">
                    {claim.category ?? "No category"}
                  </span>
                  {region ? (
                    <>
                      <span aria-hidden="true" className="text-line-strong">
                        ·
                      </span>
                      <span className="mono text-xs text-muted">
                        {formatRegion(region)}
                      </span>
                    </>
                  ) : null}
                </div>

                <p className="mt-1.5 text-xs text-muted">
                  {claim.collector_name} · {formatTimestamp(claim.created_at)}
                </p>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="border-t border-line px-4 py-3 text-xs leading-5 text-muted">
        Drafts are editable and removable. Confirmed claims are immutable;
        corrections create a new revision row.
      </p>
    </section>
  );
}
