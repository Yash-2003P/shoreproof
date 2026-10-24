import { PersonForm } from "@/components/person-form";
import { getCurrentUser } from "@/lib/session";
import { roleLabel } from "@/lib/status";
import { formatDate } from "@/lib/format";
import { listUsers } from "@/lib/users";
import { redirect } from "next/navigation";

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
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="border-b border-line pb-6">
        <p className="field-label">Workspace</p>
        <h1 className="mt-2 font-serif text-4xl leading-none tracking-[-0.01em] text-ink">
          Settings
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
          People, privacy, and the local data boundary. ShoreProof has no
          accounts and no analytics.
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section aria-labelledby="people-heading">
          <div className="border-b border-line pb-3">
            <p className="field-label">People</p>
            <h2
              id="people-heading"
              className="mt-1 font-serif text-2xl text-ink"
            >
              Who can act
            </h2>
          </div>

          <ul className="mt-2">
            {users.map((user) => (
              <li
                key={user.id}
                className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line py-3"
              >
                <div>
                  <p className="text-sm font-medium text-ink">
                    {user.display_name}
                    {user.id === current.id ? (
                      <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.1em] text-tide">
                        You
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {roleLabel[user.role]} · added {formatDate(user.created_at.slice(0, 10))}
                  </p>
                </div>
                <span className="chip text-muted">
                  {user.id === current.id ? "Acting" : "Available"}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <PersonForm />
          </div>
        </section>

        <aside className="space-y-5">
          <div className="receipt p-5">
            <span className="receipt-hole" aria-hidden="true" />
            <p className="field-label">Workspace boundary</p>
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
                  className="flex items-baseline justify-between gap-4 border-b border-line pb-2 last:border-0 last:pb-0"
                >
                  <dt className="field-label">{term}</dt>
                  <dd className="mono text-right text-[10px] text-ink">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="stamp mt-5">Local first</p>
          </div>

          <div className="border border-line bg-wash p-5">
            <p className="field-label">Data wipe</p>
            <p className="mt-2 text-xs leading-5 text-muted">
              Removes the local database and every sanitized upload. There is no
              undo.
            </p>
            <pre className="mono mt-3 overflow-x-auto border border-line bg-paper px-3 py-2 text-[10px] leading-5 text-ink">
              npm run data:wipe -- --yes
            </pre>
          </div>

          <div className="panel p-5">
            <p className="field-label">Hosted use</p>
            <p className="mt-2 text-xs leading-5 text-muted">
              A hosted workspace must set <span className="mono">WORKSPACE_PASSPHRASE</span>{" "}
              and <span className="mono">AUTH_SECRET</span>. The public page
              stays public by design.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
