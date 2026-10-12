import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "~/lib/utils";

/** A definition list of plain key and value rows (docs/design-system.md, "Data rows"): the key muted, the value beside it. */
export function DataList({ className, children, ...props }: HTMLAttributes<HTMLDListElement>) {
  return (
    <dl data-slot="data-list" className={cn("m-0", className)} {...props}>
      {children}
    </dl>
  );
}

interface DataRowProps {
  label: ReactNode;
  children: ReactNode;
  /** Values that are numbers, codes or dates read best in the mono face. */
  mono?: boolean;
  className?: string;
}

/** One row: a plain `dl > div > dt + dd`, laid out as two columns by CSS (`.ds-data-row`). */
export function DataRow({ label, children, mono, className }: DataRowProps) {
  return (
    <div data-slot="data-row" className={cn("ds-data-row", className)}>
      <dt>{label}</dt>
      <dd className={cn("text-base", mono && "ds-meta text-foreground")}>{children}</dd>
    </div>
  );
}
