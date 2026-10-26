import Link from "next/link";
import { FieldLabel } from "@/components/site/field-label";
import { ReceiptAnatomy } from "@/components/site/receipt-anatomy";
import { SurveyGrid } from "@/components/site/survey-grid";
import { TideDivider } from "@/components/site/tide-divider";

export const metadata = {
  title: "Cleanup evidence you can check",
  description:
    "ShoreProof binds every exported cleanup claim to a marked region in a specific photo and a named human review decision.",
};

const KERNEL = [
  {
    number: "01",
    title: "A region in a specific photo",
    body: "A normalized rectangle on the before photo, not a caption floating above an album. The crop and the coordinates travel with the claim.",
  },
  {
    number: "02",
    title: "A named human decision",
    body: "A reviewer confirms, edits and confirms, rejects, or sends it back as insufficient evidence. The model never signs.",
  },
  {
    number: "03",
    title: "A receipt that resolves to bytes",
    body: "Sanitized hash, original hash, region, reviewer, timestamp, checks, comparability, and AI provenance in one record.",
  },
];

const LOOP = [
  {
    number: "01",
    title: "Capture",
    body: "Upload the before photo. The server strips metadata, re-encodes, hashes, and runs the checks before anything is stored.",
  },
  {
    number: "02",
    title: "Mark",
    body: "Draw the region, write one sentence, choose the ICC category. AI may propose boxes; a person accepts or rejects each one.",
  },
  {
    number: "03",
    title: "Compare",
    body: "Add the after photo and drag the wipe. The framing signal is a hint; a human sets comparability and gives a reason.",
  },
  {
    number: "04",
    title: "Submit",
    body: "A claim missing a region, sentence, or category blocks submission. Complete claims enter the review queue with deterministic flags.",
  },
  {
    number: "05",
    title: "Review",
    body: "A named reviewer confirms, edits and confirms, rejects, or sends back as insufficient evidence. Confirmed claims lock.",
  },
  {
    number: "06",
    title: "Export",
    body: "The pack contains confirmed claims with receipts and an excluded-claims appendix. Publishing is a separate, off-by-default action.",
  },
];

