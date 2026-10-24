import * as ort from "onnxruntime-web";
import { parseDetectorOutput, type DetectorBox } from "@/lib/detector/parse";
import { DETECTOR_MODEL } from "@/lib/detector/model";

type WorkerScope = {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage: (message: unknown) => void;
};

const scope = self as unknown as WorkerScope;

ort.env.wasm.wasmPaths = "/ort/";
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;

let sessionPromise: Promise<ort.InferenceSession> | null = null;

function getSession(): Promise<ort.InferenceSession> {
  if (!sessionPromise) {
    sessionPromise = ort.InferenceSession.create(DETECTOR_MODEL.publicPath, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    }).catch((error) => {
      sessionPromise = null;
      throw error;
    });
  }
  return sessionPromise;
}

/**
 * The model's preprocessor config sets `do_pad: false`, so the photo is
 * resized straight to 640 × 640 with no letterbox padding.
 */
async function preprocess(bitmap: ImageBitmap): Promise<Float32Array> {
  const size = DETECTOR_MODEL.inputSize;
  const canvas = new OffscreenCanvas(size, size);
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("This browser cannot prepare the image for detection.");
  }

  context.drawImage(bitmap, 0, 0, size, size);

  const pixels = context.getImageData(0, 0, size, size).data;
  const plane = size * size;
  const tensor = new Float32Array(3 * plane);

  for (let index = 0; index < plane; index += 1) {
    tensor[index] = pixels[index * 4] / 255;
    tensor[plane + index] = pixels[index * 4 + 1] / 255;
    tensor[2 * plane + index] = pixels[index * 4 + 2] / 255;
  }

  return tensor;
}

scope.onmessage = async (event: MessageEvent) => {
  const message = event.data as
    | { type: "detect"; bitmap: ImageBitmap }
    | undefined;

  if (!message || message.type !== "detect") return;

  try {
    const session = await getSession();
    const pixels = await preprocess(message.bitmap);
    const started = performance.now();

    const output = await session.run({
      pixel_values: new ort.Tensor("float32", pixels, [
        1,
        3,
        DETECTOR_MODEL.inputSize,
        DETECTOR_MODEL.inputSize,
      ]),
    });

    const runtimeMs = Math.round(performance.now() - started);

    const boxes: DetectorBox[] = parseDetectorOutput(
      {
        logits: output.logits
          ? {
              data: output.logits.data as Float32Array,
              dims: output.logits.dims,
            }
          : undefined,
        predBoxes: output.pred_boxes
          ? {
              data: output.pred_boxes.data as Float32Array,
              dims: output.pred_boxes.dims,
            }
          : undefined,
        fused: output.output0
          ? {
              data: output.output0.data as Float32Array,
              dims: output.output0.dims,
            }
          : undefined,
      },
      {
        threshold: DETECTOR_MODEL.threshold,
        maxBoxes: DETECTOR_MODEL.maxBoxes,
        inputSize: DETECTOR_MODEL.inputSize,
      },
    );

    scope.postMessage({
      type: "result",
      boxes,
      runtimeMs,
      input: [DETECTOR_MODEL.inputSize, DETECTOR_MODEL.inputSize],
    });
  } catch (error) {
    scope.postMessage({
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "The detector could not read this photo.",
    });
  }
};
