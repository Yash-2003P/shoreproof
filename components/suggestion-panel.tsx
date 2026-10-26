"use client";

import { useMemo, useState, useTransition } from "react";
import {
  acceptSuggestion,
  rejectSuggestion,
  saveSuggestions,
} from "@/app/(app)/cleanups/actions";
import { Disclosure } from "@/components/disclosure";
import { DETECTOR_DISCLOSURE, DETECTOR_MODEL } from "@/lib/detector/model";
import { detectCandidates } from "@/lib/detector/detect";
import { ICC_CATEGORIES } from "@/lib/icc";
import { formatRegion, type Region } from "@/lib/region";
import type { ClaimSummary, SuggestionWithRun } from "@/lib/types";
import type { ActionState } from "@/lib/validation";

const REJECT_REASONS = [
  "False positive",
  "Wrong category",
  "Duplicate of another box",
] as const;

type SuggestionPanelProps = {
  pairId: string;
  photoId: string | null;
  modelAvailable: boolean;
  initialSuggestions: SuggestionWithRun[];
  selectedSuggestionId: string | null;
  editedRegion: Region | null;
  onSuggestionsSaved: (suggestions: SuggestionWithRun[]) => void;
  onSuggestionAccepted: (claim: ClaimSummary, suggestionId: string) => void;
  onSuggestionRejected: (suggestionId: string) => void;
  onSelectSuggestion: (suggestion: SuggestionWithRun) => void;
};

