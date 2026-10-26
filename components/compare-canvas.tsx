"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { PhotoSummary } from "@/lib/types";

type CompareCanvasProps = {
  before: PhotoSummary;
  after: PhotoSummary;
};

/**
 * A before/after wipe for the same spot. The divider is draggable with a
 * pointer and with the arrow keys through the range control underneath.
 */
export function CompareCanvas({ before, after }: CompareCanvasProps) {
  const [position, setPosition] = useState(50);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  function positionFromClientX(clientX: number): number {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return position;
    const raw = ((clientX - rect.left) / rect.width) * 100;
    return Math.min(100, Math.max(0, raw));
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    dragging.current = true;
    frameRef.current?.setPointerCapture(event.pointerId);
    setPosition(positionFromClientX(event.clientX));
    event.preventDefault();
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    setPosition(positionFromClientX(event.clientX));
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    dragging.current = false;
    frameRef.current?.releasePointerCapture(event.pointerId);
  }

  return (
    <section aria-label="Compare before and after">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <h3 className="panel-title">Compare</h3>
        <p className="text-xs text-muted">
          Drag the divider · arrow keys move it
        </p>
      </div>

      <div
        ref={frameRef}
        className="relative w-full cursor-ew-resize overflow-hidden border border-line bg-ink"
        style={{ height: "clamp(260px, 46vh, 520px)" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/photos/${before.id}`}
          alt="Before photo"
          className="h-full w-full select-none object-contain"
          draggable={false}
        />

        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 0 0 ${position}%)` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/photos/${after.id}`}
            alt="After photo"
            className="h-full w-full select-none object-contain"
            draggable={false}
          />
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-paper shadow-[0_0_0_1px_rgba(14,36,51,0.5)]"
          style={{ left: `${position}%` }}
          aria-hidden="true"
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between gap-2 p-2">
          <span className="bg-ink/85 px-2.5 py-1.5 text-xs font-medium text-salt">
            Before
          </span>
          <span className="bg-paper/90 px-2.5 py-1.5 text-xs font-medium text-ink">
            After
          </span>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <label htmlFor="compare-position" className="text-xs text-muted">
          Wipe position
        </label>
        <input
          id="compare-position"
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(position)}
          onChange={(event) => setPosition(Number(event.target.value))}
          className="h-11 min-w-0 flex-1 accent-[var(--tide)]"
        />
        <span className="mono w-10 text-right text-xs text-muted">
          {Math.round(position)}%
        </span>
      </div>

      <p className="mt-1 text-xs leading-5 text-muted">
        The wipe is a visual aid. The claim always points at the before photo,
        and the after photo is comparison evidence.
      </p>
    </section>
  );
}
