import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClaimReview } from "@/components/claim-review";
import { getClaimForReview, getClaimLineage } from "@/lib/queue.server";
import { toClaimReviewData } from "@/lib/review-data";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ClaimReviewPage({
  params,
}: {
  params: Promise<{ claimId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/setup");
  }

  const { claimId } = await params;
  const entry = getClaimForReview(claimId, user.id);

  if (!entry) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <Link
        href="/review"
        className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted hover:text-ink"
      >
        ← Review queue
      </Link>

      <div className="mt-4">
        <ClaimReview
          data={toClaimReviewData(entry, getClaimLineage(claimId))}
        />
      </div>
    </div>
  );
}