export default function HomePage() {
  return (
    <>
      <SurveyGrid className="border-b border-line">
        <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:items-start lg:gap-14">
          <div className="max-w-xl">
            <FieldLabel>Cleanup evidence · local-first</FieldLabel>
            <h1 className="display-1 mt-4">
              A cleanup record you can check, claim by claim.
            </h1>
            <p className="lede mt-5">
              ShoreProof binds every exported observation to a marked region in
              a specific before photo and a named human decision. The receipt
              carries the stored hash, the reviewer, and the checks, so a
              sponsor can resolve the claim back to bytes and time.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/cleanups" className="btn btn-primary">
                Open the app
              </Link>
              <Link href="/evidence" className="btn btn-ghost">
                See the evidence model
              </Link>
            </div>
            <p className="mt-7 max-w-md border-l-2 border-line pl-4 text-sm leading-6 text-muted">
              The workspace starts empty. No seeded record, no seeded totals,
              and no stock cleanup photo presented as proof.
            </p>
          </div>

          <div className="lg:pt-2">
            <ReceiptAnatomy compact />
          </div>
        </div>
      </SurveyGrid>

      <TideDivider animate />

      <section className="mx-auto w-full max-w-[1200px] px-5 py-14 sm:px-8 sm:py-20">
        <div className="grid gap-9 lg:grid-cols-[0.78fr_1.22fr] lg:gap-14">
          <div>
            <FieldLabel>The kernel</FieldLabel>
            <h2 className="display-2 mt-3">Three things bind a claim.</h2>
            <p className="lede mt-4">
              Remove one and this is another cleanup log with better photos.
              The binding is the product.
            </p>
          </div>

          <div className="grid gap-0 sm:grid-cols-3">
            {KERNEL.map((item) => (
              <div
                key={item.number}
                className="border-t border-ink pt-4 sm:border-l sm:border-t-0 sm:border-line sm:pl-5 sm:first:border-l-0 sm:first:pl-0"
              >
                <p className="mono text-xs text-tide">{item.number}</p>
                <h3 className="heading-3 mt-2">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-paper">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-14 sm:px-8 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-6">
            <div>
              <FieldLabel>The loop</FieldLabel>
              <h2 className="display-2 mt-3">One page, six moves.</h2>
              <p className="lede mt-4">
                The pair workspace keeps the photo and the claim in view. The
                stepper is progress, not a wizard.
              </p>
            </div>
            <Link href="/how-it-works" className="btn btn-ghost">
              Read the full loop
            </Link>
          </div>

          <ol className="grid gap-x-8 gap-y-0 sm:grid-cols-2 lg:grid-cols-3">
            {LOOP.map((step) => (
              <li
                key={step.number}
                className="grid grid-cols-[2.5rem_1fr] gap-3 border-b border-line py-5"
              >
                <span className="mono pt-0.5 text-xs text-tide">
                  {step.number}
                </span>
                <div>
                  <h3 className="heading-3">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-muted">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-5 py-14 sm:px-8 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
          <div className="border border-line bg-paper p-6 sm:p-8">
            <FieldLabel>The model proposes</FieldLabel>
            <h2 className="display-2 mt-3">YOLO26n, in a browser worker.</h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-muted">
              <li className="border-t border-line pt-3">
                It runs on the workspace machine. The photo is not sent to a
                model API.
              </li>
              <li className="border-t border-line pt-3">
                COCO classes only. It can miss litter; absence of a box is not
                evidence of absence.
              </li>
              <li className="border-t border-line pt-3">
                Confidence is shown next to the human action, never used as
                authority.
              </li>
            </ul>
          </div>

          <div className="border border-ink bg-ink p-6 text-salt sm:p-8">
            <p className="kicker text-salt/75">The human decides</p>
            <h2 className="display-2 mt-3 text-salt">No auto-accept.</h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-salt/85">
              <li className="border-t border-salt/20 pt-3">
                There is no accept-all button and no confidence threshold that
                bypasses a person.
              </li>
              <li className="border-t border-salt/20 pt-3">
                The category is human-set. AI may pre-select a tentative one and
                must show when the mapping is uncertain.
              </li>
              <li className="border-t border-salt/20 pt-3">
                A rejected suggestion creates no claim. A suggestion is never
                evidence.
              </li>
            </ul>
            <p className="mono mt-5 border-t border-salt/20 pt-4 text-xs leading-5 text-salt/75">
              YOLO26n · COCO classes only — absence of a box is not evidence of
              absence.
            </p>
          </div>
        </div>
      </section>

      <TideDivider />

      <section className="mx-auto w-full max-w-[1200px] px-5 py-14 sm:px-8 sm:py-20">
        <div className="grid gap-9 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
          <div>
            <FieldLabel>Privacy baseline</FieldLabel>
            <h2 className="display-2 mt-3">Private by default, not by policy.</h2>
            <p className="lede mt-4">
              The photo pipeline runs before storage, and the public page is a
              separate decision from saving a record.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/privacy" className="btn btn-ghost">
                Read the privacy baseline
              </Link>
              <Link href="/cleanups" className="btn btn-primary">
                Open the app
              </Link>
            </div>
          </div>

          <dl className="divide-y divide-line border-y border-line">
            <div className="grid gap-2 py-4 sm:grid-cols-[11rem_1fr] sm:gap-6">
              <dt className="text-sm font-semibold text-ink">
                Originals are discarded.
              </dt>
              <dd className="text-sm leading-6 text-muted">
                The server keeps a sanitized JPEG and two hashes: one for the
                upload, one for the stored file. There is no route to the
                original bytes.
              </dd>
            </div>
            <div className="grid gap-2 py-4 sm:grid-cols-[11rem_1fr] sm:gap-6">
              <dt className="text-sm font-semibold text-ink">
                Metadata is stripped first.
              </dt>
              <dd className="text-sm leading-6 text-muted">
                EXIF, GPS, device, and timestamp metadata are removed on write.
                The sanitized file is the only image stored and served.
              </dd>
            </div>
            <div className="grid gap-2 py-4 sm:grid-cols-[11rem_1fr] sm:gap-6">
              <dt className="text-sm font-semibold text-ink">
                People-visible blocks the record.
              </dt>
              <dd className="text-sm leading-6 text-muted">
                If anyone identifiable is flagged, confirmation, export, and
                publishing stay blocked until the photo is replaced. The POC
                does not auto-blur.
              </dd>
            </div>
            <div className="grid gap-2 py-4 sm:grid-cols-[11rem_1fr] sm:gap-6">
              <dt className="text-sm font-semibold text-ink">
                Public is off by default.
              </dt>
              <dd className="text-sm leading-6 text-muted">
                Publishing needs at least one confirmed claim and a clean
                privacy check. Unpublishing rotates the slug, so the old link
                stops working.
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-12 border-t border-line pt-6">
          <p className="mono text-xs leading-6 text-muted">
            Not a compliance product. Not a litter detector. Not a social feed.
          </p>
        </div>
      </section>
    </>
  );
}
