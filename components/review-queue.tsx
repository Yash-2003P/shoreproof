import Link from "next/link";
import { FLAG_LABELS, FLAG_ORDER, type QueueFlagCode } from "@/lib/queue";

export type QueueItemView = {
  id: string;
  site: string;
  pairLabel: string;
  text: string;
  category: string | null;
  collectorName: string;
  flags: QueueFlagCode[];
  priority: number;
};

/**
 * The left half of the review split view. Flags are text, never icons
 * alone, and the reason a claim is flagged is visible without hovering.
 */
export function ReviewQueue({
  items,
  selectedId,
}: {
  items: QueueItemView[];
  selectedId: string | null;
}) {
  if (items.length === 0) {
    return (
      <div className="panel p-5" aria-label="Review queue">
        <h2 className="panel-title">Queue empty</h2>
        <p className="dense-text mt-2 text-muted">
          Nothing waiting. Confirmed claims are in the record.
        </p>
      </div>
    );
  }

  return (
    <nav
      aria-label="Review queue"
      className="panel divide-y divide-line overflow-hidden"
    >
      <div className="flex items-center justify-between gap-2 border-b border-line bg-wash px-4 py-3">
        <h2 className="field-label">Waiting for review</h2>
        <span className="mono text-xs text-muted">
          {items.length} {items.length === 1 ? "claim" : "claims"}
        </span>
      </div>

      <ul>
        {items.map((item) => {
          const selected = item.id === selectedId;

          return (
            <li key={item.id}>
              <Link
                href={`/review/${item.id}`}
                aria-current={selected ? "true" : undefined}
                className={`block px-4 py-4 transition-colors hover:bg-wash ${
                  selected ? "bg-tide/10 ring-1 ring-inset ring-tide" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-muted">
                    {item.site} · {item.pairLabel}
                  </span>
                  <span
                    className="mono text-xs text-tide"
                    title={`Priority ${item.priority}`}
                  >
                    P{item.priority}
                  </span>
                </div>

                <p className="mt-1.5 text-sm leading-6 text-ink">
                  {item.text.length > 90
                    ? `${item.text.slice(0, 90)}…`
                    : item.text}
                </p>

                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {item.flags.length === 0 ? (
                    <span className="chip text-muted">No flags</span>
                  ) : (
                    FLAG_ORDER.filter((flag) => item.flags.includes(flag)).map(
                      (flag) => (
                        <span
                          key={flag}
                          className="chip border-flag/60 text-flag-ink"
                        >
                          {FLAG_LABELS[flag]}
                        </span>
                      ),
                    )
                  )}
                </div>

                <p className="mt-2 text-xs text-muted">
                  {item.category ?? "No category"} · {item.collectorName}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
