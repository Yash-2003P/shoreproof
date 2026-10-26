import { describe, expect, it } from "vitest";
import {
  computeFlags,
  FLAG_PRIORITY,
  isLowResolution,
  NO_FLAG_PRIORITY,
  priorityForFlags,
  sortQueue,
  usesAbsoluteWording,
} from "../lib/queue";

const BASE = {
  hasRegion: true,
  comparability: "comparable" as const,
  anyPeopleVisible: false,
  nearDuplicate: false,
  text: "A bottle was removed from the rock line.",
  photoWidth: 1600,
  photoHeight: 900,
  collectorId: "u1",
  reviewerId: "u2",
  hasSuggestion: false,
  suggestionEdited: false,
};

describe("usesAbsoluteWording", () => {
  it("matches the whole-word list case-insensitively", () => {
    for (const word of [
      "entire",
      "all",
      "none",
      "every",
      "completely",
      "fully",
      "clean",
    ]) {
      expect(usesAbsoluteWording(`The beach looks ${word} now.`)).toBe(true);
      expect(usesAbsoluteWording(`The beach looks ${word.toUpperCase()} now.`)).toBe(
        true,
      );
    }
  });

  it("does not match words that merely contain the list", () => {
    expect(usesAbsoluteWording("The cleanup crew worked hard.")).toBe(false);
    expect(usesAbsoluteWording("Most of the bottles are gone.")).toBe(false);
    expect(usesAbsoluteWording("Aluminium can removed.")).toBe(false);
  });

  it("never edits the claim — it only flags", () => {
    const text = "The entire tide line was clean.";
    expect(usesAbsoluteWording(text)).toBe(true);
    expect(text).toBe("The entire tide line was clean.");
  });
});

describe("isLowResolution", () => {
  it("flags a photo whose long edge is under 1280", () => {
    expect(isLowResolution(800, 600)).toBe(true);
    expect(isLowResolution(600, 800)).toBe(true);
    expect(isLowResolution(1279, 400)).toBe(true);
  });

  it("accepts 1280 and above on the long edge", () => {
    expect(isLowResolution(1280, 720)).toBe(false);
    expect(isLowResolution(720, 2000)).toBe(false);
  });
});

describe("computeFlags", () => {
  it("returns nothing for a clean claim", () => {
    expect(computeFlags(BASE)).toEqual([]);
  });

  it("flags every documented condition", () => {
    expect(
      computeFlags({ ...BASE, hasRegion: false }),
    ).toContain("no_region");
    expect(
      computeFlags({ ...BASE, comparability: "not_comparable" }),
    ).toContain("not_comparable");
    expect(computeFlags({ ...BASE, anyPeopleVisible: true })).toContain(
      "people_visible",
    );
    expect(computeFlags({ ...BASE, nearDuplicate: true })).toContain(
      "near_duplicate",
    );
    expect(
      computeFlags({ ...BASE, text: "The entire beach is clean." }),
    ).toContain("absolute_wording");
    expect(
      computeFlags({ ...BASE, photoWidth: 640, photoHeight: 480 }),
    ).toContain("low_resolution");
    expect(
      computeFlags({ ...BASE, collectorId: "u2", reviewerId: "u2" }),
    ).toContain("self_reviewed");
    expect(
      computeFlags({ ...BASE, hasSuggestion: true, suggestionEdited: false }),
    ).toContain("ai_box_unedited");
  });

  it("does not flag an edited AI suggestion", () => {
    const flags = computeFlags({
      ...BASE,
      hasSuggestion: true,
      suggestionEdited: true,
    });
    expect(flags).toEqual([]);
  });

  it("treats partial comparability as acceptable", () => {
    expect(computeFlags({ ...BASE, comparability: "partial" })).toEqual([]);
  });
});

