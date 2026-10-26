import { redirect } from "next/navigation";
import { CleanupForm } from "@/components/cleanup-form";
import { Breadcrumbs, PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/session";
import { todayIso } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "New cleanup",
};

export default async function NewCleanupPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/setup");
  }

  return (
    <div className="page">
      <Breadcrumbs
        items={[{ label: "Cleanups", href: "/cleanups" }, { label: "New" }]}
      />

      <div className="mt-5">
        <PageHeader
          title="A cleanup starts with a place and a date."
          description="The site label and public note may be shared with a sponsor. Internal conditions stay in the workspace."
        />
      </div>

      <div className="mt-9">
        <CleanupForm today={todayIso()} leadName={user.display_name} />
      </div>
    </div>
  );
}
