"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  publishRecord,
  unpublishRecord,
} from "@/app/(app)/cleanups/[id]/export/actions";
import type { ExportBlocker } from "@/lib/export";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

function CopyLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/p/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setFailed(false);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      setFailed(true);
    }
  }

  return (
    <button type="button" onClick={copy} className="btn btn-ghost">
      {copied ? "Copied" : failed ? "Copy failed — select the link" : "Copy link"}
    </button>
  );
}

export function PublishPanel({
  cleanupId,
  slug,
  published,
  publishedAt,
  blockers,
}: {
  cleanupId: string;
  slug: string;
  published: boolean;
  publishedAt: string | null;
  blockers: ExportBlocker[];
}) {
  const [publishState, publishAction, publishPending] = useActionState(
    publishRecord,
    initialState,
  );
  const [unpublishState, unpublishAction, unpublishPending] = useActionState(
    unpublishRecord,
    initialState,
  );

  const reachable = published && blockers.length === 0;
  const publicPath = `/p/${slug}`;

  return (
    <section className="panel p-5 sm:p-6" aria-labelledby="publish-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="field-label">Public page</p>
          <h2 id="publish-heading" className="heading-2 mt-1">
            {reachable
              ? "This record is public"
              : published
                ? "Published, but currently blocked"
                : "Private until you publish"}
          </h2>
        </div>
        <span className={`chip ${reachable ? "chip-tide" : "chip-ink"}`}>
          {reachable ? "Public" : published ? "Blocked" : "Off"}
        </span>
      </div>

      <p className="dense-text mt-3 text-muted">
        The public page shows confirmed claims and receipts only. It omits the
        excluded-claims appendix, internal conditions, and the audit log. It is
        marked <span className="mono text-xs">noindex, nofollow</span>. Publishing
        and unpublishing both rotate the link, so an old URL stops working.
      </p>

      {blockers.length > 0 ? (
        <div className="mt-4 border-l-[3px] border-flag bg-wash px-4 py-3.5">
          <p className="field-label text-flag-ink">
            {published ? "The public page is returning 404" : "Before publishing"}
          </p>
          <ul className="mt-2 space-y-1.5 text-sm leading-6 text-muted">
            {blockers.map((blocker) => (
              <li key={`${blocker.code}-${blocker.claimId ?? ""}`}>
                {blocker.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {reachable ? (
        <div className="mt-4 border border-line bg-wash p-4">
          <p className="field-label">Live link</p>
          <Link
            href={publicPath}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex min-h-11 items-center break-all font-mono text-xs text-tide link-underline"
          >
            {publicPath}
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CopyLinkButton slug={slug} />
            <form action={unpublishAction}>
              <input type="hidden" name="cleanupId" value={cleanupId} />
              <button
                type="submit"
                className="btn btn-ghost"
                disabled={unpublishPending}
              >
                {unpublishPending ? "Unpublishing…" : "Unpublish and rotate link"}
              </button>
            </form>
          </div>
          {publishedAt ? (
            <p className="mt-2 text-xs text-muted">
              Published {publishedAt.slice(0, 10)}
            </p>
          ) : null}
        </div>
      ) : null}

      {published ? (
        <div className="mt-4">
          {!reachable ? (
            <form action={unpublishAction}>
              <input type="hidden" name="cleanupId" value={cleanupId} />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={unpublishPending}
              >
                {unpublishPending ? "Unpublishing…" : "Unpublish and rotate link"}
              </button>
            </form>
          ) : null}
        </div>
      ) : (
        <form action={publishAction} className="mt-4">
          <input type="hidden" name="cleanupId" value={cleanupId} />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={publishPending || blockers.length > 0}
          >
            {publishPending ? "Publishing…" : "Publish record"}
          </button>
          {blockers.length > 0 ? (
            <p className="mt-2 text-xs text-muted">
              Resolve the blockers above to publish.
            </p>
          ) : null}
        </form>
      )}

      {publishState.message ? (
        <p className="mt-3 text-sm text-tide">{publishState.message}</p>
      ) : null}
      {publishState.errors?.publish ? (
        <p className="field-error">{publishState.errors.publish}</p>
      ) : null}
      {unpublishState.message ? (
        <p className="mt-3 text-sm text-tide">{unpublishState.message}</p>
      ) : null}
      {unpublishState.errors?.publish ? (
        <p className="field-error">{unpublishState.errors.publish}</p>
      ) : null}
    </section>
  );
}
