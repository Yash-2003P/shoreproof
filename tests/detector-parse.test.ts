import { describe, expect, it } from "vitest";
import {
  parseDetectorOutput,
  parseFusedOutput,
  parseSplitOutput,
} from "../lib/detector/parse";
import { mapCocoToIcc } from "../lib/detector/icc";
import { cocoClassName } from "../lib/detector/coco";

function fusedRow(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  score: number,
  cocoId: number,
) {
  return [x1, y1, x2, y2, score, cocoId];
}

describe("parseFusedOutput", () => {
  it("reads a [1, N, 6] row of x1 y1 x2 y2 score class", () => {
    const boxes = parseFusedOutput(
      {
        data: fusedRow(64, 128, 320, 384, 0.82, 39),
        dims: [1, 1, 6],
      },
      { inputSize: 640 },
    );

    expect(boxes).toHaveLength(1);
    expect(boxes[0]).toMatchObject({
      x: 0.1,
      y: 0.2,
      w: 0.4,
      h: 0.4,
      score: 0.82,
      cocoId: 39,
      cocoClass: "bottle",
    });
  });

  it("reads a transposed [1, 6, N] output", () => {
    const boxes = parseFusedOutput(
      {
        data: [64, 64, 64, 64, 0.9, 39],
        dims: [1, 6, 1],
      },
      { inputSize: 640 },
    );

    expect(boxes).toHaveLength(1);
    expect(boxes[0].cocoClass).toBe("bottle");
    expect(boxes[0].score).toBe(0.9);
  });

  it("drops boxes under the threshold and unknown classes", () => {
    const boxes = parseFusedOutput(
      {
        data: [
          ...fusedRow(0, 0, 100, 100, 0.2, 39),
          ...fusedRow(0, 0, 100, 100, 0.9, 999),
        ],
        dims: [1, 2, 6],
      },
      { inputSize: 640 },
    );

    expect(boxes).toHaveLength(0);
  });

  it("keeps the strongest boxes first and honours the cap", () => {
    const data: number[] = [];
    for (let index = 0; index < 30; index += 1) {
      data.push(
        ...fusedRow(0, 0, 100 + index, 100, 0.4 + index / 100, 39),
      );
    }

    const boxes = parseFusedOutput(
      { data, dims: [1, 30, 6] },
      { inputSize: 640, maxBoxes: 5 },
    );

    expect(boxes).toHaveLength(5);
    expect(boxes[0].score).toBeGreaterThan(boxes[4].score);
  });

  it("grows a tiny box to the minimum region and clamps it to the photo", () => {
    const boxes = parseFusedOutput(
      {
        data: fusedRow(630, 630, 640, 640, 0.9, 39),
        dims: [1, 1, 6],
      },
      { inputSize: 640 },
    );

    expect(boxes).toHaveLength(1);
    expect(boxes[0].x + boxes[0].w).toBeLessThanOrEqual(1);
    expect(boxes[0].y + boxes[0].h).toBeLessThanOrEqual(1);
    expect(boxes[0].w).toBeGreaterThanOrEqual(0.02);
    expect(boxes[0].h).toBeGreaterThanOrEqual(0.02);
  });
});

describe("parseSplitOutput", () => {
  it("applies sigmoid to the class logits and reads cxcywh boxes", () => {
    const logits = new Float32Array(80 * 2).fill(-10);
    logits[39] = 6; // bottle on the first query
    logits[80 + 16] = 6; // dog on the second query

    const boxes = parseSplitOutput(
      { data: logits, dims: [1, 2, 80] },
      {
        data: new Float32Array([0.5, 0.5, 0.2, 0.3, 0.25, 0.75, 0.1, 0.2]),
        dims: [1, 2, 4],
      },
    );

    expect(boxes).toHaveLength(2);
    expect(boxes[0].cocoClass).toBe("bottle");
    expect(boxes[0].score).toBeGreaterThan(0.99);
    expect(boxes[0].x).toBeCloseTo(0.4, 5);
    expect(boxes[0].y).toBeCloseTo(0.35, 5);
    expect(boxes[0].w).toBeCloseTo(0.2, 5);
    expect(boxes[0].h).toBeCloseTo(0.3, 5);
    expect(boxes[1].cocoClass).toBe("dog");
  });

  it("drops queries under the threshold", () => {
    const logits = new Float32Array(80).fill(-10);
    logits[39] = -2; // sigmoid ≈ 0.12

    const boxes = parseSplitOutput(
      { data: logits, dims: [1, 1, 80] },
      {
        data: new Float32Array([0.5, 0.5, 0.2, 0.2]),
        dims: [1, 1, 4],
      },
    );

    expect(boxes).toHaveLength(0);
  });

  it("reads boxes given in input pixels", () => {
    const logits = new Float32Array(80).fill(-10);
    logits[39] = 6;

    const boxes = parseSplitOutput(
      { data: logits, dims: [1, 1, 80] },
      {
        data: new Float32Array([320, 320, 128, 64]),
        dims: [1, 1, 4],
      },
      { inputSize: 640 },
    );

    expect(boxes[0].x).toBeCloseTo(0.4, 5);
    expect(boxes[0].w).toBeCloseTo(0.2, 5);
  });
});

describe("parseDetectorOutput", () => {
  it("picks the split output when both tensors are present", () => {
    const logits = new Float32Array(80).fill(-10);
    logits[41] = 6; // cup

    const boxes = parseDetectorOutput({
      logits: { data: logits, dims: [1, 1, 80] },
      predBoxes: {
        data: new Float32Array([0.5, 0.5, 0.2, 0.2]),
        dims: [1, 1, 4],
      },
    });

    expect(boxes).toHaveLength(1);
    expect(boxes[0].cocoClass).toBe("cup");
  });

  it("returns nothing for an unknown output", () => {
    expect(parseDetectorOutput({})).toEqual([]);
  });
});

describe("the conservative COCO to ICC map", () => {
  it("maps only the allowlisted classes", () => {
    expect(mapCocoToIcc(39)).toEqual({
      category: "Beverage Bottles (Plastic)",
      uncertain: false,
    });
    expect(mapCocoToIcc(40)).toEqual({
      category: "Glass Beverage Bottles",
      uncertain: false,
    });
    expect(mapCocoToIcc(41)).toEqual({
      category: "Cups & Plates",
      uncertain: false,
    });
    expect(mapCocoToIcc(45)).toEqual({
      category: "Cups & Plates",
      uncertain: false,
    });
    expect(mapCocoToIcc(42)).toEqual({
      category: "Cups & Plates",
      uncertain: true,
    });
    expect(mapCocoToIcc(43).uncertain).toBe(true);
    expect(mapCocoToIcc(44).uncertain).toBe(true);
  });

  it("leaves everything else unmapped", () => {
    expect(mapCocoToIcc(0)).toEqual({ category: null, uncertain: false });
    expect(mapCocoToIcc(39 - 1)).toEqual({ category: null, uncertain: false });
    expect(mapCocoToIcc(79)).toEqual({ category: null, uncertain: false });
  });

  it("knows the COCO names", () => {
    expect(cocoClassName(0)).toBe("person");
    expect(cocoClassName(39)).toBe("bottle");
    expect(cocoClassName(79)).toBe("toothbrush");
    expect(cocoClassName(80)).toBeNull();
  });
});
