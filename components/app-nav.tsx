"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/cleanups", label: "Cleanups" },
  { href: "/review", label: "Review" },
  { href: "/settings", label: "Settings" },
];

export function AppNav({ reviewCount }: { reviewCount?: number }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Workspace"
      className="order-last flex w-full items-center gap-1 border-t border-line pt-1 sm:order-none sm:w-auto sm:border-0 sm:pt-0"
    >
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 items-center gap-2 border-b-2 px-2 text-sm font-medium transition-colors sm:px-2.5 ${
              active
                ? "border-tide text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {item.label}
            {item.href === "/review" && reviewCount && reviewCount > 0 ? (
              <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border border-flag/60 bg-flag/10 px-1 text-xs font-semibold leading-none text-flag-ink">
                {reviewCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
