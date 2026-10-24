import { createHash } from "node:crypto";
import sharp, { type Metadata, type OutputInfo } from "sharp";

export class PhotoError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "PhotoError";
    this.status = status;
  }
}

export function sha256(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

export type SanitizedPhoto = {
  data: Buffer;
  thumb: Buffer;
  width: number;
  height: number;
  originalSha256: string;
  sha256: string;
};

const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp"]);

export async function sanitizePhoto(input: Buffer): Promise<SanitizedPhoto> {
  let format: string | undefined;
  try {
    const metadata = await sharp(input, {
      limitInputPixels: 40_000_000,
      failOn: "error",
    }).metadata();
    format = metadata.format;
  } catch {
    throw new PhotoError(
      "That file could not be read as a photo. Use a JPEG, PNG, or WebP image.",
      415,
    );
  }

  if (!format || !ACCEPTED_FORMATS.has(format)) {
    throw new PhotoError(
      "Only JPEG, PNG, and WebP images are accepted. HEIC from an iPhone must be exported as JPEG first.",
      415,
    );
  }

  const originalSha256 = sha256(input);

  let output: { data: Buffer; info: OutputInfo };
  try {
    output = await sharp(input, {
      limitInputPixels: 40_000_000,
      failOn: "error",
    })
      .rotate()
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new PhotoError(
      "That photo could not be converted safely. Try exporting it again as a JPEG.",
      422,
    );
  }

  const stored = await sharp(output.data).metadata();
  const storedGps = (stored as Metadata & { gps?: Buffer }).gps;
  if (stored.exif || storedGps) {
    throw new PhotoError(
      "Metadata stripping failed, so this photo was not stored. Try a different file.",
      422,
    );
  }

  const thumb = await sharp(output.data)
    .resize({
      width: 640,
      height: 640,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();

  return {
    data: output.data,
    thumb,
    width: output.info.width,
    height: output.info.height,
    originalSha256,
    sha256: sha256(output.data),
  };
}
