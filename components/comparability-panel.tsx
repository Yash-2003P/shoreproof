"use client";

import { useState, useTransition } from "react";
import { setComparability } from "@/app/(app)/cleanups/actions";
import type { ActionState } from "@/lib/validation";

type ComparabilityPanelProps = {
  pairId: string;
  state: "comparable" | "partial" | "not_comparable" | null;
  reason: string | null;
  framingScore: number | null;
  framingWord: string | null;
  bothPhotosReady: boolean;
};

const OPTIONS = [
  {
    value: "comparable",
    label: "Comparable",
    detail: "Both photos show the same spot clearly.",
  },
  {
    value: "partial",
    label: "Partially comparable",
    detail: "Same spot, but tide, light, or framing shifted.",
  },
  {
    value: "not_comparable",
    label: "Not comparable",
    detail: "The two photos cannot be read as the same spot.",
  },
] as const;

export function ComparabilityPanel({
  pairId,
  state,
  reason,
  framingScore,
  framingWord,
  bothPhotosReady,
}: ComparabilityPanelProps) {
  const [choice, setChoice] = useState<string>(state ?? "");
  const [why, setWhy] = useState(reason ?? "");
  const [status, setStatus] = useState<ActionState>({});
  const [pending, startSaving] = useTransition();

  const needsReason = choice === "partial" || choice === "not_comparable";

  function save() {
    if (!choice) return;

    const formData = new FormData();
    formData.set("pairId", pairId);
    formData.set("state", choice);
    formData.set("reason", why);

    startSaving(async () => {
      const result = await setComparability({}, formData);
      setStatus(result);
    });
  }

  return (
    <section className="panel" aria-label="Comparability">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <p className="field-label">Comparability</p>
        {state ? (
          <span className="chip chip-tide">
            {OPTIONS.find((option) => option.value === state)?.label}
          </span>
        ) : (
          <span className="chip text-muted">Not set</span>
        )}
      </div>

      <div className="px-4 py-3">
        <div className="border border-line bg-wash px-3 py-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="field-label">Framing signal</span>
            <span className="mono text-[11px] text-ink">
              {framingScore === null ? "—" : `${framingScore}/100`}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-4 text-muted">
            {framingWord
              ? `${framingWord}. A signal, not a verdict.`
              : "Add both photos to compute the signal."}
          </p>
        </div>

        {!bothPhotosReady ? (
          <p className="mt-3 text-[11px] leading-4 text-muted">
            Both photos are needed before comparability can be set.
          </p>
        ) : (
          <>
            <fieldset className="mt-3">
              <legend className="field-label">State</legend>
              <div className="mt-2 space-y-1.5">
                {OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-start gap-2 border px-2.5 py-2 text-[12px] leading-4 ${
                      choice === option.value
                        ? "border-tide bg-tide/5 text-ink"
                        : "border-line text-muted hover:border-tide/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`comparability-${pairId}`}
                      value={option.value}
                      checked={choice === option.value}
                      onChange={() => setChoice(option.value)}
                      className="mt-0.5 accent-[var(--tide)]"
                    />
                    <span>
                      <span className="block text-ink">{option.label}</span>
                      <span className="block text-[11px] text-muted">
                        {option.detail}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {needsReason ? (
              <>
                <label htmlFor="comparability-reason" className="field-label mt-3 block">
                  Reason
                </label>
                <textarea
                  id="comparability-reason"
                  value={why}
                  onChange={(event) => setWhy(event.target.value)}
                  rows={2}
                  maxLength={500}
                  className="textarea mt-1 min-h-[64px]"
                  placeholder="Tide was higher and the camera moved 2 m left."
                />
              </>
            ) : null}

            <button
              type="button"
              className="btn btn-primary mt-3"
              onClick={save}
              disabled={!choice || (needsReason && why.trim().length === 0) || pending}
            >
              {pending ? "Saving…" : "Save comparability"}
            </button>

            {status.message ? (
              <p
                className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted"
                role="status"
              >
                {status.message}
              </p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
