"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser, setCurrentUser } from "@/lib/session";
import {
  WORKSPACE_COOKIE,
  workspaceAuthEnabled,
} from "@/lib/workspace-auth";
import { countUsers, createUser, getUser, getUserByDisplayName } from "@/lib/users";
import {
  fieldErrors,
  personSchema,
  type ActionState,
} from "@/lib/validation";

export async function createFirstUser(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (countUsers() > 0) {
    redirect("/cleanups");
  }

  const parsed = personSchema.safeParse({
    displayName: formData.get("displayName"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) };
  }

  if (formData.get("acknowledge") !== "on") {
    return {
      errors: {
        acknowledge:
          "Acknowledge the privacy note before opening the workspace.",
      },
    };
  }

  if (getUserByDisplayName(parsed.data.displayName)) {
    return { errors: { displayName: "That display name is already in use." } };
  }

  const user = createUser(parsed.data);
  await setCurrentUser(user.id);
  revalidatePath("/", "layout");
  redirect("/cleanups");
}

export async function addPerson(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const current = await getCurrentUser();
  if (!current) {
    redirect("/setup");
  }

  const parsed = personSchema.safeParse({
    displayName: formData.get("displayName"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) };
  }

  if (getUserByDisplayName(parsed.data.displayName)) {
    return { errors: { displayName: "That display name is already in use." } };
  }

  createUser(parsed.data);
  revalidatePath("/settings");
  revalidatePath("/cleanups");
  return { message: `Added ${parsed.data.displayName}.` };
}

export async function switchUser(formData: FormData): Promise<void> {
  const userId = formData.get("userId");
  const next = formData.get("next");

  if (typeof userId !== "string" || !getUser(userId)) {
    return;
  }

  await setCurrentUser(userId);
  revalidatePath("/", "layout");

  const target =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/cleanups";

  redirect(target);
}

/**
 * Clears the workspace passphrase cookie. It does not change the configured
 * passphrase or any record; it only locks this browser.
 */
export async function lockWorkspace(): Promise<void> {
  const store = await cookies();
  store.delete(WORKSPACE_COOKIE);
  redirect(workspaceAuthEnabled() ? "/login" : "/cleanups");
}
