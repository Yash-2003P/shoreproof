import Link from "next/link";
import { FieldLabel } from "@/components/site/field-label";
import { SitePageHeader } from "@/components/site/site-page-header";
import {
  CASE_STUDY_URL,
  SITE_GITHUB_URL,
  SITE_ISSUES_URL,
  SITE_LICENSE_URL,
} from "@/lib/site";

export const metadata = {
  title: "About",
  description:
    "Why ShoreProof exists, its real-data stance, the Bittu Tabahi / Ajnar River case study, the AGPL-3.0 license, and the YOLO26n model.",
};

export default function AboutPage() {
  return (
    <>
      <SitePageHeader
        kicker="About"
        title="Why this exists."
        lede="Cleanup photos are easy to take and hard to prove. ShoreProof is a small, honest record for the gap between a phone album and a sponsor report."
        meta="AGPL-3.0 · YOLO26n · local-first"
      />

      <section className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
        <div className="grid gap-8 border-y border-line py-7 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
          <div>
            <FieldLabel>The gap</FieldLabel>
            <h2 className="display-2 mt-3">A Saturday of work, a paragraph of proof.</h2>
          </div>
          <div className="space-y-4 text-sm leading-6 text-muted">
            <p>
              A cleanup lead finishes with a shared phone album, a spreadsheet
              of totals, and a paragraph for a report. Nobody can tell which
              after photo matches which before spot, whether the light changed,
              or who checked the claim.
            </p>
            <p>
              ShoreProof makes the unit of proof small enough to check: one
              marked region, one plain sentence, one named human decision, and a
              receipt that resolves to the stored bytes.
            </p>
            <p>
              It is built for a volunteer lead and a reviewer, not for a
              dashboard. The record should survive staff turnover and still be
              readable by a sponsor who was not there.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-5 py-14 sm:px-8 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div>
            <FieldLabel>Real data only</FieldLabel>
            <h2 className="display-2 mt-3">The app starts empty.</h2>
            <p className="mt-4 text-sm leading-6 text-muted">
              There is no seed command and no seeded record. A cleanup exists
              because a person created it from photos they attested they had the
              right to use, or because an organizer imported real photos with a
              consent attestation.
            </p>
            <p className="mt-3 text-sm leading-6 text-muted">
              The importer creates the cleanup, pairs, sanitized photos, checks,
              and framing signal. It creates zero claims. Marking, categorizing,
              comparing, and reviewing stay human work.
            </p>
          </div>

          <div className="border-l-[3px] border-tide bg-paper p-5 sm:p-6">
            <FieldLabel>The case study</FieldLabel>
            <h2 className="heading-2 mt-3">Bittu Tabahi and the Ajnar River.</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              The cleanup of the Ajnar River in Biaora, Madhya Pradesh is a real
              and inspiring cleanup. It is cited here as an external case study,
              not app data.
            </p>
            <p className="mt-3 text-sm leading-6 text-muted">
              ShoreProof does not download, clip, or re-host the video. The
              video shows identifiable people and is not a matched before/after
              still pair, so it cannot honestly show this product&apos;s
              evidence model.
            </p>
            <a
              href={CASE_STUDY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="link-underline mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-ink"
            >
              Read the case study at The Independent
            </a>
          </div>
        </div>
      </section>

      <section
        id="license"
        className="border-y border-line bg-paper"
      >
        <div className="mx-auto w-full max-w-[1200px] px-5 py-14 sm:px-8 sm:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
            <div>
              <FieldLabel>License and model</FieldLabel>
              <h2 className="display-2 mt-3">AGPL-3.0, and a pinned model.</h2>
              <p className="mt-4 text-sm leading-6 text-muted">
                The repository ships AGPL-3.0 because the YOLO26n ONNX weights
                are derived from AGPL-3.0 YOLO26. The model is fetched by a
                checksum-pinned script and is never committed.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={SITE_LICENSE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                >
                  Read the license
                </a>
                <a
                  href={SITE_GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                >
                  GitHub repository
                </a>
              </div>
            </div>

            <dl className="divide-y divide-line border-y border-line">
              <div className="grid gap-2 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
                <dt className="text-sm font-semibold text-ink">Model</dt>
                <dd className="text-sm leading-6 text-muted">
                  YOLO26n ONNX, 9,890,454 bytes, SHA-256 pinned. It runs in a
                  browser Web Worker with onnxruntime-web.
                </dd>
              </div>
              <div className="grid gap-2 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
                <dt className="text-sm font-semibold text-ink">Role</dt>
                <dd className="text-sm leading-6 text-muted">
                  Propose candidate boxes only. No auto-accept, no verdict, no
                  category authority. COCO classes only.
                </dd>
              </div>
              <div className="grid gap-2 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
                <dt className="text-sm font-semibold text-ink">Stack</dt>
                <dd className="text-sm leading-6 text-muted">
                  Next.js, React, TypeScript, SQLite via better-sqlite3, sharp,
                  Zod, Tailwind. One Node process, no separate model service, no
                  GPU.
                </dd>
              </div>
              <div className="grid gap-2 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
                <dt className="text-sm font-semibold text-ink">Built for</dt>
                <dd className="text-sm leading-6 text-muted">
                  Build With AI: Basics, October 2026. The public site and the
                  app are one codebase.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-5 py-14 sm:px-8 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
          <div>
            <FieldLabel>Boundaries</FieldLabel>
            <h2 className="display-2 mt-3">What it is not.</h2>
          </div>
          <ul className="space-y-3 text-sm leading-6 text-muted">
            <li className="border-t border-line pt-3">
              Not a compliance product, certification, or legal record.
            </li>
            <li className="border-t border-line pt-3">
              Not a litter detector. The model proposes COCO boxes; a person
              marks and decides.
            </li>
            <li className="border-t border-line pt-3">
              Not a social feed. There are no likes, rankings, or public
              profiles.
            </li>
            <li className="border-t border-line pt-3">
              Not a replacement for a second reviewer. Self-review is allowed,
              but it is disclosed.
            </li>
          </ul>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link href="/cleanups" className="btn btn-primary">
            Open the app
          </Link>
          <a
            href={SITE_ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
          >
            Open an issue
          </a>
        </div>
      </section>
    </>
  );
}
