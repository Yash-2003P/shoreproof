import {
  clippedShare,
  dhashFromGray,
  laplacianVariance,
  rgbaToGrayscale,
} from "./preflight-core";

export type ProvisionalPreflight = {
  width: number;
  height: number;
  longEdge: number;
  blurScore: number;
  exposureClipped: number;
  dhash: string;
  sha256: string;
};

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return toHex(digest);
}

function drawGrayscale(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  width: number,
  height: number,
): Uint8Array {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("The browser could not create a canvas for preflight.");
  }

  context.drawImage(
    source,
    0,
    0,
    sourceWidth,
    sourceHeight,
    0,
    0,
    width,
    height,
  );

  return rgbaToGrayscale(context.getImageData(0, 0, width, height).data);
}

export async function computeProvisionalPreflight(
  file: File,
): Promise<ProvisionalPreflight> {
  const buffer = await file.arrayBuffer();
  const sha256 = await sha256Hex(buffer);
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });

  try {
    const width = bitmap.width;
    const height = bitmap.height;
    const longEdge = Math.max(width, height);
    const scale = Math.min(1, 1024 / longEdge);
    const checkWidth = Math.max(1, Math.round(width * scale));
    const checkHeight = Math.max(1, Math.round(height * scale));

    const gray = drawGrayscale(
      bitmap,
      width,
      height,
      checkWidth,
      checkHeight,
    );
    const hashGray = drawGrayscale(bitmap, width, height, 9, 8);

    return {
      width,
      height,
      longEdge,
      blurScore: laplacianVariance(gray, checkWidth, checkHeight),
      exposureClipped: clippedShare(gray),
      dhash: dhashFromGray(hashGray, 9, 8),
      sha256,
    };
  } finally {
    bitmap.close();
  }
}
