import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { PublicChip, StatusChip } from "@/components/status-chip";
import { listCleanups } from "@/lib/cleanups";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cleanups",
};

function EmptyState() {
  return (
    <section className="survey-grid mt-8 border border-line p-6 sm:p-10">
      <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="max-w-xl">
          <h2 className="display-2">The record starts empty.</h2>
          <p className="body-text mt-4 text-muted">
            ShoreProof does not seed a sample record. Every record begins with
            photos you took or have permission to use — so every claim in it can
            be traced back to a real place and a real person.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/cleanups/new" className="btn btn-primary">
              Create a cleanup
            </Link>
            <Link href="/settings" className="btn btn-ghost">
              Add a reviewer
            </Link>
          </div>

          <div className="mt-9 border-t border-line pt-5">
            <p className="field-label">Bulk path</p>
            <pre className="mono mt-2 overflow-x-auto border border-line bg-paper px-3.5 py-3 text-xs leading-6 text-ink">
              npm run import -- ./imports/site/manifest.json
            </pre>
            <p className="mt-2 max-w-md text-xs leading-5 text-muted">
              Imports a real cleanup from a manifest and a folder of photos. It
              creates pairs and checks — never claims.
            </p>
          </div>
        </div>

        <div className="receipt self-start p-5 sm:p-6">
          <span className="receipt-hole" aria-hidden="true" />
          <div className="flex items-baseline justify-between gap-4 pr-4">
            <p className="kicker">Record 000</p>
            <p className="mono text-xs text-muted">EMPTY</p>
          </div>
          <dl className="mt-5 space-y-3">
            {[
              ["Source", "First-party capture"],
              ["Import", "Manifest only"],
              ["Claims", "Human-marked"],
              ["AI", "Proposals only"],
              ["Seed data", "None"],
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
          <p className="stamp stamp-in mt-6">No seed</p>
          <p className="mt-4 text-xs leading-5 text-muted">
            The first record is yours to make. There is nothing to clean up
            first.
          </p>
        </div>
      </div>
    </section>
  );
}

export default function CleanupsPage() {
  const cleanups = listCleanups();

  return (
    <div className="page">
      <PageHeader
        title="Cleanups"
        description="Every record starts with photos you have the right to use. ShoreProof adds no sample data."
        actions={
          <Link href="/cleanups/new" className="btn btn-primary">
            New cleanup
          </Link>
        }
      />

      {cleanups.length === 0 ? (
        <EmptyState />
      ) : (
        <section className="mt-8" aria-label="Cleanup records">
          <div className="hidden grid-cols-[minmax(0,2.2fr)_0.8fr_0.7fr_0.7fr_0.9fr_1fr] gap-4 border-b border-line px-4 pb-3 sm:grid">
            <span className="field-label">Site</span>
            <span className="field-label">Date</span>
            <span className="field-label">Pairs</span>
            <span className="field-label">Confirmed</span>
            <span className="field-label">Status</span>
            <span className="field-label">Public</span>
          </div>

          {cleanups.map((cleanup) => (
            <Link
              key={cleanup.id}
              href={`/cleanups/${cleanup.id}`}
              className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-line px-4 py-4 transition-colors hover:bg-wash/60 sm:grid-cols-[minmax(0,2.2fr)_0.8fr_0.7fr_0.7fr_0.9fr_1fr] sm:py-5"
            >
              <div className="min-w-0">
                <p className="font-serif text-xl leading-6 text-ink group-hover:text-tide">
                  {cleanup.site}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {formatDate(cleanup.date)} · {cleanup.lead_name} ·{" "}
                  {cleanup.pair_count}{" "}
                  {cleanup.pair_count === 1 ? "pair" : "pairs"}
                </p>
              </div>

              <div className="flex flex-col items-end gap-1.5 sm:hidden">
                <StatusChip status={cleanup.status} />
                <PublicChip published={cleanup.public_enabled === 1} />
              </div>

              <p className="mono hidden text-xs text-muted sm:block">
                {formatDate(cleanup.date)}
              </p>
              <p className="mono hidden text-sm text-muted sm:block">
                {cleanup.pair_count}
              </p>
              <p className="mono hidden text-sm font-medium text-ink sm:block">
                {cleanup.confirmed_count}
              </p>
              <div className="hidden sm:block">
                <StatusChip status={cleanup.status} />
              </div>
              <div className="hidden sm:block">
                <PublicChip published={cleanup.public_enabled === 1} />
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
