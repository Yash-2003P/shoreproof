export type Region = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type RegionHandle = "nw" | "ne" | "sw" | "se";

export const MIN_REGION = 0.02;
export const FULL_REGION: Region = { x: 0, y: 0, w: 1, h: 1 };

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Normalized coordinates beyond six decimals are below a pixel. */
function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function roundRegion(region: Region): Region {
  return {
    x: round6(region.x),
    y: round6(region.y),
    w: round6(region.w),
    h: round6(region.h),
  };
}

export function isValidRegion(region: Region): boolean {
  const values = [region.x, region.y, region.w, region.h];
  if (!values.every((value) => Number.isFinite(value))) return false;

  return (
    region.x >= 0 &&
    region.y >= 0 &&
    region.w >= MIN_REGION &&
    region.h >= MIN_REGION &&
    region.x + region.w <= 1.000001 &&
    region.y + region.h <= 1.000001
  );
}

/** Clamp a region into the image and enforce the minimum size. */
export function clampRegion(region: Region): Region {
  const w = clamp(region.w, MIN_REGION, 1);
  const h = clamp(region.h, MIN_REGION, 1);
  const x = clamp(region.x, 0, 1 - w);
  const y = clamp(region.y, 0, 1 - h);

  return roundRegion({ x, y, w, h });
}

/** Turn a drag between two normalized points into a positive region. */
export function regionFromDrag(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): Region {
  const ax = clamp01(startX);
  const ay = clamp01(startY);
  const bx = clamp01(endX);
  const by = clamp01(endY);

  let left = Math.min(ax, bx);
  let right = Math.max(ax, bx);
  let top = Math.min(ay, by);
  let bottom = Math.max(ay, by);

  if (right - left < MIN_REGION) {
    if (left + MIN_REGION <= 1) {
      right = left + MIN_REGION;
    } else {
      left = 1 - MIN_REGION;
      right = 1;
    }
  }

  if (bottom - top < MIN_REGION) {
    if (top + MIN_REGION <= 1) {
      bottom = top + MIN_REGION;
    } else {
      top = 1 - MIN_REGION;
      bottom = 1;
    }
  }

  return roundRegion({ x: left, y: top, w: right - left, h: bottom - top });
}

export function moveRegion(
  region: Region,
  deltaX: number,
  deltaY: number,
): Region {
  return clampRegion({
    ...region,
    x: region.x + deltaX,
    y: region.y + deltaY,
  });
}

export function resizeRegion(
  region: Region,
  handle: RegionHandle,
  deltaX: number,
  deltaY: number,
): Region {
  let left = region.x;
  let top = region.y;
  let right = region.x + region.w;
  let bottom = region.y + region.h;

  if (handle === "nw" || handle === "sw") {
    left = clamp(region.x + deltaX, 0, right - MIN_REGION);
  }
  if (handle === "ne" || handle === "se") {
    right = clamp(
      region.x + region.w + deltaX,
      left + MIN_REGION,
      1,
    );
  }
  if (handle === "nw" || handle === "ne") {
    top = clamp(region.y + deltaY, 0, bottom - MIN_REGION);
  }
  if (handle === "sw" || handle === "se") {
    bottom = clamp(
      region.y + region.h + deltaY,
      top + MIN_REGION,
      1,
    );
  }

  return roundRegion({ x: left, y: top, w: right - left, h: bottom - top });
}

export function nudgeRegion(
  region: Region,
  deltaX: number,
  deltaY: number,
): Region {
  return moveRegion(region, deltaX, deltaY);
}

export function regionFromRow(row: {
  x: number | null;
  y: number | null;
  w: number | null;
  h: number | null;
}): Region | null {
  if (
    row.x === null ||
    row.y === null ||
    row.w === null ||
    row.h === null
  ) {
    return null;
  }

  const region = { x: row.x, y: row.y, w: row.w, h: row.h };
  return isValidRegion(region) ? region : null;
}

export function formatRegion(region: Region): string {
  const x = Math.round(region.x * 100);
  const y = Math.round(region.y * 100);
  const w = Math.round(region.w * 100);
  const h = Math.round(region.h * 100);
  return `x ${x}% · y ${y}% · ${w}% × ${h}%`;
}
