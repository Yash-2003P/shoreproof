import fs from "node:fs";
import path from "node:path";
import { DETECTOR_MODEL } from "./model";

/** Server-side check so the UI can say whether the detector can run. */
export function detectorModelAvailable(): boolean {
  const file = path.join(
    process.cwd(),
    "public",
    "models",
    DETECTOR_MODEL.fileName,
  );
  return fs.existsSync(file);
}
