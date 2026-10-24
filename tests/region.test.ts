import { describe, expect, it } from "vitest";
import {
  FULL_REGION,
  MIN_REGION,
  clamp01,
  clampRegion,
  formatRegion,
  isValidRegion,
  moveRegion,
  nudgeRegion,
  regionFromDrag,
  regionFromRow,
  resizeRegion,
} from "../lib/region";

describe("clamp01", () => {
  it("keeps values inside the image", () => {
    expect(clamp01(-0.4)).toBe(0);
    expect(clamp01(0.42)).toBe(0.42);
    expect(clamp01(1.4)).toBe(1);
    expect(clamp01(Number.NaN)).toBe(0);
  });
});

describe("regionFromDrag", () => {
  it("normalizes a drag in any direction", () => {
    expect(regionFromDrag(0.1, 0.2, 0.5, 0.7)).toEqual({
      x: 0.1,
      y: 0.2,
      w: 0.4,
      h: 0.5,
    });
    expect(regionFromDrag(0.5, 0.7, 0.1, 0.2)).toEqual({
      x: 0.1,
      y: 0.2,
      w: 0.4,
      h: 0.5,
    });
  });

  it("enforces the minimum region for a click or tiny drag", () => {
    const region = regionFromDrag(0.5, 0.5, 0.5, 0.5);
    expect(region.w).toBe(MIN_REGION);
    expect(region.h).toBe(MIN_REGION);
    expect(isValidRegion(region)).toBe(true);
  });

  it("keeps a minimum region inside the far edge", () => {
    const region = regionFromDrag(1, 1, 1, 1);
    expect(region).toEqual({
      x: 1 - MIN_REGION,
      y: 1 - MIN_REGION,
      w: MIN_REGION,
      h: MIN_REGION,
    });
    expect(isValidRegion(region)).toBe(true);
  });

  it("clamps points outside the image", () => {
    expect(regionFromDrag(-1, -1, 0.5, 0.5)).toEqual({
      x: 0,
      y: 0,
      w: 0.5,
      h: 0.5,
    });
  });
});

describe("isValidRegion", () => {
  it("accepts the full photo and rejects bad regions", () => {
    expect(isValidRegion(FULL_REGION)).toBe(true);
    expect(isValidRegion({ x: 0, y: 0, w: MIN_REGION, h: MIN_REGION })).toBe(
      true,
    );
    expect(isValidRegion({ x: -0.01, y: 0, w: 0.2, h: 0.2 })).toBe(false);
    expect(isValidRegion({ x: 0.9, y: 0, w: 0.2, h: 0.2 })).toBe(false);
    expect(isValidRegion({ x: 0, y: 0, w: 0.01, h: 0.2 })).toBe(false);
    expect(
      isValidRegion({ x: 0, y: 0, w: Number.NaN, h: 0.2 }),
    ).toBe(false);
  });
});

describe("clampRegion", () => {
  it("moves a region back inside and grows a tiny region", () => {
    expect(clampRegion({ x: -0.2, y: 0.9, w: 0.5, h: 0.5 })).toEqual({
      x: 0,
      y: 0.5,
      w: 0.5,
      h: 0.5,
    });
    expect(clampRegion({ x: 0.2, y: 0.2, w: 0.001, h: 0.001 })).toEqual({
      x: 0.2,
      y: 0.2,
      w: MIN_REGION,
      h: MIN_REGION,
    });
  });
});

describe("moveRegion and nudgeRegion", () => {
  it("moves without leaving the image", () => {
    expect(
      moveRegion({ x: 0.4, y: 0.4, w: 0.2, h: 0.2 }, 0.1, -0.1),
    ).toEqual({ x: 0.5, y: 0.3, w: 0.2, h: 0.2 });

    expect(
      moveRegion({ x: 0.9, y: 0.9, w: 0.2, h: 0.2 }, 0.5, 0.5),
    ).toEqual({ x: 0.8, y: 0.8, w: 0.2, h: 0.2 });
  });

  it("nudges by the requested step", () => {
    expect(nudgeRegion(FULL_REGION, 0.002, 0)).toEqual(FULL_REGION);
    expect(
      nudgeRegion({ x: 0.2, y: 0.2, w: 0.3, h: 0.3 }, 0.002, -0.002),
    ).toEqual({ x: 0.202, y: 0.198, w: 0.3, h: 0.3 });
  });
});

describe("resizeRegion", () => {
  const base = { x: 0.2, y: 0.2, w: 0.4, h: 0.4 };

  it("resizes from each corner", () => {
    expect(resizeRegion(base, "se", 0.1, 0.1)).toEqual({
      x: 0.2,
      y: 0.2,
      w: 0.5,
      h: 0.5,
    });
    expect(resizeRegion(base, "nw", 0.1, 0.1)).toEqual({
      x: 0.3,
      y: 0.3,
      w: 0.3,
      h: 0.3,
    });
    expect(resizeRegion(base, "ne", 0.1, -0.1)).toEqual({
      x: 0.2,
      y: 0.1,
      w: 0.5,
      h: 0.5,
    });
    expect(resizeRegion(base, "sw", -0.1, 0.1)).toEqual({
      x: 0.1,
      y: 0.2,
      w: 0.5,
      h: 0.5,
    });
  });

  it("never shrinks below the minimum or leaves the image", () => {
    expect(resizeRegion(base, "nw", 1, 1)).toEqual({
      x: 0.58,
      y: 0.58,
      w: MIN_REGION,
      h: MIN_REGION,
    });
    expect(resizeRegion(base, "se", 1, 1)).toEqual({
      x: 0.2,
      y: 0.2,
      w: 0.8,
      h: 0.8,
    });
  });
});

describe("regionFromRow", () => {
  it("returns a valid region and rejects missing coordinates", () => {
    expect(regionFromRow({ x: 0.1, y: 0.2, w: 0.3, h: 0.4 })).toEqual({
      x: 0.1,
      y: 0.2,
      w: 0.3,
      h: 0.4,
    });
    expect(regionFromRow({ x: null, y: 0.2, w: 0.3, h: 0.4 })).toBeNull();
    expect(regionFromRow({ x: 0, y: 0, w: 0.001, h: 0.2 })).toBeNull();
  });
});

describe("formatRegion", () => {
  it("renders percentages", () => {
    expect(formatRegion({ x: 0.42, y: 0.31, w: 0.18, h: 0.22 })).toBe(
      "x 42% · y 31% · 18% × 22%",
    );
  });
});
