import type { ReactNode } from "react";

/**
 * The visible survey rules. Used on the home page only, where the grid is part
 * of the explanation rather than a background on every screen.
 */
export function SurveyGrid({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        aria-hidden="true"
        className="survey-grid pointer-events-none absolute inset-0"
      />
      <span
        aria-hidden="true"
        className="absolute left-5 top-5 h-4 w-4 border-l border-t border-ink/50 sm:left-8 sm:top-8"
      />
      <span
        aria-hidden="true"
        className="absolute right-5 top-5 h-4 w-4 border-r border-t border-ink/50 sm:right-8 sm:top-8"
      />
      <span
        aria-hidden="true"
        className="absolute bottom-5 left-5 h-4 w-4 border-b border-l border-ink/50 sm:bottom-8 sm:left-8"
      />
      <span
        aria-hidden="true"
        className="absolute bottom-5 right-5 h-4 w-4 border-b border-r border-ink/50 sm:bottom-8 sm:right-8"
      />
      <div className="relative">{children}</div>
    </div>
  );
}
