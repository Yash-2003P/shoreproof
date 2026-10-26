import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EvidencePack } from "@/components/evidence-pack";
import { Wordmark } from "@/components/wordmark";
import { buildExportBundle, publicBlockers } from "@/lib/export";
import { getPublishedCleanupBySlug } from "@/lib/publishing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Public cleanup record",
  description:
    "A read-only ShoreProof record of confirmed cleanup claims, each with a sanitized crop and a named review decision.",
  robots: { index: false, follow: false },
};

export default async function PublicRecordPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cleanup = getPublishedCleanupBySlug(slug);

  if (!cleanup) {
    notFound();
  }

  if (publicBlockers(cleanup.id).length > 0) {
    notFound();
  }

  const bundle = await buildExportBundle(cleanup.id, "public");

  return (
    <div className="flex min-h-screen flex-col bg-salt">
      <header className="border-t-2 border-tide border-b border-line">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Wordmark href="/" />
          <span className="chip chip-tide">Public record</span>
        </div>
      </header>

      <main className="flex-1">
        <EvidencePack bundle={bundle} mode="public" />
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-6 py-4 text-[11px] leading-5 text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            Read-only. Confirmed claims only. This page is not indexed and
            cannot be found from the workspace.
          </p>
          <Link href="/privacy" className="link-underline text-tide">
            How photos are handled
          </Link>
        </div>
      </footer>
    </div>
  );
}
