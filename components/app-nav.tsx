"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/cleanups", label: "Cleanups" },
  { href: "/settings", label: "Settings" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Workspace" className="flex items-center gap-6">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`border-b pb-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ${
              active
                ? "border-tide text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
