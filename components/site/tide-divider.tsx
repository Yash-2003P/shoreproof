export function TideDivider({ animate = false }: { animate?: boolean }) {
  return (
    <div aria-hidden="true" className="tide-divider">
      <svg
        viewBox="0 0 1200 24"
        preserveAspectRatio="none"
        className={animate ? "tide-line tide-line-animate" : "tide-line"}
      >
        <path
          d="M0 13 C 50 4, 100 22, 150 13 S 250 4, 300 13 S 400 22, 450 13 S 550 4, 600 13 S 700 22, 750 13 S 850 4, 900 13 S 1000 22, 1050 13 S 1150 4, 1200 13"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
