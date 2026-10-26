import { Receipt } from "@/components/receipt";
import { formatDate, formatTimestamp } from "@/lib/format";
import type { ExportBundle, ExportMode } from "@/lib/export";

function ModeStamp({ mode }: { mode: ExportMode }) {
  return (
    <span className="stamp stamp-in">
      {mode === "public" ? "Public record" : "Confirmed claims only"}
    </span>
  );
}

function ExcludedAppendix({ bundle }: { bundle: ExportBundle }) {
  if (bundle.excluded.length === 0) return null;

  return (
    <section className="mt-16 border-t-[3px] border-ink pt-7">
      <p className="field-label">Appendix · excluded claims</p>
      <h2 className="heading-2 mt-2">Claims that are not evidence</h2>
      <p className="mt-2 max-w-2xl text-base leading-7 text-muted">
        These claims were rejected, sent back for more evidence, or superseded
        by a later revision. They are listed for a complete audit trail and are
        not part of the confirmed record.
      </p>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr>
              {["Status", "Pair", "Observation", "Reviewer", "Reason"].map(
                (heading) => (
                  <th
                    key={heading}
                    className="border-b border-line bg-wash px-3 py-2.5 text-xs font-semibold text-muted"
                  >
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {bundle.excluded.map((claim) => (
              <tr key={claim.claimId}>
                <td className="border-b border-line px-3 py-3 align-top text-xs font-semibold uppercase tracking-[0.06em] text-flag-ink">
                  {claim.status}
                </td>
                <td className="border-b border-line px-3 py-3 align-top">
                  {claim.pairLabel}
                </td>
                <td className="border-b border-line px-3 py-3 align-top leading-6">
                  {claim.text}
                  {claim.category ? (
                    <span className="mt-1 block text-xs text-muted">
                      {claim.category}
                    </span>
                  ) : null}
                </td>
                <td className="border-b border-line px-3 py-3 align-top">
                  {claim.reviewerName ?? "—"}
                </td>
                <td className="border-b border-line px-3 py-3 align-top leading-6 text-muted">
                  {claim.note ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AuditAppendix({ bundle }: { bundle: ExportBundle }) {
  if (bundle.audit.length === 0) return null;

  return (
    <section className="mt-16 border-t-[3px] border-ink pt-7">
      <p className="field-label">Appendix · audit log</p>
      <h2 className="heading-2 mt-2">Every recorded action</h2>
      <p className="mt-2 max-w-2xl text-base leading-7 text-muted">
        Append-only events, oldest first. The log is internal to this export and
        never appears on a public page.
      </p>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-xs">
          <thead>
            <tr>
              {["Time (UTC)", "Event", "Actor", "Details"].map((heading) => (
                <th
                  key={heading}
                  className="border-b border-line bg-wash px-3 py-2.5 font-semibold text-muted"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bundle.audit.map((entry) => (
              <tr key={entry.id}>
                <td className="whitespace-nowrap border-b border-line px-3 py-2.5 align-top font-mono">
                  {formatTimestamp(entry.createdAt)}
                </td>
                <td className="border-b border-line px-3 py-2.5 align-top font-mono">
                  {entry.type}
                </td>
                <td className="border-b border-line px-3 py-2.5 align-top">
                  {entry.actorName ?? "system"}
                </td>
                <td className="max-w-[360px] break-all border-b border-line px-3 py-2.5 align-top font-mono leading-5 text-muted">
                  {JSON.stringify(entry.payload)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * The record itself: cover, method, confirmed receipts, then the export-only
 * appendixes. The public page renders this with mode="public", which never
 * receives excluded claims, conditions, or audit rows in the first place.
 */
export function EvidencePack({
  bundle,
  mode,
}: {
  bundle: ExportBundle;
  mode: ExportMode;
}) {
  const { cleanup } = bundle;
  const claimWord = bundle.claims.length === 1 ? "claim" : "claims";

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <header className="border-b-[3px] border-ink pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-tide">
          ShoreProof
        </p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="display-1">{cleanup.site}</h1>
            <p className="mt-3 text-base text-muted">
              {formatDate(cleanup.date)} · Lead {cleanup.leadName}
            </p>
            <p className="mt-1 text-xs text-muted">
              {bundle.claims.length} confirmed {claimWord} · generated{" "}
              {formatTimestamp(bundle.generatedAt)}
            </p>
          </div>
          <ModeStamp mode={mode} />
        </div>
      </header>

      <section id="method" className="mt-9 max-w-2xl scroll-mt-8">
        <h2 className="heading-2">What this record is</h2>
        <p className="mt-3 text-base leading-7 text-muted">
          Each claim below resolves to a marked region in a specific sanitized
          photo, a named human review decision, and a receipt. The browser
          detector only proposed candidate boxes; a person accepted or drew
          every region, wrote the observation, chose the category, and a person
          confirmed it. AI never set a verdict or a category on its own.
        </p>
        <p className="mt-3 text-base leading-7 text-muted">
          Photos were sanitized at import: orientation normalized, re-encoded,
          EXIF and GPS stripped, and the uploaded original discarded. The crop
          in each receipt is cut from the sanitized bytes, and the two hashes
          name the stored image and the discarded original.
        </p>
        <p className="mt-3 text-base leading-7 text-muted">
          Consent was attested by {cleanup.consentName} on{" "}
          {formatTimestamp(cleanup.consentAttestedAt)} (policy{" "}
          {cleanup.consentVersion}).
          {cleanup.publicNote ? ` ${cleanup.publicNote}` : ""}
        </p>

        <dl className="mt-6 grid gap-x-8 gap-y-4 border-t border-line pt-5 sm:grid-cols-2">
          {mode === "export" ? (
            <div>
              <dt className="field-label">Record</dt>
              <dd className="mt-1 break-all font-mono text-xs leading-5 text-muted">
                {cleanup.id}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="field-label">Consent</dt>
            <dd className="mt-1 text-sm leading-6">
              {cleanup.consentName} · {cleanup.consentVersion}
            </dd>
          </div>
          {mode === "export" && cleanup.conditions ? (
            <div className="sm:col-span-2">
              <dt className="field-label">Conditions (internal)</dt>
              <dd className="mt-1 text-sm leading-6 text-muted">
                {cleanup.conditions}
              </dd>
            </div>
          ) : null}
          {cleanup.publicPublishedAt ? (
            <div>
              <dt className="field-label">First published</dt>
              <dd className="mt-1 text-sm leading-6">
                {formatTimestamp(cleanup.publicPublishedAt)}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="mt-10" aria-label="Confirmed claims">
        <div className="flex items-center justify-between gap-3 border-b border-line pb-2.5">
          <h2 className="field-label">Confirmed claims</h2>
          <p className="text-xs text-muted">
            {bundle.claims.length} of {bundle.claims.length}
          </p>
        </div>

        {bundle.claims.length === 0 ? (
          <p className="mt-6 border border-dashed border-line bg-wash p-6 text-base leading-7 text-muted">
            No confirmed claims yet. A claim enters this record only after a
            named reviewer confirms it.
          </p>
        ) : (
          <div className="mt-6 space-y-7">
            {bundle.claims.map((receipt, index) => (
              <Receipt
                key={receipt.claimId}
                receipt={receipt}
                index={index}
                showDecisionNote={mode === "export"}
              />
            ))}
          </div>
        )}
      </section>

      {mode === "export" ? (
        <>
          <ExcludedAppendix bundle={bundle} />
          <AuditAppendix bundle={bundle} />
        </>
      ) : null}

      <section className="mt-16 border-t-[3px] border-ink pt-7">
        <p className="field-label">AI disclosure</p>
        <h2 className="heading-2 mt-2">What the model did and did not do</h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
          ShoreProof runs a pinned YOLO26n ONNX model in the browser to propose
          candidate boxes. It is a COCO-class detector, so it can miss litter
          and cannot name an ICC category. Every accepted box became a draft
          that a person had to describe and submit. Every confirmed claim was
          decided by a named reviewer, and the receipt records whether the
          accepted box was edited. The model file is fetched by a
          checksum-pinned script and is never bundled into the record.
        </p>
      </section>

      <footer className="mt-16 border-t border-line pt-5 text-xs leading-6 text-muted">
        <p>
          Generated by ShoreProof from a local SQLite database · schema{" "}
          <span className="font-mono">{bundle.schema}</span>
          {mode === "export" ? (
            <>
              {" "}
              · <span className="font-mono">{cleanup.id}</span>
            </>
          ) : null}
        </p>
        <p className="mt-1.5">
          {mode === "export"
            ? "Every confirmed claim is immutable. A correction creates a new revision; both versions stay in the audit log. This document contains no scripts and makes no network requests."
            : "Every confirmed claim is immutable. A correction creates a new revision; the previous version stays in the workspace audit log. This page is read-only and shows confirmed claims only."}
        </p>
      </footer>
    </div>
  );
}
