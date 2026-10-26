import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, PageHeader } from "@/components/page-header";
import { ComparabilityChip } from "@/components/comparability-chip";
import { PublicChip, StatusChip } from "@/components/status-chip";
import { createPair } from "../actions";
import { getCleanupSummary, listPairs } from "@/lib/cleanups";
import { formatDate, formatTimestamp } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cleanup record",
};

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
    <div className="page">
      <Breadcrumbs
        items={[{ label: "Cleanups", href: "/cleanups" }, { label: cleanup.site }]}
      />

      <div className="mt-5">
        <PageHeader
          size="section"
          title={cleanup.site}
          meta={
            <span>
              {formatDate(cleanup.date)} · Lead {cleanup.lead_name} ·{" "}
              {pairs.length} {pairs.length === 1 ? "pair" : "pairs"}
            </span>
          }
          actions={
            <>
              <StatusChip status={cleanup.status} />
              <PublicChip published={cleanup.public_enabled === 1} />
            </>
          }
        />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.45fr_0.55fr]">
        <section aria-labelledby="pairs-heading">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-3">
            <div>
              <h2 id="pairs-heading" className="heading-2">
                Pairs
              </h2>
              <p className="meta-text mt-1">
                One before photo and one after photo of the same spot.
              </p>
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
            <div className="mt-5 border border-line bg-wash p-6 sm:p-7">
              <h3 className="heading-3">No pairs yet</h3>
              <p className="dense-text mt-2 max-w-lg text-muted">
                A pair is a before photo and an after photo of the same spot.
                Add the pair first, then mark what changed inside the workspace.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {pairs.map((pair) => {
                const label = pair.label ?? "Untitled pair";
                return (
                  <Link
                    key={pair.id}
                    href={`/cleanups/${cleanup.id}/pairs/${pair.id}`}
                    className="group block overflow-hidden border border-line bg-paper transition-colors hover:border-tide"
                  >
                    <div className="grid grid-cols-2 gap-px bg-line">
                      <div className="relative aspect-[4/3] bg-wash">
                        {pair.before_photo_id ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/api/photos/${pair.before_photo_id}`}
                            alt={`Before photo for ${label}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center px-2 text-center text-xs text-muted">
                            No before photo
                          </div>
                        )}
                        <span className="absolute left-2 top-2 bg-ink/90 px-2 py-1 text-xs font-medium text-salt">
                          Before
                        </span>
                      </div>
                      <div className="relative aspect-[4/3] bg-wash">
                        {pair.after_photo_id ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/api/photos/${pair.after_photo_id}`}
                            alt={`After photo for ${label}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center px-2 text-center text-xs text-muted">
                            No after photo
                          </div>
                        )}
                        <span className="absolute left-2 top-2 bg-paper/95 px-2 py-1 text-xs font-medium text-ink">
                          After
                        </span>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-serif text-xl leading-6 text-ink group-hover:text-tide">
                            {label}
                          </h3>
                          <p className="mt-1 text-xs text-muted">
                            {pair.claim_count}{" "}
                            {pair.claim_count === 1 ? "claim" : "claims"} ·{" "}
                            {pair.before_count > 0 && pair.after_count > 0
                              ? "Both photos added"
                              : pair.before_count > 0
                                ? "Before added"
                                : pair.after_count > 0
                                  ? "After added"
                                  : "No photos"}
                          </p>
                        </div>
                        <ComparabilityChip value={pair.comparability} />
                      </div>

                      <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-tide">
                        Open workspace
                        <span aria-hidden="true">→</span>
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <div className="receipt p-5">
            <span className="receipt-hole" aria-hidden="true" />
            <div className="flex items-baseline justify-between gap-4 pr-4">
              <h2 className="kicker">Record facts</h2>
              <span className="mono text-xs text-muted">
                {pairs.length} {pairs.length === 1 ? "PAIR" : "PAIRS"}
              </span>
            </div>
            <dl className="mt-4 space-y-3">
              <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2.5">
                <dt className="field-label">Date</dt>
                <dd className="mono text-sm text-ink">
                  {formatDate(cleanup.date)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2.5">
                <dt className="field-label">Lead</dt>
                <dd className="text-sm text-ink">{cleanup.lead_name}</dd>
              </div>
              <div className="border-b border-line pb-2.5">
                <dt className="field-label">Conditions</dt>
                <dd className="mt-1 text-sm leading-6 text-ink">
                  {cleanup.conditions ?? (
                    <span className="text-muted">Not recorded</span>
                  )}
                </dd>
              </div>
              <div className="border-b border-line pb-2.5">
                <dt className="field-label">Consent</dt>
                <dd className="mt-1 text-xs leading-5 text-muted">
                  Attested by {cleanup.consent_name} on{" "}
                  {formatTimestamp(cleanup.consent_attested_at)}.
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="field-label">Created</dt>
                <dd className="mono text-xs text-muted">
                  {formatTimestamp(cleanup.created_at)}
                </dd>
              </div>
            </dl>
          </div>

          {cleanup.public_note ? (
            <div className="panel p-5">
              <h2 className="panel-title">Public note</h2>
              <p className="dense-text mt-2 text-ink">{cleanup.public_note}</p>
              <p className="mt-3 text-xs leading-5 text-muted">
                Shown on the public page when this record is published.
              </p>
            </div>
          ) : null}

          <Link
            href={`/cleanups/${cleanup.id}/export`}
            className="block border border-line bg-wash p-5 transition-colors hover:border-tide"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="panel-title">Evidence pack</h2>
              <PublicChip published={cleanup.public_enabled === 1} />
            </div>
            <p className="dense-text mt-3 text-muted">
              Preview the export, download the self-contained record, or publish
              the read-only public page. Off by default; publishing needs at
              least one confirmed claim and no privacy blockers.
            </p>
            <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-tide">
              Open export
              <span aria-hidden="true">→</span>
            </p>
          </Link>
        </aside>
      </div>
    </div>
  );
}
