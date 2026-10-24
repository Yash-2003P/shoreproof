"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  clamp01,
  formatRegion,
  moveRegion,
  nudgeRegion,
  regionFromDrag,
  regionFromRow,
  resizeRegion,
  type Region,
  type RegionHandle,
} from "@/lib/region";
import type { ClaimSummary } from "@/lib/types";

type ContentBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type DragState =
  | { kind: "draw"; startX: number; startY: number; begun: boolean }
  | { kind: "move"; startX: number; startY: number; region: Region }
  | {
      kind: "resize";
      startX: number;
      startY: number;
      region: Region;
      handle: RegionHandle;
    };

type RegionOverlayProps = {
  photo: { id: string; width: number; height: number };
  claims: ClaimSummary[];
  region: Region | null;
  selectedId: string | null;
  editable: boolean;
  onBeginNew: (region: Region) => void;
  onRegionChange: (region: Region) => void;
  onSelectClaim: (claim: ClaimSummary) => void;
};

const HANDLES: Array<{
  handle: RegionHandle;
  left: (region: Region) => number;
  top: (region: Region) => number;
  cursor: string;
}> = [
  {
    handle: "nw",
    left: (region) => region.x,
    top: (region) => region.y,
    cursor: "nwse-resize",
  },
  {
    handle: "ne",
    left: (region) => region.x + region.w,
    top: (region) => region.y,
    cursor: "nesw-resize",
  },
  {
    handle: "sw",
    left: (region) => region.x,
    top: (region) => region.y + region.h,
    cursor: "nesw-resize",
  },
  {
    handle: "se",
    left: (region) => region.x + region.w,
    top: (region) => region.y + region.h,
    cursor: "nwse-resize",
  },
];

function contains(region: Region, x: number, y: number): boolean {
  return (
    x >= region.x &&
    x <= region.x + region.w &&
    y >= region.y &&
    y <= region.y + region.h
  );
}

