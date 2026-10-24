import sharp from "sharp";
import {
  clippedShare,
  dhashFromGray,
  laplacianVariance,
  type PreflightNumbers,
} from "./preflight-core";

export async function preflightFromBuffer(
  data: Buffer,
): Promise<PreflightNumbers> {
  const metadata = await sharp(data).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  const { data: gray, info } = await sharp(data)
    .resize({
      width: 1024,
      height: 1024,
      fit: "inside",
      withoutEnlargement: true,
    })
    .grayscale()
    .toColourspace("b-w")
    .raw()
    .toBuffer({ resolveWithObject: true });

  const blurScore = laplacianVariance(gray, info.width, info.height);
  const exposureClipped = clippedShare(gray);

  const { data: hashRaw } = await sharp(data)
    .resize({ width: 9, height: 8, fit: "fill" })
    .grayscale()
    .toColourspace("b-w")
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    width,
    height,
    longEdge: Math.max(width, height),
    blurScore,
    exposureClipped,
    dhash: dhashFromGray(hashRaw, 9, 8),
  };
}
