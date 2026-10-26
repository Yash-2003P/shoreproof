"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  deleteClaimDraft,
  saveClaim,
} from "@/app/(app)/cleanups/actions";
import { ClaimStatusChip } from "@/components/claim-status-chip";
import { ICC_CATEGORIES } from "@/lib/icc";
import { formatTimestamp } from "@/lib/format";
import { formatRegion, type Region } from "@/lib/region";
import type { ClaimSummary } from "@/lib/types";
import type { ActionState } from "@/lib/validation";

type ClaimFormProps = {
  pairId: string;
  photoId: string | null;
  selectedClaim: ClaimSummary | null;
  region: Region | null;
  text: string;
  category: string;
  onTextChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onMarkFull: () => void;
  onClearRegion: () => void;
  onSaved: (claim: ClaimSummary) => void;
  onDeleted: (claimId: string) => void;
};

export function ClaimForm({
  pairId,
  photoId,
  selectedClaim,
  region,
  text,
  category,
  onTextChange,
  onCategoryChange,
  onMarkFull,
  onClearRegion,
  onSaved,
  onDeleted,
}: ClaimFormProps) {
  const [state, setState] = useState<ActionState>({});
  const [pending, startSaving] = useTransition();
  const [deleting, startDeleting] = useTransition();

  const readOnly = Boolean(selectedClaim && selectedClaim.status !== "draft");
  const editingDraft = selectedClaim?.status === "draft";
  const trimmed = text.trim();
  const canSave =
    Boolean(photoId) &&
    Boolean(region) &&
    trimmed.length > 0 &&
    trimmed.length <= 280 &&
    category.length > 0 &&
    !readOnly &&
    !pending;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;

    const formData = new FormData(event.currentTarget);
    startSaving(async () => {
      const result = await saveClaim({}, formData);
      setState(result);
      if (result.claim) {
        onSaved(result.claim);
      }
    });
  }

  function handleDelete() {
    if (!selectedClaim || selectedClaim.status !== "draft") return;

    const formData = new FormData();
    formData.set("claimId", selectedClaim.id);
    startDeleting(async () => {
      const result = await deleteClaimDraft({}, formData);
      setState(result);
      if (result.deletedClaimId) {
        onDeleted(result.deletedClaimId);
      }
    });
  }

  if (!photoId) {
    return (
      <section className="panel" aria-labelledby="claim-heading">
        <div className="panel-header">
          <h2 id="claim-heading" className="panel-title">
            Claim
          </h2>
          <span className="chip text-muted">Before photo needed</span>
        </div>
        <div className="panel-body">
          <p className="dense-text text-ink">
            Add a before photo to mark a claim.
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            The before photo is the claim source. Every region is stored
            relative to it.
          </p>
        </div>
      </section>
    );
  }

  if (readOnly && selectedClaim) {
    const selectedRegion = region;
    return (
      <section className="panel" aria-labelledby="claim-heading">
        <div className="panel-header">
          <h2 id="claim-heading" className="panel-title">
            Claim
          </h2>
          <ClaimStatusChip status={selectedClaim.status} />
        </div>
        <div className="panel-body">
          <p className="body-text text-ink">{selectedClaim.text}</p>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4">
            <div>
              <dt className="field-label">Category</dt>
              <dd className="mt-0.5 text-sm text-ink">
                {selectedClaim.category ?? "None"}
              </dd>
            </div>
            <div>
              <dt className="field-label">Region</dt>
              <dd className="mono mt-0.5 text-sm text-ink">
                {selectedRegion ? formatRegion(selectedRegion) : "No region"}
              </dd>
            </div>
            <div>
              <dt className="field-label">Collector</dt>
              <dd className="mt-0.5 text-sm text-ink">
                {selectedClaim.collector_name}
              </dd>
            </div>
            <div>
              <dt className="field-label">Saved</dt>
              <dd className="mt-0.5 text-sm text-ink">
                {formatTimestamp(selectedClaim.created_at)}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-5 text-muted">
            Confirmed claims are immutable. A correction creates a new revision
            row; it never edits this evidence.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel" aria-labelledby="claim-heading">
      <div className="panel-header">
        <h2 id="claim-heading" className="panel-title">
          Claim
        </h2>
        <span className="chip text-muted">
          {editingDraft ? "Editing draft" : "New draft"}
        </span>
      </div>

      <div className="panel-body">
        <form onSubmit={handleSubmit}>
          <input type="hidden" name="pairId" value={pairId} />
          <input type="hidden" name="photoId" value={photoId} />
          {editingDraft && selectedClaim ? (
            <input type="hidden" name="claimId" value={selectedClaim.id} />
          ) : null}
          <input type="hidden" name="x" value={region?.x ?? ""} />
          <input type="hidden" name="y" value={region?.y ?? ""} />
          <input type="hidden" name="w" value={region?.w ?? ""} />
          <input type="hidden" name="h" value={region?.h ?? ""} />

          <div className="border border-line bg-wash px-3.5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="field-label">Marked region</p>
                <p className="mono mt-0.5 text-sm text-ink">
                  {region ? formatRegion(region) : "No region marked"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={onMarkFull}
                >
                  Mark full photo
                </button>
                {region ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={onClearRegion}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          {state.errors?.region ? (
            <p className="field-error" role="alert">
              {state.errors.region}
            </p>
          ) : null}

          <label htmlFor="claim-text" className="field-label mt-5 block">
            Observation
          </label>
          <textarea
            id="claim-text"
            name="text"
            value={text}
            onChange={(event) => onTextChange(event.target.value)}
            maxLength={280}
            rows={4}
            className="textarea mt-1.5"
            placeholder="What did you remove, from where?"
            aria-describedby="claim-text-help"
          />
          <div className="mt-1.5 flex items-start justify-between gap-3">
            <p id="claim-text-help" className="text-xs leading-5 text-muted">
              One plain sentence. This will be public if the claim is confirmed.
            </p>
            <span
              className={`mono shrink-0 text-xs ${
                trimmed.length > 280 ? "text-flag-ink" : "text-muted"
              }`}
            >
              {trimmed.length}/280
            </span>
          </div>
          {state.errors?.text ? (
            <p className="field-error" role="alert">
              {state.errors.text}
            </p>
          ) : null}

          <label htmlFor="claim-category" className="field-label mt-5 block">
            ICC category
          </label>
          <select
            id="claim-category"
            name="category"
            value={category}
            onChange={(event) => onCategoryChange(event.target.value)}
            className="select mt-1.5"
          >
            <option value="">Choose a category</option>
            {ICC_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          {state.errors?.category ? (
            <p className="field-error" role="alert">
              {state.errors.category}
            </p>
          ) : null}

          <p className="mt-4 border-t border-line pt-3 text-xs leading-5 text-muted">
            A claim cannot be submitted without a region, an observation, and a
            category. The category is human-set.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <button type="submit" className="btn btn-primary" disabled={!canSave}>
              {pending ? "Saving…" : "Save draft"}
            </button>
            {editingDraft ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleDelete}
                disabled={deleting || pending}
              >
                {deleting ? "Removing…" : "Remove draft"}
              </button>
            ) : null}
          </div>

          {state.message ? (
            <p
              className={`mt-3 text-xs ${
                state.claim || state.deletedClaimId
                  ? "text-tide"
                  : "text-flag-ink"
              }`}
              role="status"
            >
              {state.message}
            </p>
          ) : null}
        </form>
      </div>
    </section>
  );
}
