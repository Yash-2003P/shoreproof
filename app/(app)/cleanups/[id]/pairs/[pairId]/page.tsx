import { notFound } from "next/navigation";
import { ComparabilityChip } from "@/components/comparability-chip";
import { Breadcrumbs, PageHeader } from "@/components/page-header";
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

export const metadata = {
  title: "Pair workspace",
};

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
  const reviewed = claims.length > 0 && claims.every((claim) => claim.status === "confirmed");
  const submitted = claims.some((claim) => claim.status !== "draft");
  const currentStep = submitted
    ? 4
    : after && claims.length > 0 && pair.comparability
      ? 3
      : claims.length > 0
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
    <div className="page page-wide">
      <Breadcrumbs
        items={[
          { label: "Cleanups", href: "/cleanups" },
          { label: pair.cleanup_site, href: `/cleanups/${pair.cleanup_id}` },
          { label: pair.label },
        ]}
      />

      <div className="mt-5">
        <PageHeader
          size="section"
          title={pair.label}
          meta={
            <span>
              {pair.cleanup_site} · {formatDate(pair.cleanup_date)}
            </span>
          }
          description="Mark what you removed on the before photo, write one sentence, then compare and submit it for review."
          actions={
            <>
              <ComparabilityChip value={pair.comparability} />
              <span className="chip text-muted">
                {pendingClaims > 0
                  ? "In review"
                  : reviewed
                    ? "Reviewed"
                    : claims.length === 0
                      ? "No claims"
                      : `${claims.length} ${claims.length === 1 ? "claim" : "claims"}`}
              </span>
            </>
          }
        />
      </div>

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
        knownBefore={knownPhotos}
        knownAfter={knownPhotos}
      />
    </div>
  );
}
