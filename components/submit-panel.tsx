"use client";

import { useState, useTransition } from "react";
import { submitPair } from "@/app/(app)/cleanups/actions";
import type { PairBlocker } from "@/lib/comparability";
import type { ActionState } from "@/lib/validation";

type SubmitPanelProps = {
  pairId: string;
  blockers: PairBlocker[];
  submittedClaims: number;
};

export function SubmitPanel({
  pairId,
  blockers,
  submittedClaims,
}: SubmitPanelProps) {
  const [status, setStatus] = useState<ActionState>({});
  const [pending, startSubmitting] = useTransition();

  const hardBlockers = blockers.filter((blocker) => blocker.level === "blocker");
  const warnings = blockers.filter((blocker) => blocker.level === "warning");
  const alreadySubmitted = submittedClaims > 0;

  function submit() {
    const formData = new FormData();
    formData.set("pairId", pairId);

    startSubmitting(async () => {
      const result = await submitPair({}, formData);
      setStatus(result);
    });
  }

  return (
    <section className="panel" aria-label="Submit for review">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <p className="field-label">Submit for review</p>
        {alreadySubmitted ? (
          <span className="chip chip-tide">In review</span>
        ) : (
          <span className="chip text-muted">Not submitted</span>
        )}
      </div>

      <div className="px-4 py-3">
        {hardBlockers.length > 0 ? (
          <ul className="space-y-1.5">
            {hardBlockers.map((blocker) => (
              <li key={blocker.code} className="flex items-start gap-2 text-[12px] leading-4 text-ink">
                <span
                  aria-hidden="true"
                  className="mt-1 h-1.5 w-1.5 shrink-0 bg-flag"
                />
                {blocker.message}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[12px] leading-4 text-ink">
            Everything a reviewer needs is here: both photos, a comparability
            decision, and at least one complete claim.
          </p>
        )}

        {warnings.length > 0 ? (
          <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
            {warnings.map((warning) => (
              <li
                key={warning.code}
                className="flex items-start gap-2 text-[11px] leading-4 text-flag-ink"
              >
                <span
                  aria-hidden="true"
                  className="mt-1 h-1.5 w-1.5 shrink-0 bg-flag"
                />
                {warning.message}
              </li>
            ))}
          </ul>
        ) : null}

        <button
          type="button"
          className="btn btn-primary mt-3 w-full"
          onClick={submit}
          disabled={hardBlockers.length > 0 || pending}
        >
          {pending
            ? "Submitting…"
            : alreadySubmitted
              ? "Submit again"
              : "Submit for review"}
        </button>

        {alreadySubmitted ? (
          <p className="mt-2 text-[11px] leading-4 text-muted">
            {submittedClaims} {submittedClaims === 1 ? "claim is" : "claims are"}{" "}
            waiting for a reviewer. Submitted claims are locked for editing.
          </p>
        ) : null}

        {status.message ? (
          <p
            className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted"
            role="status"
          >
            {status.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
