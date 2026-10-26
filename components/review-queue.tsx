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
        <p className="field-label">Nothing waiting</p>
        <p className="mt-2 text-sm leading-5 text-muted">
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
      <p className="border-b border-line bg-wash px-4 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
        {items.length} {items.length === 1 ? "claim" : "claims"} waiting
      </p>

      <ul>
        {items.map((item) => {
          const selected = item.id === selectedId;

          return (
            <li key={item.id}>
              <Link
                href={`/review/${item.id}`}
                aria-current={selected ? "true" : undefined}
                className={`block px-4 py-3 transition-colors hover:bg-wash ${
                  selected ? "bg-tide/10 ring-1 ring-inset ring-tide" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                    {item.site} · {item.pairLabel}
                  </span>
                  <span className="font-mono text-[10px] text-tide">
                    {item.priority}
                  </span>
                </div>

                <p className="mt-1.5 text-sm leading-5 text-ink">
                  {item.text.length > 90
                    ? `${item.text.slice(0, 90)}…`
                    : item.text}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
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

                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                  {item.category ?? "No category"} ·{" "}
                  {item.collectorName}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
