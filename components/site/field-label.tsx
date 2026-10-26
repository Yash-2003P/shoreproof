import type { ReactNode } from "react";

export function FieldLabel({
  index,
  children,
  className = "",
}: {
  index?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={`kicker ${className}`}>
      {index ? (
        <span className="mr-2 text-tide" aria-hidden="true">
          {index}
        </span>
      ) : null}
      {children}
    </p>
  );
}
