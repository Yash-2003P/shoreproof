import Link from "next/link";
import { notFound } from "next/navigation";
import { EvidencePack } from "@/components/evidence-pack";
import { Breadcrumbs, PageHeader } from "@/components/page-header";
import { PublishPanel } from "@/components/publish-panel";
import { getCleanup } from "@/lib/cleanups";
import {
  buildExportBundle,
  exportBlockers,
  publicBlockers,
} from "@/lib/export";
import { formatDate, formatTimestamp } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Export",
};

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
    <div className="page">
      <Breadcrumbs
        items={[
          { label: "Cleanups", href: "/cleanups" },
          { label: cleanup.site, href: `/cleanups/${cleanup.id}` },
          { label: "Export" },
        ]}
      />

      <div className="mt-5">
        <PageHeader
          title="Export and publish"
          meta={
            <span>
              {cleanup.site} · {formatDate(cleanup.date)} · Lead {cleanup.lead_name}
            </span>
          }
          description="Every confirmed claim carries its crop, sanitized source hash, region, collector, reviewer, timestamp, checks, comparability, and AI provenance. Rejected and returned claims appear only in the export appendix."
        />
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="panel p-5 sm:p-6" aria-labelledby="download-heading">
          <p className="field-label">Download</p>
          <h2 id="download-heading" className="heading-2 mt-1">
            The record leaves as a file
          </h2>
          <p className="dense-text mt-2 text-muted">
            The pack is all-or-nothing: if a confirmed claim cannot be rendered
            correctly, ShoreProof refuses the download instead of quietly
            dropping it. Each completed download is written to the audit log.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="flex h-full flex-col border border-line bg-wash p-4">
              <p className="panel-title">Self-contained HTML</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Inline CSS and embedded crops. Opens offline; no fonts, scripts,
                or network requests.
              </p>
              <a
                href={`/api/cleanups/${cleanup.id}/export?format=html`}
                download
                aria-disabled={blockers.length > 0}
                className={`btn btn-primary mt-auto w-full justify-center ${
                  blockers.length > 0 ? "pointer-events-none opacity-50" : ""
                }`}
              >
                Download HTML
              </a>
            </div>

            <div className="flex h-full flex-col border border-line bg-wash p-4">
              <p className="panel-title">Structured JSON</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                The same receipts and appendix, schema{" "}
                <span className="font-mono">shoreproof.export.v1</span>.
              </p>
              <a
                href={`/api/cleanups/${cleanup.id}/export?format=json`}
                download
                aria-disabled={blockers.length > 0}
                className={`btn btn-ghost mt-auto w-full justify-center ${
                  blockers.length > 0 ? "pointer-events-none opacity-50" : ""
                }`}
              >
                Download JSON
              </a>
            </div>
          </div>

          {bundle ? (
            <p className="mt-4 text-xs text-muted">
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
          className="mt-8 border border-flag bg-paper p-5 sm:p-6"
          aria-labelledby="blocked-heading"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="field-label text-flag-ink">Export blocked</p>
              <h2 id="blocked-heading" className="heading-2 mt-1">
                This record is not ready to leave
              </h2>
            </div>
            <span className="chip chip-flag">{blockers.length} blockers</span>
          </div>
          <p className="dense-text mt-2 max-w-2xl text-muted">
            A pack that silently omits a confirmed claim would be worse than no
            pack. Fix these in the record, then come back.
          </p>
          <ul className="mt-4 space-y-2.5">
            {blockers.map((blocker) => (
              <li
                key={`${blocker.code}-${blocker.claimId ?? ""}`}
                className="border-l-[3px] border-flag bg-wash px-4 py-3"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-flag-ink">
                  {blocker.code.replaceAll("_", " ")}
                </span>
                <p className="mt-1 text-sm leading-6 text-muted">
                  {blocker.message}
                </p>
                {blocker.claimId ? (
                  <Link
                    href={`/review/${blocker.claimId}`}
                    className="mt-2 inline-block text-sm font-medium text-tide link-underline"
                  >
                    Open claim in review →
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section
          className="mt-12 border-t border-line pt-2"
          aria-label="Export preview"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 py-5">
            <div>
              <h2 className="heading-3">Preview</h2>
              <p className="mt-1 text-xs text-muted">
                The same receipts and appendix that leave in the file.
              </p>
            </div>
            <p className="text-xs text-muted">
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
