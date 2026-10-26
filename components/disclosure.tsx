"use client";

import { useState, type ReactNode } from "react";

/**
 * A native disclosure that keeps its open state across client re-renders.
 * Used to move technical detail out of the first read without removing it.
 */
export function Disclosure({
  title,
  meta,
  children,
  defaultOpen = false,
  className = "",
}: {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      className={`disclosure ${className}`}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        <span className="disclosure-summary-text">
          <span className="disclosure-title">{title}</span>
          {meta ? <span className="disclosure-meta">{meta}</span> : null}
        </span>
        <span className="disclosure-chevron" aria-hidden="true" />
      </summary>
      <div className="disclosure-body">{children}</div>
    </details>
  );
}
