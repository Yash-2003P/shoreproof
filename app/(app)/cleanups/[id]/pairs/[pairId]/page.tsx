import Link from "next/link";
import { notFound } from "next/navigation";
import { ComparabilityChip } from "@/components/comparability-chip";
import { PairWorkspace } from "@/components/pair-workspace";
import { Stepper } from "@/components/stepper";
import { getClaimsForPair } from "@/lib/claims";
import { getPair } from "@/lib/cleanups";
import {
  getPairBlockers,
  getPairFramingDetail,
} from "@/lib/comparability";
import { detectorModelAvailable } from "@/lib/detector/model-status";
import { formatDate } from "@/lib/format";
import { getSuggestionsForPhoto } from "@/lib/suggestions";
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
  const claims = getClaimsForPair(pair.id);
  const suggestions = before ? getSuggestionsForPhoto(before.id) : [];
  const blockers = getPairBlockers(pair.id);
  const framing = getPairFramingDetail(pair.id);
  const pendingClaims = claims.filter((claim) => claim.status === "pending").length;
  const submitted = pendingClaims > 0;
  const currentStep = submitted
    ? 5
    : after && claims.length > 0 && pair.comparability
      ? 4
      : claims.length > 0
        ? 3
        : before
          ? 2
          : 1;
  const knownPhotos = getCurrentPhotosForCleanup(pair.cleanup_id)
    .filter((photo) => photo.pair_id !== pair.id)
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
          <span className="chip text-muted">
            {submitted
              ? "In review"
              : claims.length === 0
                ? "No claims"
                : `${claims.length} ${claims.length === 1 ? "claim" : "claims"}`}
          </span>
        </div>
      </header>

      <Stepper current={currentStep} />

      <PairWorkspace
        pair={pair}
        before={beforeSummary}
        after={afterSummary}
        initialClaims={claims}
        initialSuggestions={suggestions}
        modelAvailable={detectorModelAvailable()}
        comparability={pair.comparability}
        comparabilityReason={pair.comparability_reason}
        framingScore={pair.framing_score}
        framingWord={framing?.word ?? null}
        blockers={blockers}
        pendingClaims={pendingClaims}
        knownBefore={knownPhotos}
        knownAfter={knownPhotos}
      />
    </div>
  );
}
