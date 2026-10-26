import Link from "next/link";
import { FieldLabel } from "@/components/site/field-label";
import { SitePageHeader } from "@/components/site/site-page-header";
import {
  FLAG_LABELS,
  FLAG_ORDER,
  type QueueFlagCode,
} from "@/lib/queue";

export const metadata = {
  title: "For reviewers",
  description:
    "How the ShoreProof review queue orders risk, what each flag means, the four decisions, self-review disclosure, and revisions.",
};

const FLAG_BODY: Record<QueueFlagCode, string> = {
  no_region:
    "The claim has no marked area. It cannot be confirmed until the collector marks the source photo.",
  not_comparable:
    "The pair is marked not comparable. Confirmation is blocked server-side.",
  people_visible:
    "A photo is flagged people-visible. Confirmation, export, and publishing are blocked until it is replaced.",
  near_duplicate:
    "The photo resembles another current photo in the cleanup. Check that this is the intended source.",
  absolute_wording:
    "The observation uses words like entire, all, none, every, completely, fully, or clean. Read it against the crop.",
  low_resolution:
    "The long edge is below 1,280 px. The crop may not be readable enough to support the claim.",
  self_reviewed:
    "The same person collected and reviewed the claim. Self-review is allowed and disclosed.",
  ai_box_unedited:
    "An AI suggestion was accepted without editing the box. Check that it lands on the object.",
};

const DECISIONS = [
  {
    label: "Confirm",
    tone: "border-tide",
    body: "The claim is accurate and the evidence is sufficient. The row locks and the receipt can enter an export.",
  },
  {
    label: "Edit and confirm",
    tone: "border-tide",
    body: "Fix the observation or category, then confirm. The edit is stored as a revision with your name on it.",
  },
  {
    label: "Reject",
    tone: "border-ink",
    body: "The claim is wrong, duplicated, or unsupported. It stays in the audit log and the export appendix, never on the public page.",
  },
  {
    label: "Insufficient evidence",
    tone: "border-flag",
    body: "The claim might be true, but the photos do not prove it. Return it with a note; the collector owes a better photo or a revision.",
  },
];

export default function ForReviewersPage() {
  return (
    <>
      <SitePageHeader
        kicker="For reviewers"
        title="Your display name is the authority layer."
        lede="The queue is deterministic and readable. It puts the riskiest claim first, shows the before and after crops with the region outlined, and gives you four decisions. Nothing is confirmed by a model."
        meta="Eight queue flags · four decisions · revisions · self-review disclosure"
      />

      <section className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
        <div className="grid gap-8 border-y border-line py-7 lg:grid-cols-[0.72fr_1.28fr] lg:gap-12">
          <div>
            <FieldLabel>The queue</FieldLabel>
            <h2 className="display-2 mt-3">Riskiest first, then oldest.</h2>
            <p className="mt-4 text-sm leading-6 text-muted">
              Flags are text for a person to read, not a score. A claim with no
              flag sits below every flagged claim. Ties break by creation time,
              so an old ambiguous claim does not get buried.
            </p>
            <p className="mono mt-5 border-l-2 border-line pl-3 text-xs leading-5 text-muted">
              A flag never decides. It tells you where to look.
            </p>
          </div>

          <ol className="divide-y divide-line border-y border-line lg:border-t-0">
            {FLAG_ORDER.map((code, index) => (
              <li
                key={code}
                className="grid grid-cols-[2rem_1fr] gap-3 py-3.5"
              >
                <span className="mono pt-0.5 text-xs text-tide">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink first-letter:uppercase">
                    {FLAG_LABELS[code]}
                  </p>
                  <p className="mt-0.5 text-sm leading-6 text-muted">
                    {FLAG_BODY[code]}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-5 py-14 sm:px-8 sm:py-20">
        <FieldLabel>The decision</FieldLabel>
        <h2 className="display-2 mt-3">Four actions, each with a name.</h2>
        <p className="lede mt-4">
          A decision always has an actor, a timestamp, and an append-only event.
          A second decision on the same row is refused.
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

      <section className="border-y border-line bg-paper">
        <div className="mx-auto grid w-full max-w-[1200px] gap-8 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-2 lg:gap-12">
          <div>
            <FieldLabel>Self-review</FieldLabel>
            <h2 className="heading-2 mt-3">Allowed, disclosed, not hidden.</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              A small volunteer team cannot always staff two people. A solo
              organizer can be both collector and reviewer, but the queue marks
              the claim as self-reviewed and the receipt names the same person
              twice. A second reviewer is better when one is available.
            </p>
          </div>

          <div>
            <FieldLabel>Revisions</FieldLabel>
            <h2 className="heading-2 mt-3">The old row stays visible.</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              A confirmed claim is immutable. Revising it creates a new draft
              that points at the old row. The old claim remains visible until
              the revision is confirmed, then becomes superseded. Both decisions
              stay in the audit log.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-5 py-14 sm:px-8 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
          <div>
            <FieldLabel>The empty queue</FieldLabel>
            <h2 className="display-2 mt-3">Nothing waiting is a valid state.</h2>
            <p className="lede mt-4">
              The queue shows pending and returned claims, not a backlog to
              clear for its own sake. When it is empty, the next useful action
              is usually back in the record: add a pair, complete a draft, or
              fix a returned claim.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/review" className="btn btn-primary">
                Open the review queue
              </Link>
              <Link href="/evidence" className="btn btn-ghost">
                See what a receipt proves
              </Link>
            </div>
          </div>

          <div className="border border-line bg-paper p-5 sm:p-6">
            <p className="kicker">A reviewer&apos;s checklist</p>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-muted">
              <li className="border-t border-line pt-3">
                Does the region land on the object in the before photo?
              </li>
              <li className="border-t border-line pt-3">
                Does the observation describe what is in that region, without
                claiming more than the crop shows?
              </li>
              <li className="border-t border-line pt-3">
                Is the after photo the same spot, and is the comparability state
                honest?
              </li>
              <li className="border-t border-line pt-3">
                Is there a privacy or evidence blocker that makes confirmation
                the wrong action?
              </li>
              <li className="border-t border-line pt-3">
                If the claim is close but not proved, would a return be more
                honest than a rejection?
              </li>
            </ol>
          </div>
        </div>
      </section>
    </>
  );
}
