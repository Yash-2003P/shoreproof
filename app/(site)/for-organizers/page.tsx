import Link from "next/link";
import { FieldLabel } from "@/components/site/field-label";
import { SitePageHeader } from "@/components/site/site-page-header";
import { SITE_GITHUB_URL } from "@/lib/site";

export const metadata = {
  title: "For organizers",
  description:
    "Run a cleanup, import real photos from a manifest, export sponsor-ready evidence receipts, and keep the public page private until you publish.",
};

const PACK = [
  "One receipt per confirmed claim: crop, sanitized source hash, region, collector, reviewer, timestamp, checks, comparability, and AI provenance.",
  "An excluded-claims appendix for rejected and insufficient claims, with the reviewer's reason.",
  "The append-only audit log, so the record shows who did what and when.",
  "A JSON download with both hashes for anyone who wants to check the bytes.",
  "A public page that is off by default and shows confirmed claims only.",
];

const CONTROLS = [
  {
    title: "Consent is a gate.",
    body: "A cleanup cannot be created or imported without an attestation from a named person. The actor, timestamp, and policy version are stored.",
  },
  {
    title: "Photos are sanitized first.",
    body: "EXIF, GPS, device, and timestamp metadata are stripped before storage. The original upload is discarded; only its hash remains.",
  },
  {
    title: "People-visible blocks the record.",
    body: "A flagged photo cannot support a confirmed claim, enter an export, or appear on a public page. Replace the photo or send the claim back.",
  },
  {
    title: "Publishing is separate.",
    body: "The public page needs at least one confirmed claim and a clean privacy check. Unpublishing rotates the slug, so the old link dies.",
  },
];

export default function ForOrganizersPage() {
  return (
    <>
      <SitePageHeader
        kicker="For organizers"
        title="A sponsor-ready record without invented totals."
        lede="ShoreProof is built for the person who has to show what was removed, where, and who checked it. It produces receipts for individual claims, not a dashboard of unverifiable numbers."
        meta="First-party capture · manifest import · evidence pack · privacy controls"
      />

      <section className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
        <div className="grid gap-0 border-y border-line lg:grid-cols-2">
          <div className="border-b border-line py-7 lg:border-b-0 lg:border-r lg:pr-8">
            <FieldLabel index="01">First-party capture</FieldLabel>
            <h2 className="heading-2 mt-3">Take the pair yourself.</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Photograph the spot before the cleanup. Clean it. Photograph the
              same spot from the same position. Upload both through the pair
              workspace, mark each claim, and set comparability. This is the
              default path.
            </p>
            <p className="mt-3 text-sm leading-6 text-muted">
              The workspace keeps the photo, the claim, and the checks in view
              at once. The stepper shows progress; it is not a wizard.
            </p>
          </div>

          <div className="min-w-0 py-7 lg:pl-8">
            <FieldLabel index="02">Manifest import</FieldLabel>
            <h2 className="heading-2 mt-3">Bring photos that already exist.</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Write a manifest next to a folder of real photos and run the
              importer. It creates the cleanup, pairs, sanitized photos, checks,
              and framing signal. It creates zero claims.
            </p>
            <pre className="mono mt-4 w-full max-w-full overflow-x-auto border border-line bg-ink p-4 text-xs leading-6 text-salt">
              <code>{`npm run import -- --dry-run \\
  ./imports/north-jetty/manifest.json
npm run import -- \\
  ./imports/north-jetty/manifest.json`}</code>
            </pre>
            <p className="mt-3 text-sm leading-6 text-muted">
              Unknown keys are rejected at every level, so a manifest cannot
              smuggle in claims or review decisions. Photo paths must stay
              inside the manifest folder; absolute paths, parent escapes, and
              symlinks are refused. Re-running the same manifest writes nothing.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-5 py-14 sm:px-8 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
          <div>
            <FieldLabel>The pack</FieldLabel>
            <h2 className="display-2 mt-3">What a sponsor can check.</h2>
            <p className="lede mt-4">
              The export is a self-contained HTML file and a JSON file. It opens
              offline. It is for the organizer and the sponsor, not the public
              page.
            </p>
            <Link
              href={`${SITE_GITHUB_URL}/blob/main/docs/import-manifest.example.json`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost mt-6"
            >
              See the manifest schema
            </Link>
          </div>

          <ul className="divide-y divide-line border-y border-line">
            {PACK.map((item) => (
              <li key={item} className="flex gap-3 py-4 text-sm leading-6 text-muted">
                <span aria-hidden="true" className="mono text-tide">
                  —
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-y border-line bg-paper">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-14 sm:px-8 sm:py-20">
          <FieldLabel>Privacy controls</FieldLabel>
          <h2 className="display-2 mt-3">The record is sensitive by default.</h2>
          <div className="mt-8 grid gap-0 sm:grid-cols-2">
            {CONTROLS.map((control) => (
              <div
                key={control.title}
                className="border-t border-line py-5 sm:odd:pr-8 sm:even:border-l sm:even:pl-8"
              >
                <h3 className="heading-3">{control.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {control.body}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm leading-6 text-muted">
            A hosted workspace should set the optional workspace passphrase. The
            local data wipe removes the database and sanitized uploads; the
            model file stays.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-5 py-14 sm:px-8 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
          <div>
            <FieldLabel>Boundaries</FieldLabel>
            <h2 className="display-2 mt-3">What it refuses to do.</h2>
            <p className="lede mt-4">
              These are product decisions, not missing features. Each one would
              make the record easier to fake.
            </p>
          </div>
          <ul className="space-y-3 text-sm leading-6 text-muted">
            <li className="border-t border-line pt-3">
              No AI-generated cleanup totals, category counts, or impact
              estimates.
            </li>
            <li className="border-t border-line pt-3">
              No third-party social video ingestion. A cited case study stays a
              link.
            </li>
            <li className="border-t border-line pt-3">
              No automatic face blur. A people-visible photo is blocked, not
              redacted.
            </li>
            <li className="border-t border-line pt-3">
              No per-user passwords in the POC. A hosted workspace needs the
              workspace passphrase.
            </li>
            <li className="border-t border-line pt-3">
              No delete button inside the app. The audit trail is the product;
              the operator can wipe the whole data directory.
            </li>
          </ul>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/cleanups" className="btn btn-primary">
            Open the app
          </Link>
          <Link href="/for-reviewers" className="btn btn-ghost">
            Read the reviewer guide
          </Link>
        </div>
      </section>
    </>
  );
}
