import { z } from "zod";
import { isIccCategory } from "./icc";
import { isValidRegion } from "./region";
import type { ClaimSummary, SuggestionWithRun } from "./types";

export type ActionState = {
  errors?: Record<string, string>;
  message?: string;
  claim?: ClaimSummary;
  deletedClaimId?: string;
  suggestions?: SuggestionWithRun[];
};

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export const personSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Add a display name.")
    .max(80, "Keep the display name under 80 characters."),
  role: z.enum(["collector", "reviewer", "both"]),
});

export const cleanupSchema = z.object({
  site: z
    .string()
    .trim()
    .min(1, "Add a site label.")
    .max(120, "Keep the site label under 120 characters."),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.")
    .refine(
      (value) => value <= todayIso(),
      "The cleanup date cannot be in the future.",
    ),
  conditions: z
    .string()
    .trim()
    .max(2000, "Keep internal conditions under 2,000 characters."),
  publicNote: z
    .string()
    .trim()
    .max(2000, "Keep the public note under 2,000 characters."),
});

export const consentSchema = z
  .string()
  .refine((value) => value === "on", {
    message: "Consent is required to create a cleanup.",
  });

export const pairLabelSchema = z
  .string()
  .trim()
  .min(1, "Add a pair label.")
  .max(120, "Keep the pair label under 120 characters.");

const coordinate = z
  .number()
  .refine((value) => Number.isFinite(value), "Draw a region on the photo.");

export const claimDraftSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Write one sentence about what you removed.")
    .max(280, "Keep the observation at 280 characters or fewer."),
  category: z
    .string()
    .refine(isIccCategory, "Choose an ICC category, including Not sure."),
  region: z
    .object({ x: coordinate, y: coordinate, w: coordinate, h: coordinate })
    .refine(isValidRegion, {
      message:
        "Draw a region on the before photo. The smallest region is 2% × 2%.",
    }),
});

export const detectorBoxSchema = z.object({
  x: coordinate,
  y: coordinate,
  w: coordinate,
  h: coordinate,
  score: z.number().min(0).max(1),
  cocoId: z.number().int().min(0).max(79),
});

export const suggestionsPayloadSchema = z.object({
  pairId: z.string().min(1),
  photoId: z.string().min(1),
  model: z.string().min(1).max(80),
  modelSha256: z.string().regex(/^[a-f0-9]{64}$/),
  runtimeMs: z.number().int().min(0).max(600_000),
  inputWidth: z.number().int().min(1).max(4096),
  inputHeight: z.number().int().min(1).max(4096),
  boxes: z.array(detectorBoxSchema).max(20),
});

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !errors[key]) {
      errors[key] = issue.message;
    }
  }
  return errors;
}

export function textOrNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function textOrEmpty(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}
