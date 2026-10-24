import { clamp01, MIN_REGION } from "../region";
import { cocoClassName } from "./coco";

export type TensorLike = {
  data: ArrayLike<number>;
  dims: readonly number[];
};

export type DetectorBox = {
  x: number;
  y: number;
  w: number;
  h: number;
  score: number;
  cocoId: number;
  cocoClass: string;
};

export type ParseOptions = {
  threshold?: number;
  maxBoxes?: number;
  inputSize?: number;
  minSize?: number;
};

const DEFAULT_THRESHOLD = 0.35;
const DEFAULT_MAX_BOXES = 20;
const DEFAULT_INPUT_SIZE = 640;

function sigmoid(value: number): number {
  if (value >= 0) {
    const exponential = Math.exp(-value);
    return 1 / (1 + exponential);
  }
  const exponential = Math.exp(value);
  return exponential / (1 + exponential);
}

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

/**
 * Coordinates arrive either as input pixels or as values already normalized
 * to the image. Anything larger than 1.5 is pixels.
 */
function normalizeCoordinate(value: number, inputSize: number): number {
  return Math.abs(value) > 1.5 ? value / inputSize : value;
}

function toRegion(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  minSize: number,
): { x: number; y: number; w: number; h: number } {
  let left = Math.min(x1, x2);
  let right = Math.max(x1, x2);
  let top = Math.min(y1, y2);
  let bottom = Math.max(y1, y2);

  left = clamp01(left);
  right = clamp01(right);
  top = clamp01(top);
  bottom = clamp01(bottom);

  let width = right - left;
  let height = bottom - top;

  if (width < minSize) {
    const center = left + width / 2;
    left = clamp01(center - minSize / 2);
    right = Math.min(1, left + minSize);
    left = Math.max(0, right - minSize);
    width = right - left;
  }

  if (height < minSize) {
    const center = top + height / 2;
    top = clamp01(center - minSize / 2);
    bottom = Math.min(1, top + minSize);
    top = Math.max(0, bottom - minSize);
    height = bottom - top;
  }

  return {
    x: round6(left),
    y: round6(top),
    w: round6(width),
    h: round6(height),
  };
}

function finalize(
  boxes: DetectorBox[],
  options: ParseOptions,
): DetectorBox[] {
  const maxBoxes = options.maxBoxes ?? DEFAULT_MAX_BOXES;

  return boxes
    .sort((a, b) => b.score - a.score)
    .slice(0, maxBoxes)
    .map((box) => ({
      ...box,
      score: round6(box.score),
    }));
}

/**
 * Fused output: one row per detection.
 * `[1, 300, 6]` rows are `[x1, y1, x2, y2, score, classId]`.
 * `[1, 6, 300]` is the same data transposed.
 */
export function parseFusedOutput(
  tensor: TensorLike,
  options: ParseOptions = {},
): DetectorBox[] {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const inputSize = options.inputSize ?? DEFAULT_INPUT_SIZE;
  const minSize = options.minSize ?? MIN_REGION;

  const dims = tensor.dims;
  if (dims.length !== 3) return [];

  const rowsFirst = dims[2] === 6;
  const columnsFirst = dims[1] === 6;
  if (!rowsFirst && !columnsFirst) return [];

  const rows = rowsFirst ? dims[1] : dims[2];
  const columns = 6;
  const transposed = columnsFirst;
  const data = tensor.data;
  const boxes: DetectorBox[] = [];

  for (let index = 0; index < rows; index += 1) {
    const offset = transposed ? index : index * columns;
    const at = (column: number) =>
      transposed ? data[offset + column * rows] : data[offset + column];

    const score = at(4);
    if (!Number.isFinite(score) || score < threshold) continue;

    const cocoId = Math.round(at(5));
    const cocoClass = cocoClassName(cocoId);
    if (!cocoClass) continue;

    const region = toRegion(
      normalizeCoordinate(at(0), inputSize),
      normalizeCoordinate(at(1), inputSize),
      normalizeCoordinate(at(2), inputSize),
      normalizeCoordinate(at(3), inputSize),
      minSize,
    );

    boxes.push({ ...region, score, cocoId, cocoClass });
  }

  return finalize(boxes, options);
}

/**
 * Split output, as this model actually returns it:
 * `logits [1, 300, 80]` holds raw class logits, `pred_boxes [1, 300, 4]`
 * holds normalized `cx, cy, w, h`.
 */
export function parseSplitOutput(
  logits: TensorLike,
  predBoxes: TensorLike,
  options: ParseOptions = {},
): DetectorBox[] {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const inputSize = options.inputSize ?? DEFAULT_INPUT_SIZE;
  const minSize = options.minSize ?? MIN_REGION;

  const logitsDims = logits.dims;
  const boxDims = predBoxes.dims;
  if (logitsDims.length !== 3 || boxDims.length !== 3) return [];

  const queries = Math.min(logitsDims[1], boxDims[1]);
  const classCount = logitsDims[2];
  if (classCount < 1 || boxDims[2] < 4) return [];

  const logitsData = logits.data;
  const boxData = predBoxes.data;
  const boxes: DetectorBox[] = [];

  for (let query = 0; query < queries; query += 1) {
    let bestScore = 0;
    let bestClass = -1;

    for (let classId = 0; classId < classCount; classId += 1) {
      const raw = logitsData[query * classCount + classId];
      if (!Number.isFinite(raw)) continue;
      const score = sigmoid(raw);
      if (score > bestScore) {
        bestScore = score;
        bestClass = classId;
      }
    }

    if (bestClass < 0 || bestScore < threshold) continue;

    const cocoClass = cocoClassName(bestClass);
    if (!cocoClass) continue;

    const cx = normalizeCoordinate(boxData[query * 4], inputSize);
    const cy = normalizeCoordinate(boxData[query * 4 + 1], inputSize);
    const width = normalizeCoordinate(boxData[query * 4 + 2], inputSize);
    const height = normalizeCoordinate(boxData[query * 4 + 3], inputSize);

    const region = toRegion(
      cx - width / 2,
      cy - height / 2,
      cx + width / 2,
      cy + height / 2,
      minSize,
    );

    boxes.push({
      ...region,
      score: bestScore,
      cocoId: bestClass,
      cocoClass,
    });
  }

  return finalize(boxes, options);
}

/** Dispatch on whatever the model returned. */
export function parseDetectorOutput(
  outputs: {
    logits?: TensorLike;
    predBoxes?: TensorLike;
    fused?: TensorLike;
  },
  options: ParseOptions = {},
): DetectorBox[] {
  if (outputs.logits && outputs.predBoxes) {
    return parseSplitOutput(outputs.logits, outputs.predBoxes, options);
  }
  if (outputs.fused) {
    return parseFusedOutput(outputs.fused, options);
  }
  return [];
}
