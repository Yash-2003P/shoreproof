import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col">
      <div className="border-t-2 border-tide border-b border-line">
        <div className="mx-auto w-full max-w-6xl px-5 py-3 sm:px-8">
          <span className="font-mono text-base font-semibold tracking-[0.16em] text-ink">
            SHOREPROOF
          </span>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-5 py-16 sm:px-8">
        <p className="field-label">404</p>
        <h1 className="display-1 mt-3 max-w-xl">
          There is no record at this address.
        </h1>
        <p className="mt-3 max-w-md text-base leading-7 text-muted">
          A public page also returns this when it is unpublished. The old link
          stops working on purpose.
        </p>
        <div className="mt-7">
          <Link href="/cleanups" className="btn btn-primary">
            Back to cleanups
          </Link>
        </div>
      </div>
    </main>
  );
}
