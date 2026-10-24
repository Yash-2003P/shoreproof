import { describe, expect, it } from "vitest";
import { framingScore, framingWord } from "../lib/framing";

const GRID_SIZE = 64;

function grid(value: number): number[] {
  return new Array(GRID_SIZE).fill(value);
}

function gradient(): number[] {
  return Array.from({ length: GRID_SIZE }, (_, index) => index * 4);
}

describe("framingScore", () => {
  it("scores two identical grids as similar framing", () => {
    const result = framingScore({
      gridA: gradient(),
      gridB: gradient(),
      ratioA: 1.5,
      ratioB: 1.5,
    });

    expect(result.score).toBe(100);
    expect(result.gridSim).toBe(1);
    expect(result.aspectSim).toBe(1);
    expect(result.word).toBe("similar framing");
  });

  it("scores two different scenes low", () => {
    const result = framingScore({
      gridA: grid(10),
      gridB: grid(240),
      ratioA: 1.5,
      ratioB: 0.6,
    });

    expect(result.gridSim).toBeLessThan(0.2);
    expect(result.aspectSim).toBeLessThan(0.7);
    expect(result.score).toBeLessThan(50);
    expect(result.word).toBe("very different framing");
  });

  it("keeps the grid weight at 70 percent", () => {
    const result = framingScore({
      gridA: grid(100),
      gridB: grid(100),
      ratioA: 2,
      ratioB: 1,
    });

    // gridSim 1, aspectSim 0.5 → 100 * (0.7 + 0.15) = 85
    expect(result.score).toBe(85);
  });

  it("never returns a negative similarity", () => {
    const result = framingScore({
      gridA: grid(0),
      gridB: grid(255),
      ratioA: 1,
      ratioB: 1,
    });

    expect(result.gridSim).toBe(0);
    // The aspect term still contributes: 100 * (0.7 * 0 + 0.3 * 1) = 30
    expect(result.score).toBe(30);
  });
});

describe("framingWord", () => {
  it("uses the documented boundaries", () => {
    expect(framingWord(100)).toBe("similar framing");
    expect(framingWord(80)).toBe("similar framing");
    expect(framingWord(79)).toBe("shifted framing");
    expect(framingWord(50)).toBe("shifted framing");
    expect(framingWord(49)).toBe("very different framing");
  });
});
