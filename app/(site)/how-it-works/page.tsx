import Link from "next/link";
import { FieldLabel } from "@/components/site/field-label";
import { SitePageHeader } from "@/components/site/site-page-header";
import { TideDivider } from "@/components/site/tide-divider";

export const metadata = {
  title: "How it works",
  description:
    "Capture, mark, compare, submit, review, and export. The six-step ShoreProof loop, the four review actions, revisions, and the comparability gate.",
};

const STEPS = [
  {
    number: "01",
    title: "Capture the before photo",
    you: "Upload a before photo of the spot. The uploader asks whether anyone is identifiable and runs the checks in the browser while the server repeats them on write.",
    record:
      "The sanitized JPEG, its stored hash, the original upload hash, dimensions, blur, exposure, dHash, and the people-visible flag.",
  },
  {
    number: "02",
    title: "Mark one observation",
    you: "Draw a rectangle on the before photo, write one plain sentence about what was removed and from where, and choose an ICC category. AI may propose boxes; accept, edit, or reject each one.",
    record:
      "The normalized region, the observation text, the human-set category, the collector, and the source suggestion if one was accepted.",
  },
  {
    number: "03",
    title: "Compare the same spot",
    you: "Add the after photo and drag the wipe. Read the framing signal as a hint, then set comparability yourself: comparable, partially comparable, or not comparable, with a reason for the last two.",
    record:
      "Both photo hashes, the framing score and its sub-scores, the named comparability state, the reason, and who set it.",
  },
  {
    number: "04",
    title: "Submit for review",
    you: "The pair needs both photos, a comparability state, and at least one complete claim. A claim missing a region, sentence, or category blocks submission.",
    record:
      "Pending claim rows, a submission event, and the deterministic queue flags that tell a reviewer what to look at first.",
  },
  {
    number: "05",
    title: "Review the claim",
    you: "A named reviewer confirms, edits and confirms, rejects, or sends it back as insufficient evidence. A decision always has an actor and a timestamp.",
    record:
      "The decision, the reviewer, the timestamp, the note, and an append-only event. Confirmed claims become immutable.",
  },
  {
    number: "06",
    title: "Export or publish",
    you: "Download the evidence pack as HTML or JSON. Publishing is a separate action, off by default, and needs at least one confirmed claim and a clean privacy check.",
    record:
      "Receipts for confirmed claims, an excluded-claims appendix, the audit log, and a public slug that rotates on every publish or unpublish.",
  },
];

const DECISIONS = [
  {
    label: "Confirm",
    tone: "border-tide",
    body: "The claim is accurate and the evidence is sufficient. The row locks and can appear in the export and the public page.",
  },
  {
    label: "Edit and confirm",
    tone: "border-tide",
    body: "Fix the observation or category first, then confirm. The edit is stored as a revision with the reviewer named.",
  },
  {
    label: "Reject",
    tone: "border-ink",
    body: "The claim is wrong, duplicated, or not supported. It stays in the audit log and the export appendix, never on the public page.",
  },
  {
    label: "Insufficient evidence",
    tone: "border-flag",
    body: "The claim might be true, but the photos do not prove it. This is a return, not a rejection: the collector owes another photo or a revision.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <SitePageHeader
        kicker="The loop"
        title="Capture, mark, compare, submit. Then review and export."
        lede="The pair workspace is one page on purpose. Marking a region needs the photo, the claim, and the checks in view at once. The stepper shows progress; it is not a wizard."
        meta="Six moves · four review actions · two hard gates"
      />

      <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
        <ol className="border-y border-line">
          {STEPS.map((step) => (
            <li
              key={step.number}
              className="grid gap-4 border-b border-line py-7 last:border-b-0 lg:grid-cols-[4rem_1fr_1fr] lg:gap-8"
            >
              <span className="mono pt-1 text-xs text-tide">{step.number}</span>
              <div>
                <h2 className="heading-2">{step.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{step.you}</p>
              </div>
              <div className="lg:border-l lg:border-line lg:pl-6">
                <p className="field-label">What the record keeps</p>
                <p className="mt-1.5 text-sm leading-6 text-muted">
                  {step.record}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <section className="mx-auto w-full max-w-[1200px] px-5 py-14 sm:px-8 sm:py-20">
        <FieldLabel>Review actions</FieldLabel>
        <h2 className="display-2 mt-3">Four ways to decide. None of them is automatic.</h2>
        <p className="lede mt-4">
          The reviewer&apos;s display name, timestamp, and note travel with the
          decision. A second decision on the same row is refused.
        </p>

        <div className="mt-8 grid gap-0 sm:grid-cols-2">
          {DECISIONS.map((decision) => (
            <div
              key={decision.label}
              className={`border-t-2 ${decision.tone} border-x border-b border-line bg-paper p-5 sm:p-6`}
            >
              <h3 className="heading-3">{decision.label}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                {decision.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <TideDivider />

      <section className="mx-auto w-full max-w-[1200px] px-5 py-14 sm:px-8 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
          <div className="border-l-[3px] border-flag bg-paper p-6 sm:p-7">
            <FieldLabel>The comparability gate</FieldLabel>
            <h2 className="heading-2 mt-3">Not comparable blocks confirmation.</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              A removal claim needs the same spot. If the tide, camera position,
              or framing changed enough that the pair cannot be read as
              before/after, the reviewer cannot confirm the claim. The collector
              can replace a photo or the pair can be re-shot.
            </p>
            <p className="mono mt-4 text-xs leading-5 text-muted">
              The framing signal is a hint. The human state is the gate.
            </p>
          </div>

          <div className="border-l-[3px] border-flag bg-paper p-6 sm:p-7">
            <FieldLabel>The privacy gate</FieldLabel>
            <h2 className="heading-2 mt-3">People-visible blocks three actions.</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              A photo flagged as showing an identifiable person cannot support a
              confirmed claim, enter an export, or appear on a public page. The
              remedy is a replacement photo, not a disclaimer. The POC does not
              auto-blur.
            </p>
            <p className="mono mt-4 text-xs leading-5 text-muted">
              Confirm · export · publish — all blocked server-side.
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-line pt-6">
          <FieldLabel>Revisions</FieldLabel>
          <h2 className="heading-2 mt-3">Confirmed claims do not get rewritten.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            A correction creates a new draft revision that points at the old
            row. The old claim stays visible until the revision is confirmed,
            then becomes superseded. The audit log keeps both decisions, so the
            record shows what changed and who changed it.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/evidence" className="btn btn-primary">
            See what a receipt proves
          </Link>
          <Link href="/for-reviewers" className="btn btn-ghost">
            Read the reviewer guide
          </Link>
        </div>
      </section>
    </>
  );
}
