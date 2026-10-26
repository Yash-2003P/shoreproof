"use client";

import { useState, useTransition } from "react";
import { submitPair } from "@/app/(app)/cleanups/actions";
import type { PairBlocker } from "@/lib/comparability";
import type { ActionState } from "@/lib/validation";

type SubmitPanelProps = {
  pairId: string;
  blockers: PairBlocker[];
  draftClaims: number;
  pendingClaims: number;
  confirmedClaims: number;
};

export function SubmitPanel({
  pairId,
  blockers,
  draftClaims,
  pendingClaims,
  confirmedClaims,
}: SubmitPanelProps) {
  const [status, setStatus] = useState<ActionState>({});
  const [pending, startSubmitting] = useTransition();

  const hardBlockers = blockers.filter((blocker) => blocker.level === "blocker");
  const warnings = blockers.filter((blocker) => blocker.level === "warning");
  const inReview = pendingClaims > 0;
  const hasDrafts = draftClaims > 0;
  const reviewed = !inReview && !hasDrafts && confirmedClaims > 0;
  const noClaims = !inReview && !hasDrafts && confirmedClaims === 0;
  const canSubmit = hardBlockers.length === 0 && hasDrafts;

  const label = inReview
    ? "In review"
    : hasDrafts
      ? "Drafts ready"
      : reviewed
        ? "Reviewed"
        : "No claims";

  function submit() {
    const formData = new FormData();
    formData.set("pairId", pairId);

    startSubmitting(async () => {
      const result = await submitPair({}, formData);
      setStatus(result);
    });
  }

  return (
    <section className="panel" aria-labelledby="submit-heading">
      <div className="panel-header">
        <h2 id="submit-heading" className="panel-title">
          Submit for review
        </h2>
        <span className={`chip ${reviewed ? "chip-tide" : "text-muted"}`}>
          {label}
        </span>
      </div>

      <div className="panel-body">
        {hardBlockers.length > 0 ? (
          <ul className="space-y-2">
            {hardBlockers.map((blocker) => (
              <li
                key={blocker.code}
                className="flex items-start gap-2.5 text-sm leading-6 text-ink"
              >
                <span
                  aria-hidden="true"
                  className="mt-2 h-2 w-2 shrink-0 bg-flag"
                />
                {blocker.message}
              </li>
            ))}
          </ul>
        ) : inReview ? (
          <p className="text-sm leading-6 text-ink">
            {pendingClaims} {pendingClaims === 1 ? "claim is" : "claims are"}{" "}
            waiting for a reviewer.
            {hasDrafts
              ? ` ${draftClaims} new ${
                  draftClaims === 1 ? "draft is" : "drafts are"
                } ready to submit.`
              : " Submitted claims are locked for editing."}
          </p>
        ) : hasDrafts ? (
          <p className="text-sm leading-6 text-ink">
            Everything a reviewer needs is here: both photos, a comparability
            decision, and {draftClaims === 1 ? "a complete claim" : "complete claims"}.
          </p>
        ) : reviewed ? (
          <p className="text-sm leading-6 text-ink">
            All claims in this pair have been reviewed. Confirmed claims are in
            the record; add a new draft to submit more evidence.
          </p>
        ) : (
          <p className="text-sm leading-6 text-ink">
            Mark at least one claim before submitting this pair.
          </p>
        )}

        {warnings.length > 0 ? (
          <ul className="mt-3 space-y-2 border-t border-line pt-3">
            {warnings.map((warning) => (
              <li
                key={warning.code}
                className="flex items-start gap-2.5 text-sm leading-6 text-flag-ink"
              >
                <span
                  aria-hidden="true"
                  className="mt-2 h-2 w-2 shrink-0 bg-flag"
                />
                {warning.message}
              </li>
            ))}
          </ul>
        ) : null}

        {hasDrafts ? (
          <button
            type="button"
            className="btn btn-primary mt-4 w-full"
            onClick={submit}
            disabled={!canSubmit || pending}
          >
            {pending
              ? "Submitting…"
              : inReview
                ? "Submit new drafts"
                : "Submit for review"}
          </button>
        ) : null}

        {noClaims && hardBlockers.length === 0 ? (
          <p className="mt-3 text-xs leading-5 text-muted">
            A pair is ready to submit when it has both photos, a comparability
            decision, and at least one complete claim.
          </p>
        ) : null}

        {status.message ? (
          <p className="mt-2 text-sm text-muted" role="status">
            {status.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
