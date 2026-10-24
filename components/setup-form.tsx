"use client";

import { useActionState } from "react";
import { createFirstUser } from "@/app/actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

const roles = [
  {
    value: "collector",
    label: "Collector",
    detail: "Photographs the spot and marks claims.",
  },
  {
    value: "reviewer",
    label: "Reviewer",
    detail: "Confirms, edits, rejects, or sends claims back.",
  },
  {
    value: "both",
    label: "Both",
    detail: "A solo organizer who collects and reviews.",
  },
];

export function SetupForm() {
  const [state, formAction, pending] = useActionState(
    createFirstUser,
    initialState,
  );

  return (
    <form action={formAction} className="panel p-6 sm:p-8">
      <p className="field-label">Create the first person</p>

      <div className="mt-5">
        <label htmlFor="displayName" className="field-label">
          Display name
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          autoComplete="off"
          maxLength={80}
          placeholder="Maya C."
          className="input mt-2"
          aria-invalid={Boolean(state.errors?.displayName)}
          aria-describedby={
            state.errors?.displayName ? "displayName-error" : undefined
          }
        />
        {state.errors?.displayName ? (
          <p id="displayName-error" className="field-error">
            {state.errors.displayName}
          </p>
        ) : (
          <p className="mt-2 text-xs leading-5 text-muted">
            This is the name shown on claims and decisions. It is public if a
            record is published.
          </p>
        )}
      </div>

      <fieldset className="mt-6">
        <legend className="field-label">Role</legend>
        <div className="mt-2 grid gap-2">
          {roles.map((role, index) => (
            <label
              key={role.value}
              className="flex cursor-pointer items-start gap-3 border border-line bg-paper p-3 transition-colors has-[:checked]:border-tide has-[:checked]:bg-wash"
            >
              <input
                type="radio"
                name="role"
                value={role.value}
                defaultChecked={index === 0}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--tide)]"
              />
              <span>
                <span className="block text-sm font-medium text-ink">
                  {role.label}
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-muted">
                  {role.detail}
                </span>
              </span>
            </label>
          ))}
        </div>
        {state.errors?.role ? (
          <p className="field-error">{state.errors.role}</p>
        ) : null}
      </fieldset>

      <div className="mt-6 border-t border-line pt-5">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name="acknowledge"
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--tide)]"
            aria-invalid={Boolean(state.errors?.acknowledge)}
          />
          <span className="text-xs leading-5 text-muted">
            I understand this workspace stores display names, not accounts, and
            that I need consent from anyone identifiable in a photo before I
            upload it.
          </span>
        </label>
        {state.errors?.acknowledge ? (
          <p className="field-error">{state.errors.acknowledge}</p>
        ) : null}
      </div>

      <button
        type="submit"
        className="btn btn-primary mt-6 w-full"
        disabled={pending}
      >
        {pending ? "Opening workspace…" : "Open the workspace"}
      </button>

      {state.message ? (
        <p className="mt-3 text-xs leading-5 text-flag-ink">{state.message}</p>
      ) : null}
    </form>
  );
}
