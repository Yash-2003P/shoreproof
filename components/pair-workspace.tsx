"use client";

import { useState } from "react";
import { ClaimForm } from "@/components/claim-form";
import { Disclosure } from "@/components/disclosure";
import { ClaimList } from "@/components/claim-list";
import { CompareCanvas } from "@/components/compare-canvas";
import { ComparabilityPanel } from "@/components/comparability-panel";
import { PhotoUploader } from "@/components/photo-uploader";
import { PreflightPanel } from "@/components/preflight-panel";
import { PrivacyPanel } from "@/components/privacy-panel";
import { RegionOverlay } from "@/components/region-overlay";
import { SubmitPanel } from "@/components/submit-panel";
import { SuggestionPanel } from "@/components/suggestion-panel";
import {
  FULL_REGION,
  regionFromRow,
  type Region,
} from "@/lib/region";
import type { PairBlocker } from "@/lib/comparability";
import type {
  ClaimSummary,
  KnownPhotoHash,
  PairWithCleanup,
  PhotoSummary,
  SuggestionWithRun,
} from "@/lib/types";

type PairWorkspaceProps = {
  pair: PairWithCleanup;
  before: PhotoSummary | null;
  after: PhotoSummary | null;
  initialClaims: ClaimSummary[];
  initialSuggestions: SuggestionWithRun[];
  modelAvailable: boolean;
  comparability: "comparable" | "partial" | "not_comparable" | null;
  comparabilityReason: string | null;
  framingScore: number | null;
  framingWord: string | null;
  blockers: PairBlocker[];
  knownBefore: KnownPhotoHash[];
  knownAfter: KnownPhotoHash[];
};

