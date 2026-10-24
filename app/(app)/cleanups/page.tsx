import Link from "next/link";
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
          <p className="field-label">No records</p>
          <h2 className="mt-3 font-serif text-3xl leading-tight text-ink sm:text-4xl">
            The record starts empty.
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted">
            ShoreProof does not seed a sample record. Every record begins with
            photos you took or have permission to use — so every claim in it can
            be traced back to a real place and a real person.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/cleanups/new" className="btn btn-primary">
              Create a cleanup
            </Link>
            <Link href="/settings" className="btn btn-ghost">
              Add a reviewer
            </Link>
          </div>

          <div className="mt-9 border-t border-line pt-5">
            <p className="field-label">Bulk path</p>
            <pre className="mono mt-2 overflow-x-auto border border-line bg-paper px-3 py-2 text-[11px] leading-5 text-ink">
              npm run import -- ./imports/site/manifest.json
            </pre>
            <p className="mt-2 max-w-md text-xs leading-5 text-muted">
              Imports a real cleanup from a manifest and a folder of photos. It
              creates pairs and checks — never claims.
            </p>
          </div>
        </div>

        <div className="receipt self-start p-5">
          <span className="receipt-hole" aria-hidden="true" />
          <div className="flex items-baseline justify-between gap-4">
            <p className="field-label">Record 000</p>
            <p className="mono text-[10px] text-muted">EMPTY</p>
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
                className="flex items-baseline justify-between gap-4 border-b border-line pb-2 last:border-0 last:pb-0"
              >
                <dt className="field-label">{term}</dt>
                <dd className="mono text-[11px] text-ink">{value}</dd>
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
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-6">
        <div>
          <p className="field-label">Workspace</p>
          <h1 className="mt-2 font-serif text-4xl leading-none tracking-[-0.01em] text-ink">
            Cleanups
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
            Every record starts with photos you have the right to use.
            ShoreProof adds no sample data.
          </p>
        </div>
        <Link href="/cleanups/new" className="btn btn-primary">
          New cleanup
        </Link>
      </header>

      {cleanups.length === 0 ? (
        <EmptyState />
      ) : (
        <section className="mt-8" aria-label="Cleanup records">
          <div className="hidden grid-cols-[minmax(0,2.2fr)_0.8fr_1.1fr_0.6fr_0.9fr_0.9fr] gap-4 border-b border-line px-4 pb-3 sm:grid">
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
              className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-line px-4 py-4 transition-colors hover:bg-wash/60 sm:grid-cols-[minmax(0,2.2fr)_0.8fr_1.1fr_0.6fr_0.9fr_0.9fr]"
            >
              <div>
                <p className="font-serif text-xl leading-6 text-ink group-hover:text-tide">
                  {cleanup.site}
                </p>
                <p className="mono mt-1 text-[11px] text-muted">
                  {formatDate(cleanup.date)} · {cleanup.lead_name}
                </p>
              </div>
              <p className="mono hidden text-[11px] text-muted sm:block">
                {formatDate(cleanup.date)}
              </p>
              <p className="mono hidden text-[11px] text-muted sm:block">
                {cleanup.pair_count} {cleanup.pair_count === 1 ? "pair" : "pairs"}
              </p>
              <p className="mono hidden text-[11px] text-ink sm:block">
                {cleanup.confirmed_count}
              </p>
              <div>
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
