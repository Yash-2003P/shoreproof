"use client";

import { useActionState } from "react";
import { setPeopleVisible } from "@/app/(app)/cleanups/actions";
import type { PhotoSummary } from "@/lib/types";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

function PrivacyToggle({
  photo,
  label,
  pairPath,
}: {
  photo: PhotoSummary;
  label: string;
  pairPath: string;
}) {
  const [state, formAction, pending] = useActionState(
    setPeopleVisible,
    initialState,
  );

  return (
    <form action={formAction} className="border-b border-line py-2 last:border-0">
      <div className="flex items-center justify-between gap-2">
        <span className="field-label">{label}</span>
        <span
          className={`chip ${
            photo.people_visible === 1 ? "chip-flag" : "chip-tide"
          }`}
        >
          {photo.people_visible === 1 ? "People visible" : "No people"}
        </span>
      </div>
      <input type="hidden" name="photoId" value={photo.id} />
      <input type="hidden" name="pairPath" value={pairPath} />
      <label className="mt-2 flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          name="peopleVisible"
          value="1"
          defaultChecked={photo.people_visible === 1}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--tide)]"
        />
        <span className="text-[11px] leading-4 text-muted">
          Anyone identifiable is visible. Marking this blocks confirm, export,
          and publish for the pair.
        </span>
      </label>
      <button
        type="submit"
        className="btn btn-ghost mt-2 h-8 min-h-8 px-2"
        disabled={pending}
      >
        {pending ? "Saving…" : `Save ${label.toLowerCase()} flag`}
      </button>
      {state.message ? (
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-tide">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function PrivacyPanel({
  before,
  after,
  pairPath,
}: {
  before: PhotoSummary | null;
  after: PhotoSummary | null;
  pairPath: string;
}) {
  const anyPeople =
    before?.people_visible === 1 || after?.people_visible === 1;

  return (
    <section className="panel p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="field-label">Privacy</p>
        <span className="chip chip-tide">Metadata stripped</span>
      </div>

      <div className="mt-2">
        <div className="flex items-center justify-between gap-2 border-b border-line py-2">
          <span className="field-label">Original upload</span>
          <span className="mono text-[10px] text-ink">Discarded</span>
        </div>
        <div className="flex items-center justify-between gap-2 border-b border-line py-2">
          <span className="field-label">Served file</span>
          <span className="mono text-[10px] text-ink">Sanitized JPEG</span>
        </div>

        {before ? (
          <PrivacyToggle photo={before} label="Before" pairPath={pairPath} />
        ) : null}
        {after ? (
          <PrivacyToggle photo={after} label="After" pairPath={pairPath} />
        ) : null}

        {!before && !after ? (
          <p className="py-2 text-xs leading-5 text-muted">
            Add a photo to record the people-visible answer.
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-2 border-t border-line pt-2">
          <span className="field-label">Public use</span>
          <span className={`chip ${anyPeople ? "chip-flag" : "text-muted"}`}>
            {anyPeople ? "Blocked" : "After review"}
          </span>
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-muted">
        EXIF and GPS are stripped before a photo is stored. The original bytes
        are never written to disk.
      </p>
    </section>
  );
}
