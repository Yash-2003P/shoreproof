import Link from "next/link";
import { notFound } from "next/navigation";
import { ComparabilityChip } from "@/components/comparability-chip";
import { PublicChip, StatusChip } from "@/components/status-chip";
import { createPair } from "../actions";
import { getCleanupSummary, listPairs } from "@/lib/cleanups";
import { formatDate, formatTimestamp } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CleanupRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cleanup = getCleanupSummary(id);

  if (!cleanup) {
    notFound();
  }

  const pairs = listPairs(id);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <nav className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
        <Link href="/cleanups" className="hover:text-ink">
          Cleanups
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink">{cleanup.site}</span>
      </nav>

      <header className="mt-5 flex flex-wrap items-start justify-between gap-6 border-b border-line pb-6">
        <div>
          <p className="field-label">Cleanup record</p>
          <h1 className="mt-2 font-serif text-4xl leading-[1.08] tracking-[-0.01em] text-ink">
            {cleanup.site}
          </h1>
          <p className="mono mt-2 text-[11px] text-muted">
            {formatDate(cleanup.date)} · Lead {cleanup.lead_name} ·{" "}
            {pairs.length} {pairs.length === 1 ? "pair" : "pairs"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip status={cleanup.status} />
          <PublicChip published={cleanup.public_enabled === 1} />
        </div>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
        <section aria-labelledby="pairs-heading">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-3">
            <div>
              <p className="field-label">Evidence</p>
              <h2
                id="pairs-heading"
                className="mt-1 font-serif text-2xl text-ink"
              >
                Pairs
              </h2>
            </div>
            <form action={createPair}>
              <input type="hidden" name="cleanupId" value={cleanup.id} />
              <button
                type="submit"
                className={pairs.length === 0 ? "btn btn-primary" : "btn btn-ghost"}
              >
                New pair
              </button>
            </form>
          </div>

          {pairs.length === 0 ? (
            <div className="mt-5 border border-line bg-wash p-6">
              <p className="field-label">No pairs yet</p>
              <p className="mt-2 max-w-lg text-sm leading-6 text-muted">
                A pair is a before photo and an after photo of the same spot.
                Add the pair first, then mark what changed inside the workspace.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {pairs.map((pair) => (
                <Link
                  key={pair.id}
                  href={`/cleanups/${cleanup.id}/pairs/${pair.id}`}
                  className="panel group block p-4 transition-colors hover:border-tide"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="field-label">{pair.label}</p>
                      <p className="mt-1 text-xs text-muted">
                        {pair.claim_count}{" "}
                        {pair.claim_count === 1 ? "claim" : "claims"}
                      </p>
                    </div>
                    <ComparabilityChip value={pair.comparability} />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="photo-slot min-h-[118px] px-2">
                      <span className="field-label">Before</span>
                      <span className="text-xs text-muted">
                        {pair.before_count > 0 ? "Added" : "No photo"}
                      </span>
                    </div>
                    <div className="photo-slot min-h-[118px] px-2">
                      <span className="field-label">After</span>
                      <span className="text-xs text-muted">
                        {pair.after_count > 0 ? "Added" : "No photo"}
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.1em] text-tide">
                    Open workspace →
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <div className="receipt p-5">
            <span className="receipt-hole" aria-hidden="true" />
            <p className="field-label">Record facts</p>
            <dl className="mt-4 space-y-3">
              <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2">
                <dt className="field-label">Date</dt>
                <dd className="mono text-[11px] text-ink">
                  {formatDate(cleanup.date)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2">
                <dt className="field-label">Lead</dt>
                <dd className="text-sm text-ink">{cleanup.lead_name}</dd>
              </div>
              <div className="border-b border-line pb-2">
                <dt className="field-label">Conditions</dt>
                <dd className="mt-1 text-sm leading-5 text-ink">
                  {cleanup.conditions ?? (
                    <span className="text-muted">Not recorded</span>
                  )}
                </dd>
              </div>
              <div className="border-b border-line pb-2">
                <dt className="field-label">Consent</dt>
                <dd className="mt-1 text-xs leading-5 text-muted">
                  Attested by {cleanup.consent_name} on{" "}
                  {formatTimestamp(cleanup.consent_attested_at)}.
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="field-label">Created</dt>
                <dd className="mono text-[11px] text-muted">
                  {formatTimestamp(cleanup.created_at)}
                </dd>
              </div>
            </dl>
          </div>

          {cleanup.public_note ? (
            <div className="panel p-5">
              <p className="field-label">Public note</p>
              <p className="mt-2 text-sm leading-6 text-ink">
                {cleanup.public_note}
              </p>
              <p className="mt-3 text-xs leading-5 text-muted">
                Shown on the public page when this record is published.
              </p>
            </div>
          ) : null}

          <Link
            href={`/cleanups/${cleanup.id}/export`}
            className="block border border-line bg-wash p-5 transition-colors hover:border-tide"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="field-label">Evidence pack</p>
              <PublicChip published={cleanup.public_enabled === 1} />
            </div>
            <p className="mt-3 text-xs leading-5 text-muted">
              Preview the export, download the self-contained record, or publish
              the read-only public page. Off by default; publishing needs at
              least one confirmed claim and no privacy blockers.
            </p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-tide">
              Open export →
            </p>
          </Link>
        </aside>
      </div>
    </div>
  );
}
