import Link from "next/link";
import {
  SITE_GITHUB_URL,
  SITE_LICENSE_URL,
  SITE_NAV,
} from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-salt">
      <div className="mx-auto grid w-full max-w-[1200px] gap-9 px-5 py-11 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-mono text-base font-semibold tracking-[0.16em] text-ink">
            SHOREPROOF
          </p>
          <p className="mt-3 max-w-xs text-sm leading-6 text-muted">
            A local-first cleanup record. Every exported claim resolves to a
            marked region and a named human decision.
          </p>
          <p className="mt-4 text-xs leading-5 text-muted">
            No analytics. No third-party runtime calls. Photos are sanitized
            before they are stored.
          </p>
        </div>

        <nav aria-label="Public site footer">
          <p className="field-label">Read</p>
          <ul className="mt-2 space-y-1">
            {SITE_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center text-sm text-muted hover:text-ink hover:underline hover:underline-offset-4"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="field-label">Record</p>
          <ul className="mt-2 space-y-1">
            <li>
              <Link
                href="/privacy"
                className="inline-flex min-h-9 items-center text-sm text-muted hover:text-ink hover:underline hover:underline-offset-4"
              >
                Privacy
              </Link>
            </li>
            <li>
              <a
                href={SITE_LICENSE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-9 items-center text-sm text-muted hover:text-ink hover:underline hover:underline-offset-4"
              >
                License · AGPL-3.0
              </a>
            </li>
            <li>
              <a
                href={SITE_GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-9 items-center text-sm text-muted hover:text-ink hover:underline hover:underline-offset-4"
              >
                GitHub
              </a>
            </li>
          </ul>
          <p className="mt-4 text-xs leading-5 text-muted">
            © 2026 ShoreProof. Built for Build With AI: Basics.
          </p>
        </div>
      </div>
    </footer>
  );
}
