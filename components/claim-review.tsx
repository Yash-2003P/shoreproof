"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  decideClaim,
  editAndConfirmClaim,
  reviseClaim,
} from "@/app/(app)/review/actions";
import { FLAG_LABELS, FLAG_ORDER, type QueueFlagCode } from "@/lib/queue";
import {
  ClaimLineageItem,
  ClaimReviewData,
} from "@/lib/review-data";
import { ICC_CATEGORIES } from "@/lib/icc";
import { formatRegion, type Region } from "@/lib/region";
import type { ClaimStatus, PhotoSummary } from "@/lib/types";
import type { ActionState } from "@/lib/validation";

const STATUS_LABELS: Record<ClaimStatus, string> = {
  draft: "Draft",
  pending: "Pending",
  confirmed: "Confirmed",
  rejected: "Rejected",
  insufficient: "Returned",
  superseded: "Superseded",
};

const COMPARABILITY_LABELS: Record<string, string> = {
  comparable: "Comparable",
  partial: "Partially comparable",
  not_comparable: "Not comparable",
};

function PhotoCrop({
  photo,
  region,
  label,
}: {
  photo: PhotoSummary | null;
  region: Region | null;
  label: string;
}) {
  if (!photo) {
    return (
      <figure>
        <div className="flex aspect-[4/3] items-center justify-center border border-line bg-wash">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            No {label.toLowerCase()} photo
          </span>
        </div>
        <figcaption className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
          {label}
        </figcaption>
      </figure>
    );
  }

  const maxWidth = Math.round(420 * (photo.width / photo.height));

  return (
    <figure>
      <div
        className="relative mx-auto w-full border border-line bg-ink"
        style={{
          aspectRatio: `${photo.width} / ${photo.height}`,
          maxWidth: `min(100%, ${maxWidth}px)`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/photos/${photo.id}`}
          alt={`${label} photo, sanitized`}
          className="h-full w-full object-contain"
        />

        {region ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute border-2 border-flag"
            style={{
              left: `${region.x * 100}%`,
              top: `${region.y * 100}%`,
              width: `${region.w * 100}%`,
              height: `${region.h * 100}%`,
            }}
          />
        ) : null}
      </div>

      <figcaption className="mt-1 flex flex-wrap items-baseline justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
        <span>{label}</span>
        <span>
          {photo.width} × {photo.height}
          {region ? ` · ${formatRegion(region)}` : ""}
        </span>
      </figcaption>
    </figure>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="field-label">{label}</p>
      <div className="mt-1 text-sm leading-5 text-ink">{children}</div>
    </div>
  );
}

export function ClaimReview({ data }: { data: ClaimReviewData }) {
  const [state, setState] = useState<ActionState>({});
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(data.text);
  const [editCategory, setEditCategory] = useState(data.category ?? "");
  const [pending, startWorking] = useTransition();

  const pendingClaim = data.status === "pending";
  const busy = pending;

  const confirmBlockedBy = (data.flags as QueueFlagCode[]).filter(
    (flag) => flag === "not_comparable" || flag === "people_visible",
  );

  function decide(kind: "confirm" | "reject" | "insufficient") {
    const formData = new FormData();
    formData.set("claimId", data.id);
    formData.set("decision", kind);
    formData.set("note", note);

    startWorking(async () => {
      const result = await decideClaim({}, formData);
      setState(result);
      if (result.claim || /confirmed|rejected|returned/i.test(result.message ?? "")) {
        if (kind !== "confirm") {
          setNote("");
        }
      }
    });
  }

  function editAndConfirm() {
    const formData = new FormData();
    formData.set("claimId", data.id);
    formData.set("text", editText);
    formData.set("category", editCategory);
    formData.set("note", note);

    startWorking(async () => {
      const result = await editAndConfirmClaim({}, formData);
      setState(result);
      if (result.claim) {
        setEditing(false);
        setNote("");
      }
    });
  }

  function revise() {
    const formData = new FormData();
    formData.set("claimId", data.id);

    startWorking(async () => {
      const result = await reviseClaim({}, formData);
      setState(result);
    });
  }

  return (
    <article className="panel" aria-label="Claim review">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <p className="field-label">
            {data.site} · {data.pairLabel}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            Claim {data.id.slice(0, 8)} · revision {data.revision}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`chip ${
              data.status === "confirmed"
                ? "chip-tide"
                : data.status === "pending"
                  ? "border-flag/60 text-flag-ink"
                  : "text-muted"
            }`}
          >
            {STATUS_LABELS[data.status]}
          </span>
          {FLAG_ORDER.filter((flag) => data.flags.includes(flag)).map((flag: QueueFlagCode) => (
            <span key={flag} className="chip border-flag/60 text-flag-ink">
              {FLAG_LABELS[flag]}
            </span>
          ))}
        </div>
      </header>

      <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
        <PhotoCrop photo={data.before} region={data.region} label="Before" />
        <PhotoCrop photo={data.after} region={null} label="After" />
      </div>

      <div className="grid gap-5 border-t border-line px-4 py-4 md:grid-cols-2">
        <div className="space-y-4">
          {editing && pendingClaim ? (
            <>
              <Field label={`Observation (edited · revision ${data.revision + 1})`}>
                <textarea
                  aria-label="Edited observation"
                  value={editText}
                  onChange={(event) => setEditText(event.target.value)}
                  rows={3}
                  maxLength={280}
                  className="textarea mt-0 min-h-[72px]"
                />
              </Field>
              <Field label="Category">
                <select
                  aria-label="Edited category"
                  value={editCategory}
                  onChange={(event) => setEditCategory(event.target.value)}
                  className="select mt-0"
                >
                  <option value="">Choose a category</option>
                  {ICC_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          ) : (
            <>
              <Field label={`Observation · ${data.collectorName}`}>
                {data.text.length > 0 ? data.text : "No observation written."}
              </Field>
              <Field label="Category">{data.category ?? "None"}</Field>
            </>
          )}

          <Field label="Comparability">
            {data.comparability
              ? `${COMPARABILITY_LABELS[data.comparability]}${
                  data.comparabilityReason ? ` — ${data.comparabilityReason}` : ""
                }`
              : "Not set"}
            {data.framingScore !== null ? (
              <span className="ml-1 text-muted">
                (framing signal {data.framingScore}/100)
              </span>
            ) : null}
          </Field>

          <Field label="Privacy">
            {data.before?.people_visible === 1 ||
            data.after?.people_visible === 1 ? (
              <span className="text-flag-ink">
                A photo is marked people-visible. Confirmation, export, and
                publishing stay blocked until it is replaced.
              </span>
            ) : (
              "No people flagged. EXIF and GPS were stripped on import and the originals were discarded."
            )}
          </Field>
        </div>

        <div className="space-y-4">
          <Field label="Preflight">
            <ul className="space-y-0.5 text-[13px] text-muted">
              {[data.before, data.after]
                .filter((photo): photo is PhotoSummary => photo !== null)
                .map((photo) => (
                  <li key={photo.id} className="font-mono text-[10px] uppercase tracking-[0.06em]">
                    {photo.side} · blur {Math.round(photo.blur_score)} · clipped{" "}
                    {(photo.exposure_clipped * 100).toFixed(1)}% · dhash{" "}
                    {photo.dhash.slice(0, 8)}
                    {photo.near_duplicate_of ? " · near-duplicate" : ""}
                  </li>
                ))}
              {!data.before && !data.after ? <li>No photos.</li> : null}
            </ul>
          </Field>

          <Field label="AI provenance">
            {data.suggestion ? (
              <span className="text-[13px] leading-5">
                {data.suggestion.model} proposed{" "}
                <span className="font-mono text-[11px] uppercase">
                  {data.suggestion.cocoClass}
                </span>{" "}
                at {data.suggestion.confidence.toFixed(2)} — a human accepted it
                {data.suggestion.edited ? " and edited the box" : " without edits"}
                {data.suggestion.iccCategory
                  ? `, mapped to ${data.suggestion.iccCategory}${data.suggestion.mappingUncertain ? " (uncertain)" : ""}`
                  : ""}
                . Run {data.suggestion.modelSha256.slice(0, 12)}… ·{" "}
                {data.suggestion.runtimeMs} ms · {data.suggestion.boxCount}{" "}
                {data.suggestion.boxCount === 1 ? "box" : "boxes"}.
              </span>
            ) : (
              "No AI suggestion. The region was marked by hand."
            )}
          </Field>

          {data.decidedByName && data.decidedAt ? (
            <Field label={`Decision · ${data.decidedByName}`}>
              {STATUS_LABELS[data.status]}
              {data.decisionNote ? ` — ${data.decisionNote}` : ""}
              <span className="ml-1 text-muted">
                {new Date(data.decidedAt).toLocaleString()}
              </span>
            </Field>
          ) : null}

          {data.status === "insufficient" && data.decisionNote ? (
            <p className="border border-flag/40 bg-flag/5 px-3 py-2 text-[12px] leading-4 text-flag-ink">
              Returned to {data.collectorName}: {data.decisionNote} The collector
              responds with a replacement photo and a new claim.
            </p>
          ) : null}
        </div>
      </div>

      {data.lineage.length > 1 ? (
        <div className="border-t border-line px-4 py-3">
          <p className="field-label">Revision history</p>
          <ul className="mt-1.5 space-y-1">
            {data.lineage.map((item: ClaimLineageItem) => (
              <li
                key={item.id}
                className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted"
              >
                <Link
                  href={`/review/${item.id}`}
                  className={item.id === data.id ? "text-tide" : "hover:text-ink"}
                >
                  v{item.revision} · {STATUS_LABELS[item.status]}
                </Link>{" "}
                — {item.text.length > 70 ? `${item.text.slice(0, 70)}…` : item.text}
                {item.decidedAt
                  ? ` · ${new Date(item.decidedAt).toLocaleDateString()}`
                  : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {pendingClaim ? (
        <div className="border-t border-line px-4 py-4">
          <label htmlFor="review-note" className="field-label block">
            Note {editing ? "" : "(optional for confirm)"}
          </label>
          <textarea
            id="review-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            maxLength={500}
            className="textarea mt-1 min-h-[64px]"
            placeholder={
              editing
                ? "Optional note recorded with the confirmation."
                : "Required for reject and insufficient evidence."
            }
          />

          {confirmBlockedBy.length > 0 ? (
            <p className="mt-2 border border-flag/40 bg-flag/5 px-3 py-2 text-[12px] leading-4 text-flag-ink">
              Confirm is disabled:{" "}
              {confirmBlockedBy
                .map((flag) => FLAG_LABELS[flag].toLowerCase())
                .join(" · ")}
              . Reject it or send it back instead.
            </p>
          ) : null}

          {editing ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={editAndConfirm}
                disabled={
                  busy ||
                  editText.trim().length === 0 ||
                  editCategory.length === 0
                }
              >
                {busy ? "Saving…" : "Confirm revision"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setEditing(false);
                  setEditText(data.text);
                  setEditCategory(data.category ?? "");
                }}
                disabled={busy}
              >
                Cancel edit
              </button>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => decide("confirm")}
                disabled={busy || confirmBlockedBy.length > 0}
              >
                {busy ? "Working…" : "Confirm"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setEditing(true)}
                disabled={busy}
              >
                Edit and confirm
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => decide("reject")}
                disabled={busy}
              >
                Reject
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => decide("insufficient")}
                disabled={busy}
              >
                Insufficient evidence
              </button>
            </div>
          )}

          <p className="mt-2 text-[11px] leading-4 text-muted">
            Wrong region? Send the claim back or reject it — the collector marks
            regions in the workspace.
          </p>
        </div>
      ) : null}

      {data.status === "confirmed" ? (
        <div className="border-t border-line px-4 py-4">
          <p className="text-[12px] leading-4 text-muted">
            Confirmed claims are immutable. A correction creates a new draft
            revision; both versions stay in the audit log.
          </p>
          <button
            type="button"
            className="btn btn-ghost mt-2"
            onClick={revise}
            disabled={busy}
          >
            {busy ? "Working…" : "Revise"}
          </button>
        </div>
      ) : null}

      {state.message ? (
        <p
          className="border-t border-line px-4 py-3 font-mono text-[10px] uppercase tracking-[0.08em] text-muted"
          role="status"
        >
          {state.message}
        </p>
      ) : null}
    </article>
  );
}
