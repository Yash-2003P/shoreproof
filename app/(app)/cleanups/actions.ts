"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createCleanup as insertCleanup,
  createPair as insertPair,
  getCleanup,
  getPairById,
} from "@/lib/cleanups";
import {
  ClaimError,
  deleteDraftClaim as removeDraftClaim,
  getClaimSummary,
  saveDraftClaim,
} from "@/lib/claims";
import { getCurrentUser } from "@/lib/session";
import { setPhotoPeopleVisible } from "@/lib/photos";
import { PhotoError } from "@/lib/privacy";
import {
  claimDraftSchema,
  cleanupSchema,
  consentSchema,
  fieldErrors,
  pairLabelSchema,
  textOrEmpty,
  textOrNull,
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

function numberField(value: FormDataEntryValue | null): number {
  if (typeof value !== "string" || value.trim().length === 0) {
    return Number.NaN;
  }
  return Number(value);
}

export async function saveClaim(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/setup");
  }

  const pairId = textOrNull(formData.get("pairId"));
  const photoId = textOrNull(formData.get("photoId"));
  const claimId = textOrNull(formData.get("claimId"));

  if (!pairId || !photoId) {
    return {
      message:
        "Open the pair workspace and add a before photo before saving a claim.",
    };
  }

  const parsed = claimDraftSchema.safeParse({
    text: textOrEmpty(formData.get("text")),
    category: textOrEmpty(formData.get("category")),
    region: {
      x: numberField(formData.get("x")),
      y: numberField(formData.get("y")),
      w: numberField(formData.get("w")),
      h: numberField(formData.get("h")),
    },
  });

  if (!parsed.success) {
    return {
      errors: fieldErrors(parsed.error),
      message: "Check the marked claim before saving.",
    };
  }

  try {
    const claim = saveDraftClaim({
      claimId,
      pairId,
      photoId,
      region: parsed.data.region,
      text: parsed.data.text,
      category: parsed.data.category,
      actorId: user.id,
    });
    const summary = getClaimSummary(claim.id);

    if (!summary) {
      throw new ClaimError("The draft could not be read back.", 500);
    }

    const pair = getPairById(pairId);
    if (pair) {
      revalidatePath(`/cleanups/${pair.cleanup_id}/pairs/${pair.id}`);
    }

    return { message: "Draft saved.", claim: summary };
  } catch (error) {
    if (error instanceof ClaimError) {
      return { message: error.message };
    }
    throw error;
  }
}

export async function deleteClaimDraft(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/setup");
  }

  const claimId = textOrNull(formData.get("claimId"));
  if (!claimId) {
    return { message: "Choose a draft to remove." };
  }

  try {
    const deleted = removeDraftClaim({ claimId, actorId: user.id });
    revalidatePath(`/cleanups/${deleted.cleanupId}/pairs/${deleted.pairId}`);
    return {
      message: "Draft removed. The claim was never evidence.",
      deletedClaimId: deleted.id,
    };
  } catch (error) {
    if (error instanceof ClaimError) {
      return { message: error.message };
    }
    throw error;
  }
}
