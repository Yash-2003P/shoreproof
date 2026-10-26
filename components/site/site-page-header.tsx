import type { ReactNode } from "react";
import { FieldLabel } from "@/components/site/field-label";

export function SitePageHeader({
  kicker,
  title,
  lede,
  meta,
}: {
  kicker: string;
  title: ReactNode;
  lede: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className="mx-auto w-full max-w-[1200px] px-5 pb-9 pt-12 sm:px-8 sm:pb-11 sm:pt-16">
      <FieldLabel>{kicker}</FieldLabel>
      <h1 className="display-1 mt-3 max-w-4xl">{title}</h1>
      <p className="lede mt-5 max-w-3xl">{lede}</p>
      {meta ? (
        <p className="mono mt-5 max-w-3xl text-xs leading-5 text-muted">
          {meta}
        </p>
      ) : null}
    </header>
  );
}
