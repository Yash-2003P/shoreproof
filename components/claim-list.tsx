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
      <div className="panel p-4">
        <p className="field-label">Claims</p>
        <p className="mt-2 text-sm leading-6 text-ink">No claims yet.</p>
        <p className="mt-1 text-xs leading-5 text-muted">
          Mark a region on the before photo, then write one sentence about what
          you removed and from where. One observation = one region + one
          sentence + one category.
        </p>
      </div>
    );
  }

  return (
    <section className="panel" aria-label="Claims in this pair">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <p className="field-label">Claims</p>
        <span className="mono text-[10px] text-muted">
          {claims.length} total
        </span>
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
                className={`w-full px-4 py-3 text-left transition-colors ${
                  selected ? "bg-wash" : "hover:bg-wash/60"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="mono text-[10px] text-muted">
                    C-{String(index + 1).padStart(2, "0")}
                  </span>
                  <ClaimStatusChip status={claim.status} />
                </div>

                <p className="mt-1.5 text-sm leading-5 text-ink">
                  {claim.text}
                </p>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="mono text-[10px] text-muted">
                    {claim.category ?? "No category"}
                  </span>
                  {region ? (
                    <>
                      <span aria-hidden="true" className="text-line">
                        ·
                      </span>
                      <span className="mono text-[10px] text-muted">
                        {formatRegion(region)}
                      </span>
                    </>
                  ) : null}
                </div>

                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
                  {claim.collector_name} · {formatTimestamp(claim.created_at)}
                </p>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="border-t border-line px-4 py-2 text-[11px] leading-4 text-muted">
        Drafts are editable and removable. Confirmed claims are immutable;
        corrections create a new revision row.
      </p>
    </section>
  );
}
