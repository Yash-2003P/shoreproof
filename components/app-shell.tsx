import type { ReactNode } from "react";
import { AppNav } from "@/components/app-nav";
import { UserSwitcher } from "@/components/user-switcher";
import { Wordmark } from "@/components/wordmark";
import type { User } from "@/lib/types";

export function AppShell({
  user,
  users,
  children,
}: {
  user: User;
  users: User[];
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-t-2 border-tide border-b border-line bg-salt">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-6 py-4">
          <Wordmark />
          <AppNav />
          <div className="ml-auto flex items-center gap-4">
            <span className="hidden font-mono text-[9px] uppercase tracking-[0.14em] text-muted md:inline">
              Local workspace
            </span>
            <UserSwitcher users={users} currentId={user.id} />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em]">
            ShoreProof · evidence record
          </p>
          <p>Photos are sanitized on upload. Display names only.</p>
        </div>
      </footer>
    </div>
  );
}
