import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/wordmark";
import { TideDivider } from "@/components/site/tide-divider";
import {
  safeNextPath,
  verifyWorkspaceToken,
  WORKSPACE_COOKIE,
  workspaceAuthEnabled,
} from "@/lib/workspace-auth";
import { signIn } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Workspace login",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  if (!workspaceAuthEnabled()) {
    redirect(safeNextPath(next ?? null));
  }

  const store = await cookies();
  if (verifyWorkspaceToken(store.get(WORKSPACE_COOKIE)?.value)) {
    redirect(safeNextPath(next ?? null));
  }

  const destination = safeNextPath(next ?? null);
  const failed = error === "1";

  return (
    <main className="flex min-h-screen flex-col">
      <div className="border-t-2 border-tide border-b border-line">
        <div className="mx-auto flex min-h-16 w-full max-w-[1200px] items-center px-5 sm:px-8">
          <Wordmark href="/" />
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[1200px] flex-1 gap-16 px-5 py-12 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,32rem)_20rem] lg:justify-between">
        <div className="w-full max-w-lg">
          <p className="kicker">Workspace access</p>
          <h1 className="display-1 mt-3">This workspace is locked.</h1>
          <p className="lede mt-4">
            The operator set a workspace passphrase. Enter it to reach cleanups,
            review, settings, and export. The public site and a published record
            stay readable without it.
          </p>

          <TideDivider />

          <form action={signIn} className="mt-7">
            <input type="hidden" name="next" value={destination} />
            <label htmlFor="passphrase" className="field-label block">
              Workspace passphrase
            </label>
            <input
              id="passphrase"
              name="passphrase"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              className="input mt-2"
              aria-invalid={failed}
              aria-describedby={failed ? "passphrase-error" : undefined}
            />
            {failed ? (
              <p id="passphrase-error" className="field-error mt-2" role="alert">
                That passphrase did not match. Try again.
              </p>
            ) : (
              <p className="mt-2 text-sm leading-6 text-muted">
                The passphrase is checked on the server and never stored in the
                page.
              </p>
            )}

            <button type="submit" className="btn btn-primary mt-5 w-full">
              Unlock workspace
            </button>
          </form>

          <div className="mt-7 border-t border-line pt-4">
            <p className="text-xs leading-5 text-muted">
              Lost the passphrase? The operator can unset{" "}
              <span className="mono text-xs">WORKSPACE_PASSPHRASE</span> or
              rotate it on the host. A new passphrase does not change stored
              records.
            </p>
            <Link
              href="/"
              className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-tide link-underline"
            >
              Back to the public site
            </Link>
          </div>
        </div>

        <aside className="hidden lg:block" aria-label="Access boundary">
          <div className="receipt p-6">
            <span className="receipt-hole" aria-hidden="true" />
            <p className="field-label">Access boundary</p>
            <dl className="mt-4 space-y-3">
              {[
                ["Workspace", "Locked"],
                ["Public site", "Readable"],
                ["Published record", "Readable"],
                ["Passphrase", "Server-side check"],
                ["Stored in page", "Nothing"],
              ].map(([term, value]) => (
                <div
                  key={term}
                  className="flex items-baseline justify-between gap-4 border-b border-line pb-2.5 last:border-0 last:pb-0"
                >
                  <dt className="field-label">{term}</dt>
                  <dd className="mono text-right text-xs text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="stamp mt-6">Locked by operator</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
