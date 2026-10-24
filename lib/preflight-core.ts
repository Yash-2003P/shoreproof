export type CheckLevel = "pass" | "warn" | "fail";

export type PreflightNumbers = {
  width: number;
  height: number;
  longEdge: number;
  blurScore: number;
  exposureClipped: number;
  dhash: string;
};

export const BLUR_WARN_BELOW = 100;
export const EXPOSURE_WARN_ABOVE = 0.25;
export const MIN_LONG_EDGE = 1280;
export const NEAR_DUPLICATE_MAX = 8;
export const SIMILAR_MAX = 14;

/** Rec. 709 luma from RGBA bytes. */
export function rgbaToGrayscale(rgba: Uint8Array | Uint8ClampedArray): Uint8Array {
  const gray = new Uint8Array(rgba.length / 4);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 1) {
    gray[j] = Math.round(
      0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2],
    );
  }
  return gray;
}

/** Variance of the 4-neighbour Laplacian over the interior pixels. */
export function laplacianVariance(
  gray: Uint8Array,
  width: number,
  height: number,
): number {
  if (width < 3 || height < 3) return 0;

  let sum = 0;
  let sumSquares = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const center = gray[y * width + x];
      const lap =
        4 * center -
        gray[(y - 1) * width + x] -
        gray[(y + 1) * width + x] -
        gray[y * width + (x - 1)] -
        gray[y * width + (x + 1)];

      sum += lap;
      sumSquares += lap * lap;
      count += 1;
    }
  }

  if (count === 0) return 0;
  const mean = sum / count;
  return Math.max(0, sumSquares / count - mean * mean);
}

/** Share of pixels at or below 8 or at or above 247. */
export function clippedShare(gray: Uint8Array): number {
  if (gray.length === 0) return 0;
  let clipped = 0;
  for (const value of gray) {
    if (value <= 8 || value >= 247) clipped += 1;
  }
  return clipped / gray.length;
}

/**
 * 64-bit difference hash. Expects a grayscale buffer already resized to 9×8.
 * Bit order is row-major, left to right, most significant bit first.
 */
export function dhashFromGray(
  gray: Uint8Array,
  width = 9,
  height = 8,
): string {
  const bits: number[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      bits.push(gray[y * width + x] > gray[y * width + x + 1] ? 1 : 0);
    }
  }

  let hex = "";
  for (let i = 0; i < bits.length; i += 4) {
    let nibble = 0;
    for (let j = 0; j < 4; j += 1) {
      nibble = (nibble << 1) | (bits[i + j] ?? 0);
    }
    hex += nibble.toString(16);
  }
  return hex;
}

export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return Number.MAX_SAFE_INTEGER;

  let distance = 0;
  for (let i = 0; i < a.length; i += 1) {
    let value = Number.parseInt(a[i], 16) ^ Number.parseInt(b[i], 16);
    while (value > 0) {
      distance += value & 1;
      value >>= 1;
    }
  }
  return distance;
}

/** True when the hash carries texture information; flat images do not. */
export function isInformativeDhash(dhash: string): boolean {
  return dhash !== "0000000000000000" && dhash !== "ffffffffffffffff";
}

export function resolutionLevel(longEdge: number): CheckLevel {
  return longEdge >= MIN_LONG_EDGE ? "pass" : "warn";
}

export function blurLevel(score: number): CheckLevel {
  return score >= BLUR_WARN_BELOW ? "pass" : "warn";
}

export function exposureLevel(share: number): CheckLevel {
  return share <= EXPOSURE_WARN_ABOVE ? "pass" : "warn";
}

export type DuplicateLevel = "none" | "exact" | "likely" | "similar";

export function duplicateLevel(distance: number | null): DuplicateLevel {
  if (distance === null) return "none";
  if (distance === 0) return "exact";
  if (distance <= NEAR_DUPLICATE_MAX) return "likely";
  if (distance <= SIMILAR_MAX) return "similar";
  return "none";
}

export type DuplicateMatch = {
  level: "exact" | "likely" | "similar";
  distance: number;
  side: "before" | "after";
};

export function findDuplicateHash(
  local: { dhash: string; sha256: string },
  known: Array<{ dhash: string; sha256: string; side: "before" | "after" }>,
): DuplicateMatch | null {
  const exact = known.find((photo) => photo.sha256 === local.sha256);
  if (exact) {
    return { level: "exact", distance: 0, side: exact.side };
  }

  if (!isInformativeDhash(local.dhash)) {
    return null;
  }

  let best: DuplicateMatch | null = null;
  for (const photo of known) {
    if (!isInformativeDhash(photo.dhash)) continue;
    const distance = hammingDistance(local.dhash, photo.dhash);
    if (distance <= SIMILAR_MAX && (!best || distance < best.distance)) {
      best = {
        level: distance <= NEAR_DUPLICATE_MAX ? "likely" : "similar",
        distance,
        side: photo.side,
      };
    }
  }
  return best;
}
