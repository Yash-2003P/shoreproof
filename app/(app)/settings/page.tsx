import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PersonForm } from "@/components/person-form";
import { getCurrentUser } from "@/lib/session";
import { roleLabel } from "@/lib/status";
import { formatDate } from "@/lib/format";
import { listUsers } from "@/lib/users";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const current = await getCurrentUser();
  if (!current) {
    redirect("/setup");
  }

  const users = listUsers();

  return (
    <div className="page">
      <PageHeader
        title="Settings"
        description="People, privacy, and the local data boundary. ShoreProof has no accounts and no analytics."
      />

      <div className="mt-9 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <section aria-labelledby="people-heading">
          <div className="border-b border-line pb-3">
            <h2 id="people-heading" className="heading-2">
              Who can act
            </h2>
            <p className="meta-text mt-1">
              Display names only. No email, phone number, or password.
            </p>
          </div>

          <ul className="mt-2">
            {users.map((user) => (
              <li
                key={user.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-4"
              >
                <div>
                  <p className="flex flex-wrap items-center gap-2 text-base font-medium text-ink">
                    {user.display_name}
                    {user.id === current.id ? (
                      <span className="chip chip-tide">You</span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {roleLabel[user.role]} · added{" "}
                    {formatDate(user.created_at.slice(0, 10))}
                  </p>
                </div>
                <span className="chip text-muted">
                  {user.id === current.id ? "Acting" : "Available"}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-7">
            <PersonForm />
          </div>
        </section>

        <aside className="space-y-5">
          <div className="receipt p-5">
            <span className="receipt-hole" aria-hidden="true" />
            <h2 className="field-label">Workspace boundary</h2>
            <dl className="mt-4 space-y-3">
              {[
                ["Identity", "Display names only"],
                ["Accounts", "None"],
                ["Analytics", "None"],
                ["Photo storage", "Sanitized JPEGs"],
                ["Original uploads", "Discarded"],
                ["Public page", "Off by default"],
              ].map(([term, value]) => (
                <div
                  key={term}
                  className="flex items-baseline justify-between gap-4 border-b border-line pb-2.5 last:border-0 last:pb-0"
                >
                  <dt className="field-label">{term}</dt>
                  <dd className="mono text-right text-xs text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="stamp mt-5">Local first</p>
          </div>

          <div className="border border-line bg-wash p-5">
            <h2 className="panel-title">Data wipe</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Removes the local database and every sanitized upload. There is no
              undo.
            </p>
            <pre className="mono mt-3 overflow-x-auto border border-line bg-paper px-3.5 py-3 text-xs leading-6 text-ink">
              npm run data:wipe -- --yes
            </pre>
          </div>

          <div className="panel p-5">
            <h2 className="panel-title">Hosted use</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              A hosted workspace must set{" "}
              <span className="mono text-xs">WORKSPACE_PASSPHRASE</span> and{" "}
              <span className="mono text-xs">AUTH_SECRET</span>. The public page
              stays public by design.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
