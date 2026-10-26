"use client";

import { useActionState } from "react";
import { createCleanup } from "@/app/(app)/cleanups/actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

export function CleanupForm({
  today,
  leadName,
}: {
  today: string;
  leadName: string;
}) {
  const [state, formAction, pending] = useActionState(
    createCleanup,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
      <div className="panel p-6 sm:p-8">
        <p className="field-label">Record details</p>

        <div className="mt-5">
          <label htmlFor="site" className="field-label">
            Site label
          </label>
          <input
            id="site"
            name="site"
            type="text"
            maxLength={120}
            placeholder="North Jetty"
            className="input mt-2"
            aria-invalid={Boolean(state.errors?.site)}
            aria-describedby={state.errors?.site ? "site-error" : "site-help"}
          />
          {state.errors?.site ? (
            <p id="site-error" className="field-error">
              {state.errors.site}
            </p>
          ) : (
            <p id="site-help" className="mt-2 text-sm leading-6 text-muted">
              Use a public place name, not a street address.
            </p>
          )}
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="date" className="field-label">
              Cleanup date
            </label>
            <input
              id="date"
              name="date"
              type="date"
              defaultValue={today}
              max={today}
              className="input mt-2"
              aria-invalid={Boolean(state.errors?.date)}
            />
            {state.errors?.date ? (
              <p className="field-error">{state.errors.date}</p>
            ) : null}
          </div>

          <div>
            <span className="field-label">Lead</span>
            <div className="mt-2 flex h-11 items-center border border-line bg-wash px-3 text-base text-ink">
              {leadName}
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">
              The person creating this record.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <label htmlFor="conditions" className="field-label">
            Internal conditions
          </label>
          <textarea
            id="conditions"
            name="conditions"
            maxLength={2000}
            rows={3}
            placeholder="Low tide, overcast, 12 volunteers."
            className="textarea mt-2"
          />
          <p className="mt-2 text-sm leading-6 text-muted">
            Weather, tide, access notes. Never shown on the public page.
          </p>
        </div>

        <div className="mt-5">
          <label htmlFor="publicNote" className="field-label">
            Public note <span className="normal-case tracking-normal">(optional)</span>
          </label>
          <textarea
            id="publicNote"
            name="publicNote"
            maxLength={2000}
            rows={3}
            placeholder="Twelve volunteers removed 18 bags from the north jetty rock line."
            className="textarea mt-2"
          />
          <p className="mt-2 text-sm leading-6 text-muted">
            The only free text shown on the public page. Write it for a sponsor.
          </p>
        </div>

        <div className="mt-7 border-t border-line pt-5">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="consent"
              className="mt-0.5 shrink-0 accent-[var(--tide)]"
              aria-invalid={Boolean(state.errors?.consent)}
            />
            <span className="text-sm leading-6 text-ink">
              I took these photos or have permission to use them, and I have
              consent from anyone identifiable.
            </span>
          </label>
          {state.errors?.consent ? (
            <p className="field-error">{state.errors.consent}</p>
          ) : (
            <p className="mt-2 pl-7 text-sm leading-6 text-muted">
              Required. Stored with your display name and the time.
            </p>
          )}
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={pending}
          >
            {pending ? "Creating…" : "Create cleanup"}
          </button>
          <span className="text-xs text-muted">Starts with no pairs</span>
        </div>
      </div>

      <aside className="space-y-5">
        <div className="receipt p-5">
          <span className="receipt-hole" aria-hidden="true" />
          <p className="field-label">After you create it</p>
          <ol className="mt-4 space-y-4">
            {[
              ["01", "Add a before photo", "The spot as you found it."],
              ["02", "Mark what you removed", "One region, one sentence."],
              ["03", "Add the after photo", "Same spot, same rough framing."],
              ["04", "Submit for review", "A named person decides."],
            ].map(([number, title, detail]) => (
              <li key={number} className="flex gap-3">
                <span className="mono pt-0.5 text-sm text-tide">
                  {number}
                </span>
                <span>
                  <span className="block text-base font-medium text-ink">
                    {title}
                  </span>
                  <span className="mt-0.5 block text-sm leading-6 text-muted">
                    {detail}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="border border-line bg-wash p-5">
          <p className="field-label">Privacy at upload</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
            <li>EXIF and GPS are stripped before storage.</li>
            <li>The original upload is never kept.</li>
            <li>Only sanitized images are served.</li>
            <li>Anyone identifiable must be flagged.</li>
          </ul>
        </div>
      </aside>
    </form>
  );
}
