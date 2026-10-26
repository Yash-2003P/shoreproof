"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "shoreproof-local-banner-dismissed";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

function getServerSnapshot() {
  return false;
}

function dismiss() {
  window.localStorage.setItem(STORAGE_KEY, "1");
  for (const listener of listeners) listener();
}

/**
 * Production only. The banner is a last-resort warning for an instance that was
 * deployed without a workspace passphrase. It is dismissible per browser and
 * carries no analytics.
 */
export function LocalModeBanner() {
  const dismissed = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  if (dismissed) return null;

  return (
    <div className="border-b border-flag/40 bg-flag/10">
      <div className="mx-auto flex w-full max-w-[1480px] flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2.5 sm:px-8">
        <p className="text-sm leading-6 text-flag-ink">
          <strong className="font-semibold">No workspace passphrase set.</strong>{" "}
          Do not expose this instance. Set{" "}
          <span className="mono text-xs">WORKSPACE_PASSPHRASE</span> and{" "}
          <span className="mono text-xs">AUTH_SECRET</span> before a public
          deployment.
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="ml-auto inline-flex min-h-11 items-center px-2 text-xs font-semibold text-flag-ink underline underline-offset-4"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
