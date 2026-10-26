"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createWorkspaceToken,
  passphraseMatches,
  safeNextPath,
  WORKSPACE_COOKIE,
  WORKSPACE_SESSION_SECONDS,
  workspaceAuthEnabled,
} from "@/lib/workspace-auth";

export async function signIn(formData: FormData): Promise<void> {
  const next = safeNextPath(formData.get("next"));

  if (!workspaceAuthEnabled()) {
    redirect(next);
  }

  const passphrase = String(formData.get("passphrase") ?? "");
  if (!passphraseMatches(passphrase)) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

  const store = await cookies();
  store.set(WORKSPACE_COOKIE, createWorkspaceToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: WORKSPACE_SESSION_SECONDS,
  });

  redirect(next);
}