describe("priorityForFlags", () => {
  it("uses the documented priority order", () => {
    expect(FLAG_PRIORITY.no_region).toBe(10);
    expect(FLAG_PRIORITY.not_comparable).toBe(20);
    expect(FLAG_PRIORITY.people_visible).toBe(25);
    expect(FLAG_PRIORITY.near_duplicate).toBe(30);
    expect(FLAG_PRIORITY.absolute_wording).toBe(40);
    expect(FLAG_PRIORITY.low_resolution).toBe(50);
    expect(FLAG_PRIORITY.self_reviewed).toBe(60);
    expect(FLAG_PRIORITY.ai_box_unedited).toBe(70);
    expect(NO_FLAG_PRIORITY).toBe(100);
  });

  it("picks the most urgent flag", () => {
    expect(priorityForFlags(["low_resolution", "no_region"])).toBe(10);
    expect(priorityForFlags([])).toBe(100);
  });
});

describe("sortQueue", () => {
  it("orders by priority, then by created_at ascending", () => {
    const claimStub = (created_at: string, id: string) => ({
      id,
      pair_id: "p",
      cleanup_id: "c",
      cleanup_site: "Site",
      cleanup_date: "2026-10-24",
      pair_label: "Pair",
      text: "t",
      collector_name: "C",
      collector_id: "u1",
      status: "pending" as const,
      revision: 1,
      suggestion_id: null,
      x: 0.1,
      y: 0.2,
      w: 0.3,
      h: 0.3,
      category: "Beverage Bottles (Plastic)",
      photo_id: "ph1",
      supersedes_id: null,
      decided_by: null,
      decided_at: null,
      decision_note: null,
      created_at,
      updated_at: created_at,
      comparability: "comparable" as const,
      comparability_reason: null,
      framing_score: null,
      decided_by_name: null,
    });

    const sorted = sortQueue([
      {
        claim: claimStub("2026-10-24T10:00:00Z", "plain"),
        before: null,
        after: null,
        suggestion: null,
        flags: [],
        priority: 100,
      },
      {
        claim: claimStub("2026-10-24T09:00:00Z", "self"),
        before: null,
        after: null,
        suggestion: null,
        flags: ["self_reviewed"],
        priority: 60,
      },
      {
        claim: claimStub("2026-10-24T08:00:00Z", "people-old"),
        before: null,
        after: null,
        suggestion: null,
        flags: ["people_visible"],
        priority: 25,
      },
      {
        claim: claimStub("2026-10-24T11:00:00Z", "people-new"),
        before: null,
        after: null,
        suggestion: null,
        flags: ["people_visible"],
        priority: 25,
      },
    ]);

    expect(sorted.map((entry) => entry.claim.id)).toEqual([
      "people-old",
      "people-new",
      "self",
      "plain",
    ]);
  });

  it("does not mutate the input", () => {
    const stub = (priority: number, created_at: string, id: string) => ({
      claim: {
        id,
        pair_id: "p",
        cleanup_id: "c",
        cleanup_site: "Site",
        cleanup_date: "2026-10-24",
        pair_label: "Pair",
        text: "t",
        collector_name: "C",
        collector_id: "u1",
        photo_id: "ph1",
        supersedes_id: null,
        status: "pending" as const,
        revision: 1,
        suggestion_id: null,
        x: 0.1,
        y: 0.2,
        w: 0.3,
        h: 0.3,
        category: "Beverage Bottles (Plastic)",
        decided_by: null,
        decided_at: null,
        decision_note: null,
        created_at,
        updated_at: created_at,
        comparability: "comparable" as const,
        comparability_reason: null,
        framing_score: null,
        decided_by_name: null,
      },
      before: null,
      after: null,
      suggestion: null,
      flags: [],
      priority,
    });

    const input = [
      stub(100, "2026-10-24T10:00:00Z", "a"),
      stub(10, "2026-10-24T09:00:00Z", "b"),
    ];
    sortQueue(input);
    expect(input.map((entry) => entry.claim.id)).toEqual(["a", "b"]);
  });
});
