import Link from "next/link";
import { FieldLabel } from "@/components/site/field-label";
import { ReceiptAnatomy } from "@/components/site/receipt-anatomy";
import { SitePageHeader } from "@/components/site/site-page-header";

export const metadata = {
  title: "Evidence",
  description:
    "What a ShoreProof receipt proves, what it does not prove, and how confirmed, excluded, and AI-proposed claims differ.",
};

const FIELDS = [
  {
    field: "Sanitized source hash",
    proves: "The exact JPEG the server stores and serves.",
    not: "That the scene outside the crop is unchanged, or that the photo was not staged.",
  },
  {
    field: "Region",
    proves: "A normalized address inside that specific photo.",
    not: "That the object is litter, or that the observation is complete.",
  },
  {
    field: "Reviewer + timestamp",
    proves: "Who accepted responsibility for the claim, and when.",
    not: "Independent verification, unless a second person is named.",
  },
  {
    field: "Checks",
    proves:
      "Resolution, blur, exposure, dHash, and duplicate distance for the stored bytes.",
    not: "A quality grade or a truth score. These are heuristic numbers with thresholds.",
  },
  {
    field: "Comparability",
    proves: "The human state and reason for the pair.",
    not: "A geometric proof. The framing signal is not homography.",
  },
  {
    field: "AI provenance",
    proves:
      "Model name, model hash, COCO class, confidence, and whether a human edited the box.",
    not: "A count, a category decision, or a verdict.",
  },
];

const LIMITS = [
  "A hash proves the stored bytes, not the truth of the scene.",
  "The framing signal is an 8 × 8 luminance hint, not a homography.",
  "There is no GPS verification, automatic face blur, or per-user account.",
  "This is a proof of concept, not a compliance product or a certification.",
];

export default function EvidencePage() {
  return (
    <>
      <SitePageHeader
        kicker="Evidence"
        title="What a receipt proves — and what it does not."
        lede="A receipt is not a score. It is a chain of custody from a marked region to a stored hash and a named decision. The limits are part of the record."
        meta="Sanitized hash · region · reviewer · timestamp · checks · comparability · AI provenance"
      />

      <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
        <ReceiptAnatomy />
      </div>

      <section className="mx-auto w-full max-w-[1200px] px-5 py-14 sm:px-8 sm:py-20">
        <FieldLabel>Field guide</FieldLabel>
        <h2 className="display-2 mt-3">Every field has a job and a limit.</h2>
        <p className="lede mt-4">
          Read the right-hand column first. A receipt is useful because it does
          not pretend to prove more than it can.
        </p>

        <div className="mt-8 overflow-x-auto border border-line bg-paper">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="field-label px-4 py-3 sm:px-5">
                  Field
                </th>
                <th scope="col" className="field-label px-4 py-3 sm:px-5">
                  Resolves to
                </th>
                <th scope="col" className="field-label px-4 py-3 sm:px-5">
                  Does not prove
                </th>
              </tr>
            </thead>
            <tbody>
              {FIELDS.map((row) => (
                <tr key={row.field} className="border-b border-line last:border-b-0">
                  <th
                    scope="row"
                    className="px-4 py-4 align-top text-sm font-semibold text-ink sm:px-5"
                  >
                    {row.field}
                  </th>
                  <td className="px-4 py-4 align-top text-sm leading-6 text-muted sm:px-5">
                    {row.proves}
                  </td>
                  <td className="px-4 py-4 align-top text-sm leading-6 text-muted sm:px-5">
                    {row.not}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-y border-line bg-paper">
        <div className="mx-auto grid w-full max-w-[1200px] gap-8 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-2 lg:gap-12">
          <div>
            <FieldLabel>What confirmed means</FieldLabel>
            <h2 className="display-2 mt-3">A person signed, not a model.</h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-muted">
              <li className="border-t border-line pt-3">
                A reviewer with a display name decided the claim is accurate and
                the evidence is sufficient.
              </li>
              <li className="border-t border-line pt-3">
                The claim row locks. It can appear in the export and, if the
                record is published, on the public page.
              </li>
              <li className="border-t border-line pt-3">
                The decision is append-only. A correction creates a revision; it
                does not overwrite the old row.
              </li>
              <li className="border-t border-line pt-3">
                The receipt uses the sanitized hash, never the discarded
                original.
              </li>
            </ul>
          </div>

          <div>
            <FieldLabel>Excluded claims</FieldLabel>
            <h2 className="display-2 mt-3">The appendix is the honest part.</h2>
            <p className="mt-4 text-sm leading-6 text-muted">
              Rejected and insufficient claims stay in the record. The export
              includes them in an appendix so a sponsor can see what was
              excluded and why. The public page does not include them. A
              rejected claim never becomes a count or a finding.
            </p>
            <p className="mt-4 text-sm leading-6 text-muted">
              Zero confirmed claims is a valid export state. The pack says so
              plainly and lists what was excluded. Publishing stays blocked.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-5 py-14 sm:px-8 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
          <div>
            <FieldLabel>Detector limits</FieldLabel>
            <h2 className="display-2 mt-3">It proposes. It cannot see everything.</h2>
            <p className="lede mt-4">
              YOLO26n proposes boxes for 80 COCO classes. Only a small allowlist
              maps to an ICC category, and the UI marks a mapping as uncertain
              where it is. It is not a litter detector.
            </p>
            <p className="mono mt-5 border-l-2 border-flag pl-3 text-xs leading-5 text-muted">
              YOLO26n · COCO classes only — absence of a box is not evidence of
              absence.
            </p>
          </div>

          <ul className="divide-y divide-line border-y border-line">
            <li className="py-4 text-sm leading-6 text-muted">
              No auto-accept, no accept-all, and no confidence threshold that
              grants authority.
            </li>
            <li className="py-4 text-sm leading-6 text-muted">
              The model was not trained on this shoreline, these objects, or
              this camera angle.
            </li>
            <li className="py-4 text-sm leading-6 text-muted">
              The photo is not sent to a model API. Inference runs in a browser
              worker on the workspace machine.
            </li>
            <li className="py-4 text-sm leading-6 text-muted">
              The manual region path always works, even when the model file is
              missing.
            </li>
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1200px] border-t border-line px-5 py-12 sm:px-8">
        <FieldLabel>Limits</FieldLabel>
        <h2 className="heading-2 mt-3">Stated on purpose.</h2>
        <ul className="mt-5 grid gap-x-10 gap-y-2 sm:grid-cols-2">
          {LIMITS.map((limit) => (
            <li key={limit} className="flex gap-3 text-sm leading-6 text-muted">
              <span aria-hidden="true" className="mono text-tide">
                —
              </span>
              <span>{limit}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/privacy" className="btn btn-ghost">
            Read the privacy baseline
          </Link>
          <Link href="/cleanups" className="btn btn-primary">
            Open the app
          </Link>
        </div>
      </section>
    </>
  );
}
