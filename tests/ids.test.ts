import { describe, expect, it } from "vitest";
import { isPublicSlug, newPublicSlug } from "../lib/ids";

describe("public slugs", () => {
  it("are 12 URL-safe characters", () => {
    const slug = newPublicSlug();
    expect(slug).toHaveLength(12);
    expect(isPublicSlug(slug)).toBe(true);
  });

  it("do not repeat across a small batch", () => {
    const slugs = new Set(
      Array.from({ length: 100 }, () => newPublicSlug()),
    );
    expect(slugs.size).toBe(100);
  });

  it("reject path-like values", () => {
    expect(isPublicSlug("../cleanups")).toBe(false);
    expect(isPublicSlug("short")).toBe(false);
  });
});
