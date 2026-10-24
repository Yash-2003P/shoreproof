const steps = ["Capture", "Mark", "Compare", "Submit"] as const;

export function Stepper({ current }: { current: number }) {
  return (
    <ol className="mt-6 grid grid-cols-2 border-y border-line sm:grid-cols-4">
      {steps.map((step, index) => {
        const number = index + 1;
        const done = number < current;
        const active = number === current;

        return (
          <li
            key={step}
            aria-current={active ? "step" : undefined}
            className={`flex items-center gap-2 px-3 py-3 ${
              index > 0 ? "border-line sm:border-l" : ""
            } ${index % 2 === 1 ? "border-l border-line sm:border-l" : ""} ${
              index > 1 ? "border-t border-line sm:border-t-0" : ""
            }`}
          >
            <span
              className={`mono text-[10px] ${active ? "text-tide" : "text-muted"}`}
              aria-hidden="true"
            >
              {done ? "✓" : `0${number}`}
            </span>
            <span
              className={`font-mono text-[10px] uppercase tracking-[0.12em] ${
                active ? "text-ink" : "text-muted"
              }`}
            >
              {step}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
