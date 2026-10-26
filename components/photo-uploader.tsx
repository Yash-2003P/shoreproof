"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { KnownPhotoHash, PhotoSummary } from "@/lib/types";
import type { ProvisionalPreflight } from "@/lib/preflight-client";
import { computeProvisionalPreflight } from "@/lib/preflight-client";
import { duplicateLevel, findDuplicateHash } from "@/lib/preflight-core";

type PhotoUploaderProps = {
  pairId: string;
  side: "before" | "after";
  title: string;
  detail: string;
  photo: PhotoSummary | null;
  knownPhotos: KnownPhotoHash[];
};

type LocalCheck = ProvisionalPreflight & {
  duplicate: ReturnType<typeof findDuplicateHash>;
};

const MAX_BYTES = 20 * 1024 * 1024;


export function PhotoUploader({
  pairId,
  side,
  title,
  detail,
  photo,
  knownPhotos,
}: PhotoUploaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provisional, setProvisional] = useState<LocalCheck | null>(null);
  const [peopleVisible, setPeopleVisible] = useState(false);

  async function upload(file: File) {
    setError(null);
    setProvisional(null);

    if (file.size > MAX_BYTES) {
      setError("That photo is larger than 20 MB. Export a smaller copy.");
      return;
    }

    if (
      file.type.includes("heic") ||
      file.type.includes("heif") ||
      file.name.toLowerCase().endsWith(".heic") ||
      file.name.toLowerCase().endsWith(".heif")
    ) {
      setError(
        "HEIC is not accepted. On an iPhone, export the photo as JPEG first.",
      );
      return;
    }

    setUploading(true);

    try {
      const local = await computeProvisionalPreflight(file);
      setProvisional({
        ...local,
        duplicate: findDuplicateHash(local, knownPhotos),
      });
    } catch {
      // The server still runs the canonical checks. A browser that cannot
      // decode the file should not stop the upload.
    }

    try {
      const body = new FormData();
      body.append("file", file);
      body.append("side", side);
      body.append("peopleVisible", peopleVisible ? "1" : "0");

      const response = await fetch(`/api/pairs/${pairId}/photos`, {
        method: "POST",
        body,
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "The photo could not be stored.");
        setUploading(false);
        return;
      }

      setUploading(false);
      setPeopleVisible(false);
      router.refresh();
    } catch {
      setError("The upload was interrupted. Check the connection and try again.");
      setUploading(false);
    }
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) {
      void upload(file);
    }
  }

  const duplicate = photo
    ? duplicateLevel(photo.near_duplicate_distance)
    : "none";

  return (
    <section className="panel overflow-hidden" aria-label={`${title} photo`}>
      <div
        className={`relative flex aspect-[4/3] items-center justify-center bg-wash transition-colors ${
          dragActive ? "bg-tide/10 ring-2 ring-inset ring-tide" : ""
        }`}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          handleFiles(event.dataTransfer.files);
        }}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/photos/${photo.id}`}
            alt={`${title} photo for this pair`}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <span className="field-label">{title}</span>
            <span className="text-base font-medium text-ink">No photo yet</span>
            <span className="max-w-[18rem] text-sm leading-6 text-muted">
              {detail}
            </span>
            <button
              type="button"
              className="btn btn-ghost mt-3"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              Choose a photo
            </button>
          </div>
        )}

        {uploading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink/70 px-6 text-center text-salt">
            <span className="text-sm font-semibold">
              Sanitizing and checking
            </span>
            <span className="text-xs text-salt/85">
              The original upload is discarded.
            </span>
            <div className="mt-1 h-1 w-40 overflow-hidden bg-salt/20">
              <div className="h-1 w-1/2 animate-pulse bg-salt" />
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-t border-line p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="field-label">{title}</p>
            <p className="mono mt-0.5 text-xs text-muted">
              {photo
                ? `${photo.width} × ${photo.height} px · ${Math.round(
                    photo.bytes / 1024,
                  )} KB`
                : "JPEG, PNG, or WebP · up to 20 MB"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {photo ? (
              <span className="chip chip-tide">Stored</span>
            ) : (
              <span className="chip text-muted">Empty</span>
            )}
            {photo ? (
              <button
                type="button"
                className="btn btn-ghost px-3"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
              >
                Replace
              </button>
            ) : null}
          </div>
        </div>

        {photo ? (
          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-line pt-3">
            <p className="mono text-xs text-muted">
              Blur {Math.round(photo.blur_score)}
            </p>
            <p className="mono text-xs text-muted">
              Exposure {(photo.exposure_clipped * 100).toFixed(1)}%
            </p>
            <p className="mono text-xs text-muted">
              SHA {photo.sha256.slice(0, 10)}…
            </p>
            <p className="mono text-xs text-muted">
              People visible {photo.people_visible === 1 ? "yes" : "no"}
            </p>
            {duplicate !== "none" ? (
              <p className="col-span-2 mono text-xs text-flag-ink">
                {duplicate === "exact"
                  ? "Exact duplicate of another photo in this cleanup."
                  : duplicate === "likely"
                    ? "Likely duplicate of another photo in this cleanup."
                    : "Similar to another photo in this cleanup."}
              </p>
            ) : null}
          </div>
        ) : (
          <label className="mt-3 flex cursor-pointer items-start gap-2.5 border-t border-line pt-3">
            <input
              type="checkbox"
              checked={peopleVisible}
              onChange={(event) => setPeopleVisible(event.target.checked)}
              className="mt-0.5 shrink-0 accent-[var(--tide)]"
            />
            <span className="text-xs leading-5 text-muted">
              Anyone identifiable is visible in this photo. It will be stored,
              but it cannot be confirmed, exported, or published until replaced.
            </span>
          </label>
        )}

        {provisional ? (
          <div className="mt-3 border border-line bg-paper px-3.5 py-3">
            <p className="field-label">Local preflight · provisional</p>
            <p className="mono mt-1 text-xs leading-5 text-ink">
              {provisional.width} × {provisional.height} · blur{" "}
              {Math.round(provisional.blurScore)} · exposure{" "}
              {(provisional.exposureClipped * 100).toFixed(1)}% · dHash{" "}
              {provisional.dhash.slice(0, 8)}
            </p>
            <p className="mono mt-1 text-xs text-ink">
              Duplicate:{" "}
              {provisional.duplicate
                ? `${provisional.duplicate.level} · ${provisional.duplicate.side} photo · distance ${provisional.duplicate.distance}`
                : "none"}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">
              The server repeats these checks on the sanitized file and stores
              the canonical numbers.
            </p>
          </div>
        ) : null}

        {error ? (
          <p className="field-error" role="alert">
            {error}
          </p>
        ) : null}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>
    </section>
  );
}
