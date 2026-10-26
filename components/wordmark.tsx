import Link from "next/link";

export function Wordmark({ href = "/cleanups" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-3"
      aria-label="ShoreProof home"
    >
      <span className="font-mono text-base font-semibold tracking-[0.16em] text-ink">
        SHOREPROOF
      </span>
      <span className="hidden text-xs text-muted sm:inline">
        Cleanup evidence
      </span>
    </Link>
  );
}
