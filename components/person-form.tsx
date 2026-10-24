"use client";

import { useActionState } from "react";
import { addPerson } from "@/app/actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

export function PersonForm() {
  const [state, formAction, pending] = useActionState(addPerson, initialState);

  return (
    <form action={formAction} className="panel p-5">
      <p className="field-label">Add a person</p>
      <p className="mt-2 text-xs leading-5 text-muted">
        A second display name lets someone else review claims. There is still no
        email or password.
      </p>

      <div className="mt-4">
        <label htmlFor="person-name" className="field-label">
          Display name
        </label>
        <input
          id="person-name"
          name="displayName"
          type="text"
          maxLength={80}
          placeholder="Ravi P."
          className="input mt-2"
          aria-invalid={Boolean(state.errors?.displayName)}
        />
        {state.errors?.displayName ? (
          <p className="field-error">{state.errors.displayName}</p>
        ) : null}
      </div>

      <div className="mt-4">
        <label htmlFor="person-role" className="field-label">
          Role
        </label>
        <select
          id="person-role"
          name="role"
          defaultValue="reviewer"
          className="select mt-2"
        >
          <option value="collector">Collector</option>
          <option value="reviewer">Reviewer</option>
          <option value="both">Collector + reviewer</option>
        </select>
      </div>

      <button
        type="submit"
        className="btn btn-primary mt-5 w-full"
        disabled={pending}
      >
        {pending ? "Adding…" : "Add person"}
      </button>

      {state.message ? (
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-tide">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
