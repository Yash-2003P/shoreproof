import Link from "next/link";

export function Wordmark({ href = "/cleanups" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-baseline gap-3">
      <span className="font-mono text-[15px] font-semibold tracking-[0.18em] text-ink">
        SHOREPROOF
      </span>
      <span className="hidden font-mono text-[9px] uppercase tracking-[0.16em] text-muted sm:inline">
        Cleanup evidence
      </span>
    </Link>
  );
}
