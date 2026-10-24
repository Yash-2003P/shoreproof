import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col">
      <div className="border-t-2 border-tide border-b border-line">
        <div className="mx-auto w-full max-w-6xl px-6 py-5">
          <span className="font-mono text-[15px] font-semibold tracking-[0.18em] text-ink">
            SHOREPROOF
          </span>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-16">
        <p className="field-label">404</p>
        <h1 className="mt-3 max-w-xl font-serif text-4xl leading-tight text-ink">
          There is no record at this address.
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted">
          A public page also returns this when it is unpublished. The old link
          stops working on purpose.
        </p>
        <div className="mt-6">
          <Link href="/cleanups" className="btn btn-primary">
            Back to cleanups
          </Link>
        </div>
      </div>
    </main>
  );
}
