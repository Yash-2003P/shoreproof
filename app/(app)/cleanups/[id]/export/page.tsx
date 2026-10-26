import Link from "next/link";
import { notFound } from "next/navigation";
import { EvidencePack } from "@/components/evidence-pack";
import { PublishPanel } from "@/components/publish-panel";
import { getCleanup } from "@/lib/cleanups";
import {
  buildExportBundle,
  exportBlockers,
  publicBlockers,
} from "@/lib/export";
import { formatTimestamp } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ExportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cleanup = getCleanup(id);

  if (!cleanup) {
    notFound();
  }

  const blockers = exportBlockers(cleanup.id);
  const publishIssues = publicBlockers(cleanup.id);
  const bundle =
    blockers.length === 0
      ? await buildExportBundle(cleanup.id, "export")
      : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <header>
        <Link
          href={`/cleanups/${cleanup.id}`}
          className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted hover:text-ink"
        >
          ← {cleanup.site}
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="field-label">Evidence pack</p>
            <h1 className="mt-1 font-display text-3xl text-ink">
              Export and publish
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-5 text-muted">
              Every confirmed claim carries its crop, sanitized source hash,
              region, collector, reviewer, timestamp, checks, comparability, and
              AI provenance. Rejected and returned claims appear only in the
              export appendix.
            </p>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            {cleanup.date} · {cleanup.lead_name}
          </p>
        </div>
      </header>

      <div className="mt-7 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="panel p-5" aria-labelledby="download-heading">
          <p className="field-label">Download</p>
          <h2 id="download-heading" className="mt-1 font-serif text-xl text-ink">
            The record leaves as a file
          </h2>
          <p className="mt-2 text-xs leading-5 text-muted">
            The pack is all-or-nothing: if a confirmed claim cannot be rendered
            correctly, ShoreProof refuses the download instead of quietly
            dropping it. Each completed download is written to the audit log.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="border border-line bg-wash p-3.5">
              <p className="field-label">Self-contained HTML</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Inline CSS and embedded crops. Opens offline; no fonts, scripts,
                or network requests.
              </p>
              <a
                href={`/api/cleanups/${cleanup.id}/export?format=html`}
                download
                aria-disabled={blockers.length > 0}
                className={`btn btn-primary mt-3 w-full justify-center ${
                  blockers.length > 0 ? "pointer-events-none opacity-50" : ""
                }`}
              >
                Download HTML
              </a>
            </div>

            <div className="border border-line bg-wash p-3.5">
              <p className="field-label">Structured JSON</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                The same receipts and appendix, schema{" "}
                <span className="font-mono">shoreproof.export.v1</span>.
              </p>
              <a
                href={`/api/cleanups/${cleanup.id}/export?format=json`}
                download
                aria-disabled={blockers.length > 0}
                className={`btn btn-ghost mt-3 w-full justify-center ${
                  blockers.length > 0 ? "pointer-events-none opacity-50" : ""
                }`}
              >
                Download JSON
              </a>
            </div>
          </div>

          {bundle ? (
            <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
              {bundle.claims.length} confirmed{" "}
              {bundle.claims.length === 1 ? "claim" : "claims"} ·{" "}
              {bundle.excluded.length} excluded · {bundle.audit.length} audit
              events
            </p>
          ) : null}
        </section>

        <PublishPanel
          cleanupId={cleanup.id}
          slug={cleanup.public_slug}
          published={cleanup.public_enabled === 1}
          publishedAt={cleanup.public_published_at}
          blockers={publishIssues}
        />
      </div>

      {blockers.length > 0 ? (
        <section
          className="mt-7 border border-flag bg-paper p-5"
          aria-labelledby="blocked-heading"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="field-label text-flag-ink">Export blocked</p>
              <h2
                id="blocked-heading"
                className="mt-1 font-serif text-xl text-ink"
              >
                This record is not ready to leave
              </h2>
            </div>
            <span className="chip chip-flag">{blockers.length} blockers</span>
          </div>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-muted">
            A pack that silently omits a confirmed claim would be worse than no
            pack. Fix these in the record, then come back.
          </p>
          <ul className="mt-3 space-y-2">
            {blockers.map((blocker) => (
              <li
                key={`${blocker.code}-${blocker.claimId ?? ""}`}
                className="border-l-[3px] border-flag bg-wash px-3.5 py-2.5 text-xs leading-5"
              >
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-flag-ink">
                  {blocker.code.replaceAll("_", " ")}
                </span>
                <p className="mt-0.5 text-muted">{blocker.message}</p>
                {blocker.claimId ? (
                  <Link
                    href={`/review/${blocker.claimId}`}
                    className="mt-1 inline-block font-mono text-[10px] uppercase tracking-[0.08em] text-tide hover:underline"
                  >
                    Open claim in review →
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="mt-10 border-t border-line pt-2" aria-label="Export preview">
          <div className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="field-label">Preview · the same receipts and appendix</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
              Generated {bundle ? formatTimestamp(bundle.generatedAt) : ""}
            </p>
          </div>
          {bundle ? (
            <div className="border border-line bg-paper">
              <EvidencePack bundle={bundle} mode="export" />
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
