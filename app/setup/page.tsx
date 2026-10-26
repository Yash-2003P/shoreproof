import { redirect } from "next/navigation";
import { SetupForm } from "@/components/setup-form";
import { Wordmark } from "@/components/wordmark";
import { countUsers } from "@/lib/users";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "First run",
  robots: { index: false, follow: false },
};

export default function SetupPage() {
  if (countUsers() > 0) {
    redirect("/cleanups");
  }

  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-t-2 border-tide border-b border-line bg-salt">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-3 sm:px-8">
          <Wordmark href="/setup" />
          <span className="chip chip-tide">First run</span>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-20">
        <section className="max-w-xl">
          <p className="field-label">Workspace setup</p>
          <h1 className="display-1 mt-3">Who is keeping the record?</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-muted">
            ShoreProof asks for a display name, not an account. It appears on
            the claims you collect and the decisions you make — so a sponsor can
            see who stood behind each one.
          </p>

          <ol className="mt-8 space-y-4">
            {[
              [
                "01",
                "A display name is the only identity.",
                "No email, phone number, password, or legal name.",
              ],
              [
                "02",
                "A second person can review.",
                "Add a reviewer later from Settings; small teams can do both.",
              ],
              [
                "03",
                "Photos stay on this machine.",
                "No analytics, no third-party scripts, no uploads to a model service.",
              ],
            ].map(([number, title, detail]) => (
              <li key={number} className="flex gap-4">
                <span className="mono pt-0.5 text-sm text-tide">
                  {number}
                </span>
                <span>
                  <span className="block text-base font-medium text-ink">
                    {title}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-muted">
                    {detail}
                  </span>
                </span>
              </li>
            ))}
          </ol>

          <div className="receipt mt-10 p-5">
            <span className="receipt-hole" aria-hidden="true" />
            <p className="field-label">Identity on record</p>
            <dl className="mt-4 space-y-3">
              <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2">
                <dt className="field-label">Display name</dt>
                <dd className="text-sm text-ink">Maya C.</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2">
                <dt className="field-label">Email</dt>
                <dd className="text-sm text-muted">not collected</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2">
                <dt className="field-label">Location</dt>
                <dd className="text-sm text-muted">not collected</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="field-label">Legal name</dt>
                <dd className="text-sm text-muted">not collected</dd>
              </div>
            </dl>
            <p className="stamp stamp-in mt-5">Data minimum</p>
          </div>
        </section>

        <section className="lg:pt-12">
          <SetupForm />
          <p className="mt-4 text-center text-xs text-muted">
            Local workspace · no account · no analytics
          </p>
        </section>
      </div>
    </main>
  );
}
