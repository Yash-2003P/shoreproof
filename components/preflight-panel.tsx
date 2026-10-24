import {
  blurLevel,
  duplicateLevel,
  exposureLevel,
  resolutionLevel,
  type CheckLevel,
} from "@/lib/preflight-core";
import type { PhotoSummary } from "@/lib/types";

function LevelChip({ level }: { level: CheckLevel }) {
  if (level === "pass") {
    return <span className="chip chip-tide">Pass</span>;
  }
  return <span className="chip chip-flag">Warn</span>;
}

function Row({
  label,
  value,
  level,
  detail,
}: {
  label: string;
  value: string;
  level?: CheckLevel;
  detail?: string;
}) {
  return (
    <div className="border-b border-line py-2 last:border-0">
      <div className="flex items-center justify-between gap-2">
        <span className="field-label">{label}</span>
        {level ? <LevelChip level={level} /> : null}
      </div>
      <p className="mono mt-1 text-[10px] text-ink">{value}</p>
      {detail ? (
        <p className="mt-0.5 text-[10px] leading-4 text-muted">{detail}</p>
      ) : null}
    </div>
  );
}

function PhotoChecks({ photo, side }: { photo: PhotoSummary | null; side: string }) {
  if (!photo) {
    return (
      <div className="py-2">
        <p className="field-label">{side}</p>
        <p className="mt-1 text-xs leading-5 text-muted">
          Checks run when a photo is added.
        </p>
      </div>
    );
  }

  const duplicate = duplicateLevel(photo.near_duplicate_distance);

  return (
    <div className="py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="field-label">{side}</p>
        <span className="mono text-[10px] text-muted">
          {photo.sha256.slice(0, 8)}…
        </span>
      </div>
      <div className="mt-1">
        <Row
          label="Resolution"
          value={`${photo.width} × ${photo.height} px`}
          level={resolutionLevel(Math.max(photo.width, photo.height))}
          detail="Warn below 1,280 px on the long edge."
        />
        <Row
          label="Blur"
          value={`Laplacian ${Math.round(photo.blur_score)}`}
          level={blurLevel(photo.blur_score)}
          detail="Warn below 100. A hint, not a rejection."
        />
        <Row
          label="Exposure"
          value={`${(photo.exposure_clipped * 100).toFixed(1)}% clipped`}
          level={exposureLevel(photo.exposure_clipped)}
          detail="Warn above 25% at the darkest or brightest ends."
        />
        <Row
          label="Duplicate"
          value={
            duplicate === "exact"
              ? "Exact duplicate"
              : duplicate === "likely"
                ? `Likely duplicate · distance ${photo.near_duplicate_distance}`
                : duplicate === "similar"
                  ? `Similar shot · distance ${photo.near_duplicate_distance}`
                  : "No duplicate found"
          }
          level={duplicate === "none" ? "pass" : "warn"}
          detail="dHash comparison against current photos in this cleanup."
        />
      </div>
    </div>
  );
}

export function PreflightPanel({
  before,
  after,
}: {
  before: PhotoSummary | null;
  after: PhotoSummary | null;
}) {
  return (
    <section className="panel p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="field-label">Preflight</p>
        <span className="mono text-[9px] uppercase tracking-[0.1em] text-muted">
          Server canonical
        </span>
      </div>
      <div className="mt-2 divide-y divide-line">
        <PhotoChecks photo={before} side="Before" />
        <PhotoChecks photo={after} side="After" />
      </div>
      <p className="mt-3 text-xs leading-5 text-muted">
        A warning never blocks the upload. It stays attached to the photo and
        can become a review flag.
      </p>
    </section>
  );
}