export function RegionOverlay({
  photo,
  claims,
  region,
  selectedId,
  editable,
  onBeginNew,
  onRegionChange,
  onSelectClaim,
}: RegionOverlayProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [contentBox, setContentBox] = useState<ContentBox | null>(null);

  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;

    const measure = () => {
      const rect = image.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const naturalRatio =
        photo.width > 0 && photo.height > 0
          ? photo.width / photo.height
          : rect.width / rect.height;
      const boxRatio = rect.width / rect.height;

      let width = rect.width;
      let height = rect.height;
      let left = 0;
      let top = 0;

      if (boxRatio > naturalRatio) {
        width = rect.height * naturalRatio;
        left = (rect.width - width) / 2;
      } else {
        height = rect.width / naturalRatio;
        top = (rect.height - height) / 2;
      }

      setContentBox({ left, top, width, height });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(image);
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [photo.width, photo.height]);

  function pointFromEvent(
    event: ReactPointerEvent<HTMLDivElement>,
  ): { x: number; y: number } {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) {
      return { x: 0, y: 0 };
    }
    return {
      x: clamp01((event.clientX - rect.left) / rect.width),
      y: clamp01((event.clientY - rect.top) / rect.height),
    };
  }

  function claimAt(x: number, y: number): ClaimSummary | null {
    for (let index = claims.length - 1; index >= 0; index -= 1) {
      const claim = claims[index];
      const claimRegion = regionFromRow(claim);
      if (claimRegion && contains(claimRegion, x, y)) {
        return claim;
      }
    }
    return null;
  }

  function capture(event: ReactPointerEvent<HTMLDivElement>) {
    overlayRef.current?.setPointerCapture(event.pointerId);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const point = pointFromEvent(event);

    if (editable && region && contains(region, point.x, point.y)) {
      dragRef.current = {
        kind: "move",
        startX: point.x,
        startY: point.y,
        region,
      };
      capture(event);
      event.preventDefault();
      return;
    }

    const hit = claimAt(point.x, point.y);
    if (hit) {
      onSelectClaim(hit);
      const hitRegion = regionFromRow(hit);
      if (editable && hitRegion && hit.status === "draft") {
        dragRef.current = {
          kind: "move",
          startX: point.x,
          startY: point.y,
          region: hitRegion,
        };
        capture(event);
      }
      event.preventDefault();
      return;
    }

    if (!editable) return;

    dragRef.current = {
      kind: "draw",
      startX: point.x,
      startY: point.y,
      begun: false,
    };
    capture(event);
    event.preventDefault();
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const point = pointFromEvent(event);

    if (drag.kind === "draw") {
      if (!drag.begun) {
        if (
          Math.abs(point.x - drag.startX) < 0.004 &&
          Math.abs(point.y - drag.startY) < 0.004
        ) {
          return;
        }
        drag.begun = true;
        onBeginNew(
          regionFromDrag(drag.startX, drag.startY, point.x, point.y),
        );
        return;
      }

      onRegionChange(
        regionFromDrag(drag.startX, drag.startY, point.x, point.y),
      );
      return;
    }

    if (drag.kind === "move") {
      onRegionChange(
        moveRegion(
          drag.region,
          point.x - drag.startX,
          point.y - drag.startY,
        ),
      );
      return;
    }

    onRegionChange(
      resizeRegion(
        drag.region,
        drag.handle,
        point.x - drag.startX,
        point.y - drag.startY,
      ),
    );
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current) {
      dragRef.current = null;
      overlayRef.current?.releasePointerCapture(event.pointerId);
    }
  }

  function startResize(
    event: ReactPointerEvent<HTMLDivElement>,
    handle: RegionHandle,
  ) {
    if (!editable || !region) return;
    event.stopPropagation();
    event.preventDefault();
    const point = pointFromEvent(event);
    dragRef.current = {
      kind: "resize",
      startX: point.x,
      startY: point.y,
      region,
      handle,
    };
    capture(event);
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!editable || !region) return;
    const step = event.shiftKey ? 0.02 : 0.002;
    let deltaX = 0;
    let deltaY = 0;

    switch (event.key) {
      case "ArrowLeft":
        deltaX = -step;
        break;
      case "ArrowRight":
        deltaX = step;
        break;
      case "ArrowUp":
        deltaY = -step;
        break;
      case "ArrowDown":
        deltaY = step;
        break;
      default:
        return;
    }

    event.preventDefault();
    onRegionChange(nudgeRegion(region, deltaX, deltaY));
  }

  return (
    <div
      className="relative w-full overflow-hidden border border-line bg-ink"
      style={{ height: "clamp(300px, 58vh, 660px)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src={`/api/photos/${photo.id}`}
        alt="Before photo for marking a claim region"
        className="h-full w-full select-none object-contain"
        draggable={false}
      />

      {contentBox ? (
        <div
          ref={overlayRef}
          role="group"
          aria-label="Region editor. Drag to draw a region. Arrow keys nudge the selected region. Hold shift for a larger step."
          tabIndex={0}
          className={`absolute touch-none outline-none ${
            editable ? "cursor-crosshair" : "cursor-default"
          }`}
          style={{
            left: contentBox.left,
            top: contentBox.top,
            width: contentBox.width,
            height: contentBox.height,
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleKeyDown}
        >
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {claims.map((claim) => {
              const claimRegion = regionFromRow(claim);
              if (!claimRegion) return null;
              const selected = claim.id === selectedId;

              return (
                <rect
                  key={claim.id}
                  x={claimRegion.x}
                  y={claimRegion.y}
                  width={claimRegion.w}
                  height={claimRegion.h}
                  fill={selected ? "rgba(228, 87, 46, 0.12)" : "rgba(28, 107, 112, 0.10)"}
                  stroke={selected ? "#e4572e" : "#1c6b70"}
                  strokeWidth={selected ? 2 : 1.25}
                  strokeDasharray={selected ? undefined : "5 4"}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}

            {region ? (
              <rect
                x={region.x}
                y={region.y}
                width={region.w}
                height={region.h}
                fill="rgba(28, 107, 112, 0.16)"
                stroke="#0e2433"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
          </svg>

          {claims.map((claim, index) => {
            const claimRegion = regionFromRow(claim);
            if (!claimRegion) return null;

            return (
              <span
                key={claim.id}
                aria-hidden="true"
                className={`pointer-events-none absolute px-1 py-0.5 font-mono text-[9px] leading-none ${
                  claim.id === selectedId
                    ? "bg-flag text-white"
                    : "bg-ink/85 text-salt"
                }`}
                style={{
                  left: `${claimRegion.x * 100}%`,
                  top: `${claimRegion.y * 100}%`,
                }}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
            );
          })}

          {editable && region
            ? HANDLES.map((item) => (
                <div
                  key={item.handle}
                  role="presentation"
                  aria-hidden="true"
                  className="absolute z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 border border-paper bg-tide shadow-sm"
                  style={{
                    left: `${item.left(region) * 100}%`,
                    top: `${item.top(region) * 100}%`,
                    cursor: item.cursor,
                  }}
                  onPointerDown={(event) =>
                    startResize(event, item.handle)
                  }
                />
              ))
            : null}

          {region ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-2 left-2 bg-paper/95 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-ink"
            >
              {formatRegion(region)}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between gap-2 p-2">
        <span className="bg-ink/85 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-salt">
          Before · claim source
        </span>
        <span className="bg-paper/90 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-ink">
          {claims.length} {claims.length === 1 ? "claim" : "claims"}
        </span>
      </div>
    </div>
  );
}
