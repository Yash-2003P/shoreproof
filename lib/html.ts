import { formatRegion } from "./region";
import type { AuditEntry, ExportBundle, Receipt } from "./export";

/**
 * The self-contained export document. No scripts, no external fonts, no
 * network requests: inline CSS and base64 crops only, so it opens offline and
 * survives being moved between machines.
 *
 * Every user string passes through escapeHtml. This module is pure so the
 * escaping tests do not need a database.
 */

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function shortHash(hash: string, length = 16): string {
  return hash.length > length ? `${hash.slice(0, length)}…` : hash;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function renderReceipt(receipt: Receipt, index: number): string {
  const number = String(index + 1).padStart(2, "0");
  const suggestion = receipt.suggestion
    ? `<p class="provenance">${escapeHtml(receipt.suggestion.model)} proposed
        <strong>${escapeHtml(receipt.suggestion.className)}</strong> at
        ${receipt.suggestion.confidence.toFixed(2)}. A human accepted the box
        ${receipt.suggestion.edited ? "and edited it" : "without edits"}${
          receipt.suggestion.iccCategory
            ? `, mapped to ${escapeHtml(receipt.suggestion.iccCategory)}${
                receipt.suggestion.mappingUncertain
                  ? " (mapping uncertain)"
                  : ""
              }`
            : ""
        }. Run ${escapeHtml(shortHash(receipt.suggestion.modelSha256, 12))}.</p>`
    : `<p class="provenance">No AI suggestion. The region was marked by hand.</p>`;

  return `
    <article class="receipt" id="claim-${escapeHtml(receipt.claimId)}">
      <header class="receipt-head">
        <p class="kicker">Receipt ${number} · revision ${receipt.revision}</p>
        <span class="stamp">Confirmed</span>
      </header>

      <img class="crop" src="${receipt.cropDataUri}" alt="Sanitized crop of the marked region for receipt ${number}" />

      <h3>${escapeHtml(receipt.text)}</h3>
      <p class="category">${escapeHtml(receipt.category)}</p>

      <dl class="facts">
        <div><dt>Pair</dt><dd>${escapeHtml(receipt.pairLabel)}</dd></div>
        <div><dt>Region</dt><dd>${escapeHtml(formatRegion(receipt.region))}</dd></div>
        <div><dt>Collector</dt><dd>${escapeHtml(receipt.collector.displayName)}</dd></div>
        <div><dt>Reviewer</dt><dd>${escapeHtml(receipt.reviewer.displayName)}</dd></div>
        <div><dt>Decided</dt><dd>${escapeHtml(formatTimestamp(receipt.decidedAt))}</dd></div>
        <div><dt>Comparability</dt><dd>${escapeHtml(
          receipt.comparability.state === "partial"
            ? "Partially comparable"
            : "Comparable",
        )}${
          receipt.comparability.reason
            ? ` — ${escapeHtml(receipt.comparability.reason)}`
            : ""
        }</dd></div>
        <div><dt>Decision note</dt><dd>${
          receipt.decisionNote
            ? escapeHtml(receipt.decisionNote)
            : "<span class=\"muted\">None</span>"
        }</dd></div>
        <div><dt>Resolution</dt><dd>${receipt.checks.resolution[0]} × ${receipt.checks.resolution[1]}</dd></div>
      </dl>

      <div class="checks">
        <p class="kicker">Sanitized source</p>
        <p class="hash">sha256 ${escapeHtml(receipt.source.sha256)}</p>
        <p class="hash">original sha256 ${escapeHtml(receipt.source.originalSha256)} <span class="muted">(upload discarded, never retained)</span></p>
        <p class="hash">dhash ${escapeHtml(receipt.checks.dhash)} · blur ${Math.round(receipt.checks.blurScore)} · clipped ${(receipt.checks.exposureClipped * 100).toFixed(1)}%</p>
      </div>

      ${suggestion}
    </article>
  `;
}

function renderAuditEntry(entry: AuditEntry): string {
  const details = JSON.stringify(entry.payload);
  return `<tr>
    <td class="mono">${escapeHtml(formatTimestamp(entry.createdAt))}</td>
    <td class="mono">${escapeHtml(entry.type)}</td>
    <td>${escapeHtml(entry.actorName ?? "system")}</td>
    <td class="mono details">${escapeHtml(details)}</td>
  </tr>`;
}

export function renderExportHtml(bundle: ExportBundle): string {
  const { cleanup } = bundle;
  const title = `ShoreProof record — ${cleanup.site}`;
  const claimWord = bundle.claims.length === 1 ? "claim" : "claims";

  const receipts = bundle.claims
    .map((receipt, index) => renderReceipt(receipt, index))
    .join("\n");

  const excluded =
    bundle.excluded.length > 0
      ? `<section class="appendix">
          <p class="kicker">Appendix · excluded claims</p>
          <h2>Claims that are not evidence</h2>
          <p class="muted">These claims were rejected, sent back for more evidence, or superseded by a later revision. They are listed for a complete audit trail and are not part of the confirmed record.</p>
          <table>
            <thead>
              <tr><th>Status</th><th>Pair</th><th>Observation</th><th>Reviewer</th><th>Reason</th></tr>
            </thead>
            <tbody>
              ${bundle.excluded
                .map(
                  (claim) => `<tr>
                    <td class="mono">${escapeHtml(claim.status)}</td>
                    <td>${escapeHtml(claim.pairLabel)}</td>
                    <td>${escapeHtml(claim.text)}${claim.category ? `<br /><span class="muted">${escapeHtml(claim.category)}</span>` : ""}</td>
                    <td>${escapeHtml(claim.reviewerName ?? "—")}</td>
                    <td>${claim.note ? escapeHtml(claim.note) : "<span class=\"muted\">—</span>"}</td>
                  </tr>`,
                )
                .join("\n")}
            </tbody>
          </table>
        </section>`
      : "";

  const audit =
    bundle.audit.length > 0
      ? `<section class="appendix">
          <p class="kicker">Appendix · audit log</p>
          <h2>Every recorded action</h2>
          <p class="muted">Append-only events, oldest first. The log is internal to this export and never appears on a public page.</p>
          <table>
            <thead>
              <tr><th>Time (UTC)</th><th>Event</th><th>Actor</th><th>Details</th></tr>
            </thead>
            <tbody>
              ${bundle.audit.map(renderAuditEntry).join("\n")}
            </tbody>
          </table>
        </section>`
      : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --salt: #f3f5f1;
      --paper: #fbfcf9;
      --ink: #0e2433;
      --tide: #1c6b70;
      --flag: #e4572e;
      --flag-ink: #a63a1c;
      --line: #c6d1d2;
      --muted: #5a6a6d;
      --wash: #e6edeb;
    }
    * { box-sizing: border-box; }
    html { -webkit-text-size-adjust: 100%; }
    body {
      margin: 0;
      background: var(--salt);
      color: var(--ink);
      font: 15px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      text-rendering: optimizeLegibility;
    }
    .wrap { max-width: 940px; margin: 0 auto; padding: 44px 24px 96px; }
    .mono, .hash, .kicker {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
      font-size: 11px;
      letter-spacing: 0.06em;
    }
    .kicker {
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
    }
    .muted { color: var(--muted); }
    .wordmark {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      letter-spacing: 0.32em;
      text-transform: uppercase;
      color: var(--tide);
    }
    .cover { border-bottom: 3px solid var(--ink); padding-bottom: 28px; }
    .cover h1 {
      margin: 14px 0 6px;
      font-family: Georgia, "Times New Roman", serif;
      font-weight: 500;
      font-size: 44px;
      line-height: 1.05;
      letter-spacing: -0.01em;
    }
    .cover .meta { margin: 10px 0 0; color: var(--muted); font-size: 13px; }
    .cover-row { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 18px; }
    .stamp {
      display: inline-block;
      border: 2px solid var(--tide);
      color: var(--tide);
      padding: 6px 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 10px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      transform: rotate(-1.5deg);
    }
    .method { margin: 30px 0 8px; max-width: 720px; }
    .method h2 { font-family: Georgia, serif; font-weight: 500; font-size: 22px; margin: 0 0 8px; }
    .method p { margin: 0 0 10px; color: var(--muted); font-size: 14px; line-height: 1.6; }
    .receipt {
      position: relative;
      background: var(--paper);
      border: 1px solid var(--line);
      box-shadow: 0 1px 0 rgba(14, 36, 51, 0.06);
      padding: 22px;
      margin: 26px 0;
    }
    .receipt::after {
      content: "";
      position: absolute;
      left: 16px;
      right: 16px;
      bottom: 9px;
      border-bottom: 1px dashed var(--line);
    }
    .receipt-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
    .receipt .stamp { transform: rotate(-2deg); }
    .crop {
      display: block;
      width: 100%;
      max-width: 640px;
      margin: 16px 0 0;
      border: 1px solid var(--line);
      background: var(--ink);
    }
    .receipt h3 {
      margin: 16px 0 4px;
      font-family: Georgia, "Times New Roman", serif;
      font-weight: 500;
      font-size: 21px;
      line-height: 1.25;
    }
    .category {
      margin: 0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 10px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--tide);
    }
    .facts {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px 24px;
      margin: 18px 0 0;
      padding: 16px 0 0;
      border-top: 1px solid var(--line);
    }
    .facts dt {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 9px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .facts dd { margin: 3px 0 0; font-size: 13px; line-height: 1.45; }
    .checks {
      margin: 16px 0 0;
      padding: 12px 14px;
      background: var(--wash);
      border-left: 3px solid var(--tide);
    }
    .hash {
      margin: 5px 0 0;
      word-break: break-all;
      color: var(--ink);
      font-size: 10px;
      line-height: 1.5;
    }
    .provenance {
      margin: 16px 0 0;
      font-size: 12px;
      line-height: 1.55;
      color: var(--muted);
      border-top: 1px solid var(--line);
      padding-top: 12px;
    }
    .appendix { margin-top: 52px; border-top: 3px solid var(--ink); padding-top: 24px; }
    .appendix h2 { font-family: Georgia, serif; font-weight: 500; font-size: 26px; margin: 8px 0 6px; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 12px; }
    th, td { text-align: left; vertical-align: top; padding: 8px 10px; border-bottom: 1px solid var(--line); }
    th {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 9px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--muted);
      background: var(--wash);
    }
    td.details { max-width: 360px; word-break: break-all; font-size: 9px; }
    footer {
      margin-top: 56px;
      border-top: 1px solid var(--line);
      padding-top: 18px;
      color: var(--muted);
      font-size: 11px;
      line-height: 1.6;
    }
    @media print {
      body { background: #ffffff; }
      .wrap { max-width: none; padding: 0; }
      .receipt { break-inside: avoid; box-shadow: none; }
      .appendix { break-before: page; }
    }
    @media (max-width: 620px) {
      .facts { grid-template-columns: 1fr; }
      .cover h1 { font-size: 34px; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <header class="cover">
      <p class="wordmark">ShoreProof</p>
      <div class="cover-row">
        <div>
          <h1>${escapeHtml(cleanup.site)}</h1>
          <p class="meta">${escapeHtml(formatDate(cleanup.date))} · Lead ${escapeHtml(cleanup.leadName)}</p>
          <p class="meta">${bundle.claims.length} confirmed ${claimWord} · generated ${escapeHtml(formatTimestamp(bundle.generatedAt))} UTC</p>
        </div>
        <span class="stamp">Confirmed claims only</span>
      </div>
    </header>

    <section class="method">
      <h2>What this record is</h2>
      <p>Each claim below resolves to a marked region in a specific sanitized photo, a named human review decision, and a receipt. The browser detector only proposed candidate boxes; a person accepted or drew every region, wrote the observation, chose the category, and a person confirmed it. AI never set a verdict or a category on its own.</p>
      <p>Photos were sanitized at import: orientation normalized, re-encoded, EXIF and GPS stripped, and the uploaded original discarded. The crop in each receipt is cut from the sanitized bytes, and the two hashes name the stored image and the discarded original.</p>
      <p>Consent was attested by ${escapeHtml(cleanup.consentName)} on ${escapeHtml(formatTimestamp(cleanup.consentAttestedAt))} (policy ${escapeHtml(cleanup.consentVersion)}). ${cleanup.publicNote ? escapeHtml(cleanup.publicNote) : ""}</p>
      ${cleanup.conditions ? `<p><strong>Conditions (internal):</strong> ${escapeHtml(cleanup.conditions)}</p>` : ""}
    </section>

    ${receipts}

    ${excluded}

    ${audit}

    <section class="appendix">
      <p class="kicker">AI disclosure</p>
      <h2>What the model did and did not do</h2>
      <p class="muted">ShoreProof runs a pinned YOLO26n ONNX model in the browser to propose candidate boxes. It is a COCO-class detector, so it can miss litter and cannot name an ICC category. Every accepted box became a draft that a person had to describe and submit. Every confirmed claim was decided by a named reviewer, and the receipt records whether the accepted box was edited. The model file is fetched by a checksum-pinned script and is never bundled into the record.</p>
    </section>

    <footer>
      <p>Generated by ShoreProof from a local SQLite database · schema ${escapeHtml(bundle.schema)} · ${escapeHtml(bundle.cleanup.id)}</p>
      <p>Every confirmed claim is immutable. A correction creates a new revision; both versions stay in the audit log. This document contains no scripts and makes no network requests.</p>
    </footer>
  </div>
</body>
</html>`;
}
