import Link from "next/link";
import { redirect } from "next/navigation";
import { ClaimReview } from "@/components/claim-review";
import { Disclosure } from "@/components/disclosure";
import { PageHeader } from "@/components/page-header";
import { ReviewQueue, type QueueItemView } from "@/components/review-queue";
import {
  getClaimLineage,
  getReviewQueue,
  getReturnedClaims,
} from "@/lib/queue.server";
import { toClaimReviewData } from "@/lib/review-data";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Review",
};

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ claim?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/setup");
  }

  const { claim: requested } = await searchParams;
  const entries = getReviewQueue(user.id);
  const returned = getReturnedClaims();

  const selected =
    entries.find((entry) => entry.claim.id === requested) ?? entries[0] ?? null;

  const items: QueueItemView[] = entries.map((entry) => ({
    id: entry.claim.id,
    site: entry.claim.cleanup_site,
    pairLabel: entry.claim.pair_label,
    text: entry.claim.text,
    category: entry.claim.category,
    collectorName: entry.claim.collector_name,
    flags: entry.flags,
    priority: entry.priority,
  }));

  return (
    <div className="page page-wide">
      <PageHeader
        title="Review"
        description="The riskiest claims first. Flags are hints for your judgment, not verdicts — every decision records who made it and when."
        meta={
          <span>
            {entries.length} {entries.length === 1 ? "claim" : "claims"} waiting
            {returned.length > 0
              ? ` · ${returned.length} returned to collectors`
              : ""}
          </span>
        }
      />

      {returned.length > 0 ? (
        <Disclosure
          title="Returned to collectors"
          meta={`${returned.length} ${
            returned.length === 1 ? "claim needs" : "claims need"
          } more evidence`}
          className="mt-6"
        >
          <ul className="space-y-3">
            {returned.map((claim) => (
              <li key={claim.id} className="dense-text">
                <Link
                  href={`/review/${claim.id}`}
                  className="inline-flex min-h-11 items-center font-medium text-tide link-underline"
                >
                  {claim.cleanup_site} · {claim.pair_label}
                </Link>
                <p className="mt-0.5 text-xs leading-5 text-muted">
                  {claim.decision_note ?? "Needs more evidence."}
                </p>
              </li>
            ))}
          </ul>
        </Disclosure>
      ) : null}

      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(300px,380px)_1fr]">
        <ReviewQueue items={items} selectedId={selected?.claim.id ?? null} />

        {selected ? (
          <ClaimReview
            data={toClaimReviewData(
              selected,
              getClaimLineage(selected.claim.id),
            )}
          />
        ) : (
          <div className="panel p-6">
            <h2 className="panel-title">Nothing waiting</h2>
            <p className="dense-text mt-2 text-muted">
              Confirmed claims are in the record. New submissions will appear
              here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
