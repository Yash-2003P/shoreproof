import { notFound, redirect } from "next/navigation";
import { ClaimReview } from "@/components/claim-review";
import { Breadcrumbs } from "@/components/page-header";
import { getClaimForReview, getClaimLineage } from "@/lib/queue.server";
import { toClaimReviewData } from "@/lib/review-data";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Claim review",
};

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
    <div className="page page-narrow">
      <Breadcrumbs
        items={[{ label: "Review", href: "/review" }, { label: "Claim" }]}
      />

      <div className="mt-5">
        <ClaimReview
          data={toClaimReviewData(entry, getClaimLineage(claimId))}
        />
      </div>
    </div>
  );
}
