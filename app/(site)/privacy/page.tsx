import Link from "next/link";
import { FieldLabel } from "@/components/site/field-label";
import { SitePageHeader } from "@/components/site/site-page-header";
import { SITE_ISSUES_URL } from "@/lib/site";

export const metadata = {
  title: "Privacy",
  description:
    "What ShoreProof collects, what it strips, who sees what, how the public page works, retention, deletion, and the limits of the proof of concept.",
};

const PHOTO_STEPS = [
  "The image is decoded and its EXIF orientation is applied.",
  "It is re-encoded as a JPEG. The original upload bytes are not written to disk.",
  "EXIF, GPS, device, and timestamp metadata are stripped, then checked again on the stored file.",
  "Two hashes are computed: original_sha256 for the upload, sha256 for the sanitized bytes.",
  "A thumbnail is generated. Only the sanitized image and thumbnail are served; there is no original route.",
];

export default function PrivacyPage() {
  return (
    <>
      <SitePageHeader
        kicker="Privacy"
        title="The privacy baseline, in plain language."
        lede="ShoreProof is designed for photos of real places and real people. The safe default is to collect little, strip metadata before storage, and keep the public page off until someone explicitly publishes it."
        meta="Policy version 2026-10-24 · local-first · no analytics"
      />

      <section className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
        <div className="grid gap-8 border-y border-line py-7 lg:grid-cols-2 lg:gap-12">
          <div>
            <FieldLabel>What is collected</FieldLabel>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-muted">
              <li>Display name and role.</li>
              <li>
                Cleanup site label, date, internal conditions, and an optional
                public note.
              </li>
              <li>Sanitized photos and thumbnails.</li>
              <li>
                Claims, regions, observations, categories, comparability states,
                decisions, timestamps, and hashes.
              </li>
              <li>The append-only audit log.</li>
            </ul>
          </div>

          <div>
            <FieldLabel>What is not collected</FieldLabel>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-muted">
              <li>Email, phone number, postal address, or legal name.</li>
              <li>GPS coordinates or device metadata.</li>
              <li>Analytics identifiers or advertising data.</li>
              <li>Original upload bytes after the sanitized file is written.</li>
              <li>Third-party runtime scripts, fonts, or trackers.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-5 py-14 sm:px-8 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
          <div>
            <FieldLabel>What happens to a photo</FieldLabel>
            <h2 className="display-2 mt-3">Sanitize, hash, then store.</h2>
            <p className="lede mt-4">
              The pipeline runs before the photo is stored. The app records
              provenance without retaining the original bytes.
            </p>
          </div>

          <ol className="divide-y divide-line border-y border-line">
            {PHOTO_STEPS.map((step, index) => (
              <li
                key={step}
                className="grid grid-cols-[2.5rem_1fr] gap-3 py-4"
              >
                <span className="mono pt-0.5 text-xs text-tide">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="text-sm leading-6 text-muted">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-y border-line bg-paper">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-14 sm:px-8 sm:py-20">
          <FieldLabel>Who sees what</FieldLabel>
          <h2 className="display-2 mt-3">Three surfaces, three scopes.</h2>

          <div className="mt-8 overflow-x-auto border border-line bg-salt">
            <table className="w-full min-w-[680px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="field-label px-4 py-3 sm:px-5">
                    Data
                  </th>
                  <th scope="col" className="field-label px-4 py-3 sm:px-5">
                    Workspace
                  </th>
                  <th scope="col" className="field-label px-4 py-3 sm:px-5">
                    Export
                  </th>
                  <th scope="col" className="field-label px-4 py-3 sm:px-5">
                    Public page
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    "Display name and role",
                    "Yes",
                    "Yes",
                    "Confirmed claims only",
                  ],
                  [
                    "Site, date, public note",
                    "Yes",
                    "Yes",
                    "When published",
                  ],
                  ["Internal conditions", "Yes", "Yes", "No"],
                  [
                    "Sanitized photos",
                    "Yes",
                    "Crops",
                    "Confirmed crops only",
                  ],
                  [
                    "Claims and decisions",
                    "Yes",
                    "Confirmed + appendix",
                    "Confirmed only",
                  ],
                  ["Audit log", "Yes", "Yes", "No"],
                  ["Original upload bytes", "Never stored", "Never", "Never"],
                  ["GPS / EXIF", "Stripped", "Stripped", "Stripped"],
                ].map((row) => (
                  <tr
                    key={row[0]}
                    className="border-b border-line last:border-b-0"
                  >
                    {row.map((cell, index) => {
                      if (index === 0) {
                        return (
                          <th
                            key={`${row[0]}-${index}`}
                            scope="row"
                            className="px-4 py-3.5 text-left text-sm font-semibold leading-6 text-ink sm:px-5"
                          >
                            {cell}
                          </th>
                        );
                      }
                      return (
                        <td
                          key={`${row[0]}-${index}`}
                          className="px-4 py-3.5 text-sm leading-6 text-muted sm:px-5"
                        >
                          {cell}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-5 py-14 sm:px-8 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div>
            <FieldLabel>The public page</FieldLabel>
            <h2 className="heading-2 mt-3">Off until someone publishes.</h2>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-muted">
              <li>
                Publishing needs at least one confirmed claim and a clean
                privacy check.
              </li>
              <li>
                The URL uses a random slug. Publishing and unpublishing both
                rotate it, so an old link stops working.
              </li>
              <li>
                The page is <span className="mono text-xs">noindex</span> and
                shows confirmed claims only.
              </li>
              <li>
                It never shows internal conditions, the audit log, or the
                excluded-claims appendix.
              </li>
            </ul>
          </div>

          <div>
            <FieldLabel>Retention and deletion</FieldLabel>
            <h2 className="heading-2 mt-3">The operator owns the data.</h2>
            <p className="mt-4 text-sm leading-6 text-muted">
              Locally, the database and sanitized uploads live under{" "}
              <span className="mono text-xs">./data</span> until you remove them.
              The local wipe command prints what it removed:
            </p>
            <pre className="mono mt-3 overflow-x-auto border border-line bg-ink p-4 text-xs leading-6 text-salt">
              <code>npm run data:wipe -- --yes</code>
            </pre>
            <p className="mt-3 text-sm leading-6 text-muted">
              It removes the database and uploads, not the fetched model. A
              hosted operator controls the volume and retention. The app runs as
              one process with one SQLite volume; it is not built for
              horizontal scaling.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-14 sm:px-8">
          <FieldLabel>Limits</FieldLabel>
          <h2 className="heading-2 mt-3">What this proof of concept does not claim.</h2>
          <ul className="mt-5 grid gap-x-10 gap-y-2 sm:grid-cols-2">
            <li className="text-sm leading-6 text-muted">
              It is not anonymous. Display names appear on confirmed claims.
            </li>
            <li className="text-sm leading-6 text-muted">
              It does not auto-blur faces. A people-visible photo blocks the
              record instead.
            </li>
            <li className="text-sm leading-6 text-muted">
              It has no per-user passwords. A hosted workspace needs the
              workspace passphrase, which does not protect public pages.
            </li>
            <li className="text-sm leading-6 text-muted">
              It is not a compliance product. A hash proves stored bytes, not the
              truth of the scene.
            </li>
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/cleanups" className="btn btn-primary">
              Open the app
            </Link>
            <a
              href={SITE_ISSUES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost"
            >
              Ask a privacy question
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
