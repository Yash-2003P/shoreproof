"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  PublishingError,
  publishCleanup as publishCleanupRow,
  unpublishCleanup as unpublishCleanupRow,
} from "@/lib/publishing";
import { getCurrentUser } from "@/lib/session";
import { textOrNull, type ActionState } from "@/lib/validation";

function revalidateRecord(cleanupId: string) {
  revalidatePath(`/cleanups/${cleanupId}`);
  revalidatePath(`/cleanups/${cleanupId}/export`);
}

export async function publishRecord(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/setup");
  }

  const cleanupId = textOrNull(formData.get("cleanupId"));
  if (!cleanupId) {
    return { errors: { publish: "Cleanup not found." } };
  }

  try {
    publishCleanupRow({ cleanupId, actorId: user.id });
  } catch (error) {
    if (error instanceof PublishingError) {
      return {
        errors: {
          publish: [error.message, ...error.blockers.map((item) => item.message)]
            .join(" ")
            .trim(),
        },
      };
    }
    throw error;
  }

  revalidateRecord(cleanupId);
  return { message: "Published. The new public link is live." };
}

export async function unpublishRecord(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/setup");
  }

  const cleanupId = textOrNull(formData.get("cleanupId"));
  if (!cleanupId) {
    return { errors: { publish: "Cleanup not found." } };
  }

  try {
    unpublishCleanupRow({ cleanupId, actorId: user.id });
  } catch (error) {
    if (error instanceof PublishingError) {
      return { errors: { publish: error.message } };
    }
    throw error;
  }

  revalidateRecord(cleanupId);
  return { message: "Unpublished. The old link now returns 404." };
}
