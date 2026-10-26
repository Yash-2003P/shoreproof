const CHAIN = [
  {
    number: "01",
    title: "Source",
    body: "The hash resolves to the sanitized JPEG the server stores and serves. The original upload was discarded.",
  },
  {
    number: "02",
    title: "Region",
    body: "Normalized to the photo, not the screen. The crop survives any display size.",
  },
  {
    number: "03",
    title: "Decision",
    body: "A display name, a timestamp, and a reason. A named person accepted responsibility.",
  },
  {
    number: "04",
    title: "Receipt",
    body: "The fields travel together into the export and, only after publishing, the public page.",
  },
];

export function ReceiptAnatomy({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`grid gap-6 ${
        compact ? "" : "lg:grid-cols-[minmax(0,1fr)_250px] lg:gap-8"
      }`}
    >
      <article
        className="receipt p-5 sm:p-7"
        aria-label="Receipt anatomy example, not a real record"
      >
        <span className="receipt-hole" aria-hidden="true" />
        <header className="flex flex-wrap items-center justify-between gap-3 pr-8">
          <p className="text-xs font-medium text-muted">
            Receipt 00 · anatomy example
          </p>
          <span className="stamp stamp-flag">Example</span>
        </header>

        <h3 className="mt-4 font-serif text-2xl leading-snug text-ink">
          One observation, one region, one named decision.
        </h3>
        <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-tide">
          Beverage Bottles (Plastic)
        </p>

        <dl className="mt-5 grid gap-x-6 gap-y-4 border-t border-line pt-5 sm:grid-cols-2">
          <div>
            <dt className="field-label">Pair</dt>
            <dd className="mt-1 text-sm leading-6">North jetty · rock line</dd>
          </div>
          <div>
            <dt className="field-label">Region</dt>
            <dd className="mono mt-1 text-xs leading-5">
              x 18% · y 31% · w 24% · h 22%
            </dd>
          </div>
          <div>
            <dt className="field-label">Collector</dt>
            <dd className="mt-1 text-sm leading-6">Maya C.</dd>
          </div>
          <div>
            <dt className="field-label">Reviewer</dt>
            <dd className="mt-1 text-sm leading-6">Ravi S.</dd>
          </div>
          <div>
            <dt className="field-label">Decided</dt>
            <dd className="mt-1 text-sm leading-6">Oct 24, 2026 · 14:08 UTC</dd>
          </div>
          <div>
            <dt className="field-label">Comparability</dt>
            <dd className="mt-1 text-sm leading-6">
              Partially comparable — tide line shifted
            </dd>
          </div>
        </dl>

        <div className="mt-5 border-l-[3px] border-tide bg-wash px-4 py-4">
          <p className="field-label">Sanitized source</p>
          <p className="mono mt-1.5 break-all text-xs leading-5 text-ink">
            sha256 9f2a7c…redacted
          </p>
          <p className="mono mt-1.5 break-all text-xs leading-5 text-muted">
            original sha256 41c8d0…discarded, never retained
          </p>
          <p className="mono mt-1.5 break-all text-xs leading-5 text-muted">
            dhash 8b1e4c2a… · blur 412 · clipped 3.1% · 1600 × 900
          </p>
        </div>

        <div className="mt-5 border-t border-line pt-4">
          <p className="text-sm leading-6 text-muted">
            YOLO26n proposed{" "}
            <strong className="font-medium text-ink">bottle</strong> at 0.62. A
            human accepted the box and edited it. The category was chosen by
            hand.
          </p>
        </div>

        <p className="mt-4 text-xs leading-5 text-muted">
          Anatomy only. This is not a cleanup record, and the values are
          redacted. Every field is generated from stored bytes and a decision,
          not typed into a template.
        </p>
      </article>

      {compact ? null : (
        <aside className="border-t border-line pt-5 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-1">
          <p className="kicker">Read it as a chain</p>
          <ol className="mt-4 space-y-4">
            {CHAIN.map((item) => (
              <li key={item.number} className="grid grid-cols-[2rem_1fr] gap-2">
                <span className="mono text-xs text-tide">{item.number}</span>
                <div>
                  <p className="text-sm font-semibold text-ink">{item.title}</p>
                  <p className="mt-0.5 text-sm leading-6 text-muted">
                    {item.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-5 border-t border-line pt-4 text-xs leading-5 text-muted">
            What is not here: an AI verdict, a cleanup total, or a quality
            score.
          </p>
        </aside>
      )}
    </div>
  );
}
