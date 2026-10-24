"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createCleanup as insertCleanup,
  createPair as insertPair,
  getCleanup,
} from "@/lib/cleanups";
import { getCurrentUser } from "@/lib/session";
import { setPhotoPeopleVisible } from "@/lib/photos";
import { PhotoError } from "@/lib/privacy";
import {
  cleanupSchema,
  consentSchema,
  fieldErrors,
  pairLabelSchema,
  textOrEmpty,
  type ActionState,
} from "@/lib/validation";

const CONSENT_VERSION = "2026-10-24";

export async function createCleanup(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/setup");
  }

  const parsed = cleanupSchema.safeParse({
    site: formData.get("site"),
    date: formData.get("date"),
    conditions: textOrEmpty(formData.get("conditions")),
    publicNote: textOrEmpty(formData.get("publicNote")),
  });

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) };
  }

  const consent = consentSchema.safeParse(formData.get("consent") ?? "");
  if (!consent.success) {
    return {
      errors: {
        consent:
          consent.error.issues[0]?.message ??
          "Consent is required to create a cleanup.",
      },
    };
  }

  const cleanup = insertCleanup({
    site: parsed.data.site,
    date: parsed.data.date,
    conditions: parsed.data.conditions || null,
    publicNote: parsed.data.publicNote || null,
    leadId: user.id,
    consentVersion: CONSENT_VERSION,
  });

  revalidatePath("/cleanups");
  redirect(`/cleanups/${cleanup.id}`);
}

export async function createPair(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/setup");
  }

  const cleanupId = formData.get("cleanupId");
  if (typeof cleanupId !== "string") {
    redirect("/cleanups");
  }

  const cleanup = getCleanup(cleanupId);
  if (!cleanup) {
    redirect("/cleanups");
  }

  const rawLabel = formData.get("label");
  const parsedLabel =
    typeof rawLabel === "string" && rawLabel.trim().length > 0
      ? pairLabelSchema.safeParse(rawLabel)
      : null;

  const pair = insertPair({
    cleanupId,
    label: parsedLabel?.success ? parsedLabel.data : null,
    actorId: user.id,
  });

  revalidatePath(`/cleanups/${cleanupId}`);
  redirect(`/cleanups/${cleanupId}/pairs/${pair.id}`);
}

export async function setPeopleVisible(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/setup");
  }

  const photoId = formData.get("photoId");
  const pairPath = formData.get("pairPath");

  if (typeof photoId !== "string") {
    return { message: "Choose a photo first." };
  }

  try {
    setPhotoPeopleVisible({
      photoId,
      peopleVisible: formData.get("peopleVisible") === "1",
      actorId: user.id,
    });
  } catch (error) {
    if (error instanceof PhotoError) {
      return { message: error.message };
    }
    throw error;
  }

  if (typeof pairPath === "string" && pairPath.startsWith("/")) {
    revalidatePath(pairPath);
  }

  return { message: "Privacy flag saved." };
}
