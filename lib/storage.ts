import fs from "node:fs";
import path from "node:path";
import { getUploadsDir } from "./db";

export function ensureUploadsDir(): string {
  const dir = getUploadsDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function photoPath(photoId: string): string {
  return path.join(getUploadsDir(), `${photoId}.jpg`);
}

export function thumbPath(photoId: string): string {
  return path.join(getUploadsDir(), `${photoId}.thumb.jpg`);
}

export function writePhotoFiles(
  photoId: string,
  data: Buffer,
  thumb: Buffer,
): void {
  ensureUploadsDir();
  const main = photoPath(photoId);
  const preview = thumbPath(photoId);
  const mainTemp = `${main}.${process.pid}.${Date.now()}.tmp`;
  const previewTemp = `${preview}.${process.pid}.${Date.now()}.tmp`;

  try {
    fs.writeFileSync(mainTemp, data);
    fs.writeFileSync(previewTemp, thumb);
    fs.renameSync(mainTemp, main);
    fs.renameSync(previewTemp, preview);
  } catch (error) {
    fs.rmSync(mainTemp, { force: true });
    fs.rmSync(previewTemp, { force: true });
    fs.rmSync(main, { force: true });
    fs.rmSync(preview, { force: true });
    throw error;
  }
}

export function deletePhotoFiles(photoId: string): void {
  fs.rmSync(photoPath(photoId), { force: true });
  fs.rmSync(thumbPath(photoId), { force: true });
}
