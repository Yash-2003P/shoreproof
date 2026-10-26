import type { ReactNode } from "react";
import { AppNav } from "@/components/app-nav";
import { UserSwitcher } from "@/components/user-switcher";
import { Wordmark } from "@/components/wordmark";
import { pendingReviewCount } from "@/lib/queue.server";
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
  const reviewCount = pendingReviewCount();

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-t-2 border-tide border-b border-line bg-salt">
        <div className="mx-auto flex w-full max-w-[1480px] flex-wrap items-center gap-x-8 gap-y-1 px-5 py-2 sm:px-8">
          <Wordmark />
          <AppNav reviewCount={reviewCount} />
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-muted lg:inline">
              Local workspace
            </span>
            <UserSwitcher users={users} currentId={user.id} />
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-1 px-5 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="font-medium text-ink">ShoreProof · evidence record</p>
          <p>Photos are sanitized on upload. Display names only.</p>
        </div>
      </footer>
    </div>
  );
}
