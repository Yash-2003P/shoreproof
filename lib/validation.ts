import { z } from "zod";

export type ActionState = {
  errors?: Record<string, string>;
  message?: string;
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
