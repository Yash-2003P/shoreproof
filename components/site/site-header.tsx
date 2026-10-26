import Link from "next/link";
import { SITE_NAV } from "@/lib/site";
import { Wordmark } from "@/components/wordmark";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-t-2 border-tide border-b border-line bg-salt">
      <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
        <div className="flex min-h-16 items-center gap-3">
          <Wordmark href="/" />

          <div className="ml-auto flex items-center gap-2">
            <nav
              aria-label="Public site"
              className="hidden items-center gap-1 lg:flex"
            >
              {SITE_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex min-h-11 items-center border-b-2 border-transparent px-2.5 text-sm font-medium text-muted transition-colors hover:border-tide hover:text-ink"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <Link href="/cleanups" className="btn btn-primary ml-1">
              Open the app
            </Link>

            <details className="site-menu relative lg:hidden">
              <summary
                className="btn btn-ghost"
                aria-label="Open the public site menu"
              >
                Menu
              </summary>
              <nav
                aria-label="Public site, mobile"
                className="absolute right-0 top-full z-50 mt-2 w-64 border border-line bg-paper p-2"
              >
                {SITE_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex min-h-11 items-center border-b border-line px-3 text-sm font-medium text-ink last:border-b-0 hover:bg-wash"
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  href="/privacy"
                  className="flex min-h-11 items-center px-3 text-sm font-medium text-muted hover:bg-wash hover:text-ink"
                >
                  Privacy
                </Link>
              </nav>
            </details>
          </div>
        </div>
      </div>
    </header>
  );
}
