import sharp from "sharp";

export const FRAMING_GRID_SIZE = 8;

export type FramingWord =
  | "similar framing"
  | "shifted framing"
  | "very different framing";

export type FramingScore = {
  score: number;
  gridSim: number;
  aspectSim: number;
  word: FramingWord;
};

export type FramingSignal = FramingScore & {
  grids: { before: number[]; after: number[] };
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function framingWord(score: number): FramingWord {
  if (score >= 80) return "similar framing";
  if (score >= 50) return "shifted framing";
  return "very different framing";
}

/**
 * The framing signal is a hint, not a verdict: an 8 × 8 mean-luminance grid
 * comparison plus the aspect-ratio difference, folded into one 0–100 score.
 */
export function framingScore(input: {
  gridA: number[];
  gridB: number[];
  ratioA: number;
  ratioB: number;
}): FramingScore {
  const cells = Math.min(input.gridA.length, input.gridB.length);
  let total = 0;

  for (let index = 0; index < cells; index += 1) {
    total += Math.abs(input.gridA[index] - input.gridB[index]);
  }

  const gridSim =
    cells > 0 ? clamp01(1 - total / cells / 255) : 0;

  const maxRatio = Math.max(input.ratioA, input.ratioB);
  const aspectSim =
    maxRatio > 0
      ? clamp01(1 - Math.abs(input.ratioA - input.ratioB) / maxRatio)
      : 0;

  const score = Math.round(100 * (0.7 * gridSim + 0.3 * aspectSim));

  return {
    score,
    gridSim: Math.round(gridSim * 1000) / 1000,
    aspectSim: Math.round(aspectSim * 1000) / 1000,
    word: framingWord(score),
  };
}

export async function luminanceGrid(
  filePath: string,
): Promise<number[]> {
  const { data } = await sharp(filePath)
    .resize(FRAMING_GRID_SIZE, FRAMING_GRID_SIZE, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return Array.from(data);
}

export async function computeFramingSignal(
  beforePath: string,
  afterPath: string,
): Promise<FramingSignal> {
  const [gridA, gridB, metaA, metaB] = await Promise.all([
    luminanceGrid(beforePath),
    luminanceGrid(afterPath),
    sharp(beforePath).metadata(),
    sharp(afterPath).metadata(),
  ]);

  const ratioA = (metaA.width ?? 1) / (metaA.height ?? 1);
  const ratioB = (metaB.width ?? 1) / (metaB.height ?? 1);

  return {
    ...framingScore({ gridA, gridB, ratioA, ratioB }),
    grids: { before: gridA, after: gridB },
  };
}