export function PairWorkspace({
  pair,
  before,
  after,
  initialClaims,
  initialSuggestions,
  modelAvailable,
  comparability,
  comparabilityReason,
  framingScore,
  framingWord,
  blockers,
  knownBefore,
  knownAfter,
}: PairWorkspaceProps) {
  const [claims, setClaims] = useState<ClaimSummary[]>(initialClaims);
  const [suggestions, setSuggestions] =
    useState<SuggestionWithRun[]>(initialSuggestions);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<
    string | null
  >(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [text, setText] = useState("");
  const [category, setCategory] = useState("");

  const pairPath = `/cleanups/${pair.cleanup_id}/pairs/${pair.id}`;
  const selectedClaim =
    claims.find((claim) => claim.id === selectedId) ?? null;
  const regionEditable = selectedClaim
    ? selectedClaim.status === "draft"
    : true;
  const openSuggestions = suggestions.filter(
    (suggestion) => suggestion.status === "open",
  );

  function beginNew(nextRegion: Region | null = null) {
    if (selectedClaim) {
      setSelectedId(null);
      setText("");
      setCategory("");
    }
    setRegion(nextRegion);
  }

  function selectClaim(claim: ClaimSummary) {
    setSelectedId(claim.id);
    setRegion(regionFromRow(claim));
    setText(claim.text);
    setCategory(claim.category ?? "");
  }

  function markFull() {
    if (selectedClaim?.status === "draft") {
      setRegion(FULL_REGION);
      return;
    }
    beginNew(FULL_REGION);
  }

  function clearRegion() {
    setRegion(null);
  }

  function handleSaved(claim: ClaimSummary) {
    setClaims((current) => {
      const exists = current.some((item) => item.id === claim.id);
      if (!exists) return [...current, claim];
      return current.map((item) => (item.id === claim.id ? claim : item));
    });
    setSelectedId(claim.id);
    setRegion(regionFromRow(claim));
    setText(claim.text);
    setCategory(claim.category ?? "");
  }

  function handleDeleted(claimId: string) {
    setClaims((current) => current.filter((claim) => claim.id !== claimId));
    if (selectedId === claimId) {
      setSelectedId(null);
      setRegion(null);
      setText("");
      setCategory("");
    }
  }

  function selectSuggestion(suggestion: SuggestionWithRun) {
    setSelectedSuggestionId(suggestion.id);
    setSelectedId(null);
    setText("");
    setCategory(suggestion.icc_category ?? "");
    setRegion({
      x: suggestion.x,
      y: suggestion.y,
      w: suggestion.w,
      h: suggestion.h,
    });
  }

  function handleSuggestionsSaved(next: SuggestionWithRun[]) {
    setSuggestions(next);
    setSelectedSuggestionId(null);
  }

  function handleSuggestionAccepted(claim: ClaimSummary, suggestionId: string) {
    setSuggestions((current) =>
      current.map((suggestion) =>
        suggestion.id === suggestionId
          ? { ...suggestion, status: "accepted" }
          : suggestion,
      ),
    );
    setClaims((current) => {
      const exists = current.some((item) => item.id === claim.id);
      if (!exists) return [...current, claim];
      return current.map((item) => (item.id === claim.id ? claim : item));
    });
    setSelectedSuggestionId(null);
    setSelectedId(claim.id);
    setRegion(regionFromRow(claim));
    setText(claim.text);
    setCategory(claim.category ?? "");
  }

  function handleSuggestionRejected(suggestionId: string) {
    setSuggestions((current) =>
      current.map((suggestion) =>
        suggestion.id === suggestionId
          ? { ...suggestion, status: "rejected" }
          : suggestion,
      ),
    );
    if (selectedSuggestionId === suggestionId) {
      setSelectedSuggestionId(null);
      setRegion(null);
    }
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="contents min-w-0 lg:flex lg:flex-col lg:gap-5">
        <div className="order-1">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
            <div>
              <h2 className="heading-2">Mark what you removed</h2>
              <p className="meta-text mt-1">
                Draw a box on the before photo. One box, one sentence.
              </p>
            </div>
            <p className="text-xs text-muted">
              Drag to draw · arrow keys nudge
            </p>
          </div>

          {before ? (
            <div className="mt-4">
              <RegionOverlay
                photo={before}
                claims={claims}
                suggestions={openSuggestions.map((suggestion) => ({
                  id: suggestion.id,
                  x: suggestion.x,
                  y: suggestion.y,
                  w: suggestion.w,
                  h: suggestion.h,
                  label: `${suggestion.coco_class} ${suggestion.confidence.toFixed(2)}`,
                  selected: suggestion.id === selectedSuggestionId,
                }))}
                region={region}
                selectedId={selectedId}
                editable={regionEditable}
                onBeginNew={beginNew}
                onRegionChange={setRegion}
                onSelectClaim={selectClaim}
                onSelectSuggestion={(id) => {
                  const suggestion = openSuggestions.find(
                    (item) => item.id === id,
                  );
                  if (suggestion) selectSuggestion(suggestion);
                }}
              />
              <p className="mt-2.5 text-xs leading-5 text-muted">
                Coordinates are stored relative to the photo, so the region
                survives any display size. The before photo is the only claim
                source; the after photo is comparison evidence.
              </p>
            </div>
          ) : (
            <div className="mt-4 border border-dashed border-line-strong bg-wash p-6">
              <h3 className="heading-3">Add a before photo to begin.</h3>
              <p className="dense-text mt-1 text-muted">
                Every claim resolves to a rectangle on this photo. There is no
                claim without a region.
              </p>
            </div>
          )}
        </div>

        <div className="order-3">
          <div className="grid gap-5 sm:grid-cols-2">
            <PhotoUploader
              pairId={pair.id}
              side="before"
              title="Before"
              detail="The claim source. Every marked region lives here."
              photo={before}
              knownPhotos={knownBefore}
            />
            <PhotoUploader
              pairId={pair.id}
              side="after"
              title="After"
              detail="Comparison evidence. Never the source of a claim."
              photo={after}
              knownPhotos={knownAfter}
            />
          </div>

          {before && after ? (
            <div className="mt-5">
              <CompareCanvas before={before} after={after} />
            </div>
          ) : (
            <div className="panel mt-5 p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="panel-title">Compare</h3>
                <span className="chip text-muted">After photo needed</span>
              </div>
              <div className="mt-3 h-1.5 w-full bg-wash">
                <div className="h-1.5 w-1/2 bg-line" />
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">
                The before/after wipe unlocks when both photos exist. A framing
                signal will sit above it — a hint, not a verdict.
              </p>
            </div>
          )}

          <Disclosure
            title="How capture order works"
            meta="Before is the claim source; after is comparison evidence"
            className="mt-5"
          >
            <p className="text-sm leading-6 text-muted">
              Before is the source of every claim. After is comparison evidence
              only. Replacing a photo re-runs every check and supersedes the old
              row; a photo that sources a claim cannot be replaced until its
              drafts are removed.
            </p>
          </Disclosure>
        </div>
      </div>

      <div className="contents lg:flex lg:flex-col lg:gap-4">
        <div className="order-2 space-y-4">
          <ClaimForm
            pairId={pair.id}
            photoId={before?.id ?? null}
            selectedClaim={selectedClaim}
            region={region}
            text={text}
            category={category}
            onTextChange={setText}
            onCategoryChange={setCategory}
            onMarkFull={markFull}
            onClearRegion={clearRegion}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
          />

          <ClaimList
            claims={claims}
            selectedId={selectedId}
            onSelect={selectClaim}
          />
        </div>

        <div className="order-4 space-y-4">
          <ComparabilityPanel
            pairId={pair.id}
            state={comparability}
            reason={comparabilityReason}
            framingScore={framingScore}
            framingWord={framingWord}
            bothPhotosReady={Boolean(before && after)}
          />

          <PrivacyPanel before={before} after={after} pairPath={pairPath} />

          <SubmitPanel
            pairId={pair.id}
            blockers={blockers}
            draftClaims={claims.filter((claim) => claim.status === "draft").length}
            pendingClaims={
              claims.filter((claim) => claim.status === "pending").length
            }
            confirmedClaims={
              claims.filter((claim) => claim.status === "confirmed").length
            }
          />

          <PreflightPanel before={before} after={after} />

          <SuggestionPanel
            pairId={pair.id}
            photoId={before?.id ?? null}
            modelAvailable={modelAvailable}
            initialSuggestions={initialSuggestions}
            selectedSuggestionId={selectedSuggestionId}
            editedRegion={region}
            onSuggestionsSaved={handleSuggestionsSaved}
            onSuggestionAccepted={handleSuggestionAccepted}
            onSuggestionRejected={handleSuggestionRejected}
            onSelectSuggestion={selectSuggestion}
          />
        </div>
      </div>
    </div>
  );
}
