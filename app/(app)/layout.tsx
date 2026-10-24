import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/session";
import { listUsers } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/setup");
  }

  return (
    <AppShell user={user} users={listUsers()}>
      {children}
    </AppShell>
  );
}
