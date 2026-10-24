import { describe, expect, it } from "vitest";
import { deriveCleanupStatus } from "../lib/status";

const base = {
  pending: 0,
  insufficient: 0,
  confirmed: 0,
  rejected: 0,
  exports: 0,
};

describe("deriveCleanupStatus", () => {
  it("starts as draft with no claims", () => {
    expect(deriveCleanupStatus(base)).toBe("draft");
  });

  it("is in review while a claim is pending", () => {
    expect(deriveCleanupStatus({ ...base, pending: 1 })).toBe("in_review");
  });

  it("stays in review when a claim is returned as insufficient", () => {
    expect(deriveCleanupStatus({ ...base, insufficient: 1 })).toBe("in_review");
  });

  it("is reviewed once every claim is decided", () => {
    expect(
      deriveCleanupStatus({ ...base, confirmed: 2, rejected: 1 }),
    ).toBe("reviewed");
  });

  it("is exported once an export exists, even with open claims", () => {
    expect(
      deriveCleanupStatus({ ...base, pending: 1, confirmed: 1, exports: 1 }),
    ).toBe("exported");
  });
});
