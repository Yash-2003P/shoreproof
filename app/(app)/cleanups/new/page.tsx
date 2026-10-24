import Link from "next/link";
import { redirect } from "next/navigation";
import { CleanupForm } from "@/components/cleanup-form";
import { getCurrentUser } from "@/lib/session";
import { todayIso } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "New cleanup",
};

export default async function NewCleanupPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/setup");
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <nav className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
        <Link href="/cleanups" className="hover:text-ink">
          Cleanups
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink">New</span>
      </nav>

      <header className="mt-5 max-w-2xl border-b border-line pb-6">
        <p className="field-label">Open a record</p>
        <h1 className="mt-2 font-serif text-4xl leading-[1.08] tracking-[-0.01em] text-ink">
          A cleanup starts with a place and a date.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          The site label and public note may be shared with a sponsor. Internal
          conditions stay in the workspace.
        </p>
      </header>

      <div className="mt-8">
        <CleanupForm today={todayIso()} leadName={user.display_name} />
      </div>
    </div>
  );
}
