import { describe, expect, it } from "vitest";
import {
  blurLevel,
  clippedShare,
  dhashFromGray,
  duplicateLevel,
  exposureLevel,
  findDuplicateHash,
  hammingDistance,
  laplacianVariance,
  resolutionLevel,
  rgbaToGrayscale,
} from "../lib/preflight-core";

describe("rgbaToGrayscale", () => {
  it("uses Rec. 709 luma", () => {
    const gray = rgbaToGrayscale(
      new Uint8Array([255, 255, 255, 255, 0, 0, 0, 255]),
    );
    expect(Array.from(gray)).toEqual([255, 0]);
  });
});

describe("laplacianVariance", () => {
  it("is zero on a flat image", () => {
    const gray = new Uint8Array(20 * 20).fill(120);
    expect(laplacianVariance(gray, 20, 20)).toBe(0);
  });

  it("is high on a hard checkerboard", () => {
    const width = 20;
    const height = 20;
    const gray = new Uint8Array(width * height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        gray[y * width + x] = (x + y) % 2 === 0 ? 0 : 255;
      }
    }
    expect(laplacianVariance(gray, width, height)).toBeGreaterThan(100);
  });

  it("returns zero when there is no interior", () => {
    expect(laplacianVariance(new Uint8Array(4), 2, 2)).toBe(0);
  });
});

describe("clippedShare", () => {
  it("counts both ends of the range", () => {
    const gray = new Uint8Array([0, 8, 9, 128, 246, 247, 255]);
    expect(clippedShare(gray)).toBeCloseTo(4 / 7);
  });

  it("is zero for a midtone image", () => {
    expect(clippedShare(new Uint8Array([100, 120, 140]))).toBe(0);
  });
});

describe("dhashFromGray", () => {
  it("is all zeros on a flat image", () => {
    const gray = new Uint8Array(9 * 8).fill(128);
    expect(dhashFromGray(gray)).toBe("0000000000000000");
  });

  it("is all ones when every pixel is brighter than the next", () => {
    const gray = new Uint8Array(9 * 8);
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 9; x += 1) {
        gray[y * 9 + x] = 255 - x;
      }
    }
    expect(dhashFromGray(gray)).toBe("ffffffffffffffff");
  });

  it("is stable for the same pixels", () => {
    const gray = new Uint8Array(9 * 8);
    for (let i = 0; i < gray.length; i += 1) {
      gray[i] = (i * 37) % 256;
    }
    expect(dhashFromGray(gray)).toBe(dhashFromGray(gray));
  });
});

describe("hammingDistance", () => {
  it("counts differing bits", () => {
    expect(hammingDistance("0000000000000000", "0000000000000000")).toBe(0);
    expect(hammingDistance("0000000000000000", "000000000000000f")).toBe(4);
    expect(hammingDistance("0000000000000000", "ffffffffffffffff")).toBe(64);
  });

  it("returns a sentinel for unequal lengths", () => {
    expect(hammingDistance("ff", "ffff")).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe("duplicateLevel", () => {
  it("labels exact, likely, similar, and none", () => {
    expect(duplicateLevel(0)).toBe("exact");
    expect(duplicateLevel(8)).toBe("likely");
    expect(duplicateLevel(9)).toBe("similar");
    expect(duplicateLevel(14)).toBe("similar");
    expect(duplicateLevel(15)).toBe("none");
    expect(duplicateLevel(null)).toBe("none");
  });
});

describe("check thresholds", () => {
  it("warns below 1280 px on the long edge", () => {
    expect(resolutionLevel(1280)).toBe("pass");
    expect(resolutionLevel(1279)).toBe("warn");
  });

  it("warns below a Laplacian variance of 100", () => {
    expect(blurLevel(100)).toBe("pass");
    expect(blurLevel(99)).toBe("warn");
  });

  it("warns above 25% clipped pixels", () => {
    expect(exposureLevel(0.25)).toBe("pass");
    expect(exposureLevel(0.2501)).toBe("warn");
  });
});

describe("findDuplicateHash", () => {
  const known = [
    { side: "before" as const, dhash: "000000000000000f", sha256: "aaa" },
    { side: "after" as const, dhash: "ffffffffffffffff", sha256: "bbb" },
  ];

  it("prefers an exact hash match", () => {
    expect(
      findDuplicateHash({ dhash: "ffffffffffffffff", sha256: "bbb" }, known),
    ).toEqual({ level: "exact", distance: 0, side: "after" });
  });

  it("labels a close perceptual hash as likely", () => {
    expect(
      findDuplicateHash({ dhash: "0000000000000007", sha256: "ccc" }, known),
    ).toEqual({ level: "likely", distance: 1, side: "before" });
  });

  it("ignores flat local hashes and distances above 14", () => {
    expect(
      findDuplicateHash({ dhash: "0000000000000000", sha256: "ccc" }, [
        { side: "before", dhash: "000000000000000f", sha256: "aaa" },
      ]),
    ).toBeNull();

    expect(
      findDuplicateHash({ dhash: "aaaaaaaaaaaaaaaa", sha256: "ccc" }, [
        { side: "before", dhash: "5555555555555555", sha256: "aaa" },
      ]),
    ).toBeNull();
  });
});
