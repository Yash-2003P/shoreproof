import type { DetectorBox } from "./parse";
import { DETECTOR_MODEL } from "./model";

export type DetectionResult = {
  boxes: DetectorBox[];
  runtimeMs: number;
  input: [number, number];
};

export type DetectionFailure = {
  error: string;
};

const TIMEOUT_MS = 120_000;

/**
 * Runs the pinned detector in a Web Worker. The photo never leaves the
 * browser: it is fetched from the app's own sanitized serving route and
 * handed to the worker as a bitmap.
 */
export function detectCandidates(
  photoId: string,
  onStatus?: (status: string) => void,
): Promise<DetectionResult> {
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(
        new URL("../../workers/detector.worker.ts", import.meta.url),
      );
    } catch (error) {
      reject(
        new Error(
          error instanceof Error
            ? error.message
            : "The detector worker could not start.",
        ),
      );
      return;
    }

    const timeout = window.setTimeout(() => {
      worker.terminate();
      reject(new Error("The detector timed out. Mark the litter yourself."));
    }, TIMEOUT_MS);

    const finish = (result: DetectionResult) => {
      window.clearTimeout(timeout);
      worker.terminate();
      resolve(result);
    };

    const fail = (message: string) => {
      window.clearTimeout(timeout);
      worker.terminate();
      reject(new Error(message));
    };

    worker.onerror = () => {
      fail("Detector unavailable — mark the litter yourself.");
    };

    worker.onmessage = (event: MessageEvent) => {
      const message = event.data as
        | { type: "result"; boxes: DetectorBox[]; runtimeMs: number; input: [number, number] }
        | { type: "error"; message: string }
        | undefined;

      if (!message) return;

      if (message.type === "result") {
        finish({
          boxes: message.boxes,
          runtimeMs: message.runtimeMs,
          input: message.input,
        });
        return;
      }

      fail(message.message);
    };

    (async () => {
      try {
        onStatus?.("Loading the model…");
        const response = await fetch(`/api/photos/${photoId}`);
        if (!response.ok) {
          throw new Error("The photo could not be loaded for detection.");
        }

        onStatus?.("Preparing the photo…");
        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);

        onStatus?.("Running the detector…");
        worker.postMessage({ type: "detect", bitmap }, [bitmap]);
      } catch (error) {
        fail(
          error instanceof Error
            ? error.message
            : "The detector could not read this photo.",
        );
      }
    })();
  });
}

export const DETECTOR_MODEL_INFO = DETECTOR_MODEL;
