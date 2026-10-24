import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ComparabilityChip } from "@/components/comparability-chip";
import { Stepper } from "@/components/stepper";
import { getPair } from "@/lib/cleanups";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

function RailPanel({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="panel p-4">
      <p className="field-label">{label}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function RailRow({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-1.5 last:border-0">
      <span className="field-label">{term}</span>
      <span className="mono text-[10px] text-ink">{value}</span>
    </div>
  );
}

export default async function PairWorkspacePage({
  params,
}: {
  params: Promise<{ id: string; pairId: string }>;
}) {
  const { id, pairId } = await params;
  const pair = getPair(id, pairId);

  if (!pair) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-6">
      <nav className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
        <Link href="/cleanups" className="hover:text-ink">
          Cleanups
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={`/cleanups/${pair.cleanup_id}`} className="hover:text-ink">
          {pair.cleanup_site}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink">{pair.label}</span>
      </nav>

      <header className="mt-4 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <p className="field-label">Pair workspace</p>
          <h1 className="mt-1 font-serif text-3xl leading-tight text-ink">
            {pair.label}
          </h1>
          <p className="mono mt-1 text-[11px] text-muted">
            {pair.cleanup_site} · {formatDate(pair.cleanup_date)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ComparabilityChip value={pair.comparability} />
          <span className="chip text-muted">Not submitted</span>
        </div>
      </header>

      <Stepper current={1} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-label="Photo evidence">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="photo-slot px-4">
              <span className="field-label">Before</span>
              <span className="text-sm text-ink">No photo yet</span>
              <span className="max-w-[15rem] text-xs leading-5 text-muted">
                The claim source. Every marked region lives here.
              </span>
            </div>
            <div className="photo-slot px-4">
              <span className="field-label">After</span>
              <span className="text-sm text-ink">No photo yet</span>
              <span className="max-w-[15rem] text-xs leading-5 text-muted">
                Comparison evidence. Never the source of a claim.
              </span>
            </div>
          </div>

          <div className="panel mt-4 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="field-label">Compare</p>
              <span className="chip text-muted">Not ready</span>
            </div>
            <div className="mt-3 h-1.5 w-full bg-wash">
              <div className="h-1.5 w-1/2 bg-line" />
            </div>
            <p className="mt-2 text-xs leading-5 text-muted">
              The before/after wipe unlocks when both photos exist. A framing
              signal will sit above it — a hint, not a verdict.
            </p>
          </div>
        </section>

        <aside className="space-y-3" aria-label="Evidence checks">
          <RailPanel label="Privacy">
            <RailRow term="Metadata" value="Not checked" />
            <RailRow term="People visible" value="Not set" />
            <RailRow term="Public use" value="Blocked" />
            <p className="mt-3 text-xs leading-5 text-muted">
              EXIF and GPS are stripped before a photo is stored. The original
              bytes are discarded.
            </p>
          </RailPanel>

          <RailPanel label="Preflight">
            <RailRow term="Resolution" value="—" />
            <RailRow term="Blur" value="—" />
            <RailRow term="Exposure" value="—" />
            <RailRow term="Duplicate" value="—" />
            <p className="mt-3 text-xs leading-5 text-muted">
              Checks run when a photo is added. A warning never blocks the
              upload; it stays attached to the photo.
            </p>
          </RailPanel>

          <RailPanel label="Claim">
            <p className="text-sm leading-6 text-ink">No claims yet.</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              Mark a region on the before photo, then write one sentence about
              what you removed and from where.
            </p>
          </RailPanel>
        </aside>
      </div>
    </div>
  );
}
