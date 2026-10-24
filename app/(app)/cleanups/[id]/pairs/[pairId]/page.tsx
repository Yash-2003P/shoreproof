import Link from "next/link";
import { notFound } from "next/navigation";
import { ComparabilityChip } from "@/components/comparability-chip";
import { PhotoUploader } from "@/components/photo-uploader";
import { PreflightPanel } from "@/components/preflight-panel";
import { PrivacyPanel } from "@/components/privacy-panel";
import { Stepper } from "@/components/stepper";
import { getPair } from "@/lib/cleanups";
import { formatDate } from "@/lib/format";
import {
  getCurrentPhotos,
  getCurrentPhotosForCleanup,
  toPhotoSummary,
} from "@/lib/photos";

export const dynamic = "force-dynamic";

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

  const photos = getCurrentPhotos(pair.id);
  const before = photos.find((photo) => photo.side === "before") ?? null;
  const after = photos.find((photo) => photo.side === "after") ?? null;
  const beforeSummary = before ? toPhotoSummary(before) : null;
  const afterSummary = after ? toPhotoSummary(after) : null;
  const pairPath = `/cleanups/${pair.cleanup_id}/pairs/${pair.id}`;
  const currentStep = before ? 2 : 1;
  const cleanupPhotos = getCurrentPhotosForCleanup(pair.cleanup_id);
  const knownFor = (side: "before" | "after") =>
    cleanupPhotos
      .filter((photo) => !(photo.pair_id === pair.id && photo.side === side))
      .map((photo) => ({
        side: photo.side,
        dhash: photo.dhash,
        sha256: photo.sha256,
      }));

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

      <Stepper current={currentStep} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-label="Photo evidence">
          <div className="grid gap-3 sm:grid-cols-2">
            <PhotoUploader
              pairId={pair.id}
              side="before"
              title="Before"
              detail="The claim source. Every marked region lives here."
              photo={beforeSummary}
              knownPhotos={knownFor("before")}
            />
            <PhotoUploader
              pairId={pair.id}
              side="after"
              title="After"
              detail="Comparison evidence. Never the source of a claim."
              photo={afterSummary}
              knownPhotos={knownFor("after")}
            />
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

          <div className="mt-4 border border-line bg-wash p-4">
            <p className="field-label">Capture order</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              Before is the source of every claim. After is comparison evidence
              only. Replacing a photo re-runs every check and supersedes the old
              row; a photo that sources a confirmed claim cannot be replaced.
            </p>
          </div>
        </section>

        <aside className="space-y-3" aria-label="Evidence checks">
          <PrivacyPanel
            before={beforeSummary}
            after={afterSummary}
            pairPath={pairPath}
          />

          <PreflightPanel before={beforeSummary} after={afterSummary} />

          <section className="panel p-4">
            <p className="field-label">Claim</p>
            <p className="mt-2 text-sm leading-6 text-ink">No claims yet.</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              Mark a region on the before photo, then write one sentence about
              what you removed and from where.
            </p>
            <p className="mt-3 border-t border-line pt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
              Region marking arrives in the next slice
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