export function SuggestionPanel({
  pairId,
  photoId,
  modelAvailable,
  initialSuggestions,
  selectedSuggestionId,
  editedRegion,
  onSuggestionsSaved,
  onSuggestionAccepted,
  onSuggestionRejected,
  onSelectSuggestion,
}: SuggestionPanelProps) {
  const [suggestions, setSuggestions] =
    useState<SuggestionWithRun[]>(initialSuggestions);
  const [categories, setCategories] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [state, setState] = useState<ActionState>({});
  const [running, startRunning] = useTransition();
  const [saving, startSaving] = useTransition();

  const open = useMemo(
    () => suggestions.filter((suggestion) => suggestion.status === "open"),
    [suggestions],
  );
  const accepted = suggestions.filter((s) => s.status === "accepted").length;
  const rejected = suggestions.filter((s) => s.status === "rejected").length;

  function categoryFor(suggestion: SuggestionWithRun): string {
    const chosen = categories[suggestion.id];
    if (typeof chosen === "string") return chosen;
    return suggestion.icc_category ?? "";
  }

  async function runDetector() {
    if (!photoId || running) return;

    startRunning(async () => {
      try {
        const result = await detectCandidates(photoId, (message) =>
          setStatus(message),
        );
        setStatus(null);

        const formData = new FormData();
        formData.set("pairId", pairId);
        formData.set("photoId", photoId);
        formData.set("model", DETECTOR_MODEL.name);
        formData.set("modelSha256", DETECTOR_MODEL.sha256);
        formData.set("runtimeMs", String(result.runtimeMs));
        formData.set("inputWidth", String(result.input[0]));
        formData.set("inputHeight", String(result.input[1]));
        formData.set(
          "boxes",
          JSON.stringify(
            result.boxes.map((box) => ({
              x: box.x,
              y: box.y,
              w: box.w,
              h: box.h,
              score: box.score,
              cocoId: box.cocoId,
            })),
          ),
        );

        startSaving(async () => {
          const response = await saveSuggestions({}, formData);
          setState(response);
          if (response.suggestions) {
            setSuggestions(response.suggestions);
            onSuggestionsSaved(response.suggestions);
          }
        });
      } catch (error) {
        setStatus(null);
        setState({
          message:
            error instanceof Error
              ? error.message
              : "The detector could not read this photo.",
        });
      }
    });
  }

  function accept(suggestion: SuggestionWithRun) {
    const category = categoryFor(suggestion);
    if (!category) return;

    const formData = new FormData();
    formData.set("suggestionId", suggestion.id);
    formData.set("category", category);

    if (selectedSuggestionId === suggestion.id && editedRegion) {
      formData.set("x", String(editedRegion.x));
      formData.set("y", String(editedRegion.y));
      formData.set("w", String(editedRegion.w));
      formData.set("h", String(editedRegion.h));
    }

    startSaving(async () => {
      const response = await acceptSuggestion({}, formData);
      setState(response);
      if (response.claim) {
        setSuggestions((current) =>
          current.map((item) =>
            item.id === suggestion.id
              ? { ...item, status: "accepted", icc_category: category }
              : item,
          ),
        );
        onSuggestionAccepted(response.claim, suggestion.id);
      }
    });
  }

  function reject(suggestion: SuggestionWithRun) {
    const formData = new FormData();
    formData.set("suggestionId", suggestion.id);
    formData.set("reason", reasons[suggestion.id] ?? "");

    startSaving(async () => {
      const response = await rejectSuggestion({}, formData);
      setState(response);
      setSuggestions((current) =>
        current.map((item) =>
          item.id === suggestion.id
            ? { ...item, status: "rejected", reject_reason: reasons[item.id] ?? "" }
            : item,
        ),
      );
      onSuggestionRejected(suggestion.id);
    });
  }

  const busy = running || saving;
  const meta =
    suggestions.length === 0
      ? "Optional · proposes boxes only"
      : `${open.length} open · ${accepted} accepted · ${rejected} rejected`;

  return (
    <Disclosure
      title="AI suggestions"
      meta={meta}
      defaultOpen={open.length > 0}
    >
      <p className="text-sm leading-6 text-muted">{DETECTOR_DISCLOSURE}</p>

      <button
        type="button"
        className="btn btn-ghost mt-3 w-full"
        onClick={runDetector}
        disabled={!photoId || !modelAvailable || busy}
      >
        {running
          ? "Running…"
          : modelAvailable
            ? "Suggest candidates"
            : "Detector not loaded"}
      </button>

      {!modelAvailable ? (
        <p className="mt-2 text-xs text-flag-ink">
          Detector not loaded. Check `npm run fetch-model`.
        </p>
      ) : null}

      {!photoId ? (
        <p className="mt-2 text-xs leading-5 text-muted">
          Add a before photo to run the detector.
        </p>
      ) : null}

      {status ? (
        <p className="mt-2 text-xs text-tide" role="status">
          {status}
        </p>
      ) : null}

      {state.message ? (
        <p className="mt-2 text-xs text-muted" role="status">
          {state.message}
        </p>
      ) : null}

      {suggestions.length > 0 ? (
        <p className="mono mt-2 text-xs leading-5 text-muted">
          {DETECTOR_MODEL.name} · {DETECTOR_MODEL.license} · sha256{" "}
          {DETECTOR_MODEL.sha256.slice(0, 12)}…
        </p>
      ) : null}

      {open.length === 0 && suggestions.length > 0 ? (
        <p className="mt-2 text-sm leading-6 text-muted">
          Every proposed box was answered. Mark anything the model missed.
        </p>
      ) : null}

      {open.length > 0 ? (
        <ul className="mt-4 divide-y divide-line border-t border-line">
          {open.map((suggestion) => {
            const chosen = categoryFor(suggestion);
            const uncertain = suggestion.mapping_uncertain === 1;
            const selected = selectedSuggestionId === suggestion.id;

            return (
              <li key={suggestion.id} className="py-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">
                    {suggestion.coco_class}{" "}
                    <span className="mono text-xs font-normal text-muted">
                      {suggestion.confidence.toFixed(2)}
                    </span>
                  </span>
                  {selected ? (
                    <span className="chip chip-tide">Editing</span>
                  ) : null}
                </div>

                <p className="mt-1 text-xs leading-5 text-muted">
                  {suggestion.icc_category
                    ? `${suggestion.icc_category}${uncertain ? "?" : ""}`
                    : "Unmapped — choose a category to accept"}
                </p>

                <label htmlFor={`category-${suggestion.id}`} className="sr-only">
                  Category for {suggestion.coco_class}
                </label>
                <select
                  id={`category-${suggestion.id}`}
                  className="select mt-2.5"
                  value={chosen}
                  onChange={(event) =>
                    setCategories((current) => ({
                      ...current,
                      [suggestion.id]: event.target.value,
                    }))
                  }
                >
                  <option value="">Choose a category</option>
                  {ICC_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!chosen || busy}
                    onClick={() => accept(suggestion)}
                  >
                    {selected ? "Accept edited box" : "Accept"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={busy}
                    onClick={() => onSelectSuggestion(suggestion)}
                  >
                    Edit box
                  </button>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <label htmlFor={`reason-${suggestion.id}`} className="sr-only">
                    Reason for rejecting {suggestion.coco_class}
                  </label>
                  <select
                    id={`reason-${suggestion.id}`}
                    className="select min-w-0 flex-1"
                    value={reasons[suggestion.id] ?? ""}
                    onChange={(event) =>
                      setReasons((current) => ({
                        ...current,
                        [suggestion.id]: event.target.value,
                      }))
                    }
                  >
                    <option value="">Reject reason…</option>
                    {REJECT_REASONS.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={busy}
                    onClick={() => reject(suggestion)}
                  >
                    Reject
                  </button>
                </div>

                {selected && editedRegion ? (
                  <p className="mono mt-2 text-xs text-muted">
                    Region {formatRegion(editedRegion)}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {suggestions.length > 0 ? (
        <p className="mt-3 border-t border-line pt-3 text-xs leading-5 text-muted">
          No accept-all. A box becomes a claim only when a human accepts it and
          writes the observation.
        </p>
      ) : null}
    </Disclosure>
  );
}
