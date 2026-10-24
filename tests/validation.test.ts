import { describe, expect, it } from "vitest";
import {
  cleanupSchema,
  consentSchema,
  fieldErrors,
  personSchema,
  todayIso,
} from "../lib/validation";

describe("personSchema", () => {
  it("trims a display name", () => {
    const result = personSchema.parse({
      displayName: "  Maya C.  ",
      role: "collector",
    });
    expect(result.displayName).toBe("Maya C.");
  });

  it("rejects an empty display name", () => {
    const result = personSchema.safeParse({ displayName: "  ", role: "both" });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown role", () => {
    const result = personSchema.safeParse({
      displayName: "Maya C.",
      role: "admin",
    });
    expect(result.success).toBe(false);
  });
});

describe("cleanupSchema", () => {
  it("accepts today and a site label", () => {
    const result = cleanupSchema.safeParse({
      site: "North Jetty",
      date: todayIso(),
      conditions: "",
      publicNote: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a future date", () => {
    const result = cleanupSchema.safeParse({
      site: "North Jetty",
      date: "2999-01-01",
      conditions: "",
      publicNote: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed date", () => {
    const result = cleanupSchema.safeParse({
      site: "North Jetty",
      date: "10/24/2026",
      conditions: "",
      publicNote: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("consentSchema", () => {
  it("requires the checkbox value", () => {
    expect(consentSchema.safeParse("on").success).toBe(true);
    expect(consentSchema.safeParse("").success).toBe(false);
  });
});

describe("fieldErrors", () => {
  it("keeps the first error for each field", () => {
    const result = cleanupSchema.safeParse({
      site: "",
      date: "2999-01-01",
      conditions: "",
      publicNote: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = fieldErrors(result.error);
      expect(errors.site).toMatch(/site label/i);
      expect(errors.date).toMatch(/future/i);
    }
  });
});
