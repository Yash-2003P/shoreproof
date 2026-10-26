import Link from "next/link";
import { redirect } from "next/navigation";
import { ClaimReview } from "@/components/claim-review";
import { ReviewQueue, type QueueItemView } from "@/components/review-queue";
import {
  getClaimLineage,
  getReviewQueue,
  getReturnedClaims,
} from "@/lib/queue.server";
import { toClaimReviewData } from "@/lib/review-data";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

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
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Review</h1>
          <p className="mt-1 max-w-2xl text-sm leading-5 text-muted">
            The riskiest claims first. Flags are hints for your judgment, not
            verdicts — every decision records who made it and when.
          </p>
        </div>
        <Link
          href="/cleanups"
          className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted hover:text-ink"
        >
          Cleanups
        </Link>
      </header>

      {returned.length > 0 ? (
        <section aria-label="Returned claims" className="panel mt-6 p-4">
          <p className="field-label">Returned to collectors</p>
          <ul className="mt-2 space-y-1.5">
            {returned.map((claim) => (
              <li
                key={claim.id}
                className="text-[13px] leading-5 text-muted"
              >
                <Link
                  href={`/review/${claim.id}`}
                  className="font-mono text-[11px] uppercase tracking-[0.06em] text-tide hover:underline"
                >
                  {claim.cleanup_site} · {claim.pair_label}
                </Link>{" "}
                — {claim.decision_note ?? "Needs more evidence."}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(280px,340px)_1fr]">
        <ReviewQueue
          items={items}
          selectedId={selected?.claim.id ?? null}
        />

        {selected ? (
          <ClaimReview
            data={toClaimReviewData(
              selected,
              getClaimLineage(selected.claim.id),
            )}
          />
        ) : (
          <div className="panel p-6">
            <p className="text-sm leading-5 text-muted">
              Nothing waiting. Confirmed claims are in the record.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
