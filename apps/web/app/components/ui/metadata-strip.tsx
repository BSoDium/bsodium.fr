import type { ReactNode } from "react";
import { cn } from "~/lib/utils";

interface MetadataItem {
  label: string;
  value: ReactNode;
}

/**
 * Plain facts under a title, one per line: a date, a place. A definition list, so a screen reader hears the pairs ("Date, 2026.03.14");
 * the keys are not drawn (a date and a place say what they are), and there are no rules or boxes.
 */
export function MetadataStrip({ items, className }: { items: readonly MetadataItem[]; className?: string }) {
  return (
    <dl data-slot="metadata-strip" className={cn("m-0 flex flex-col text-sm text-muted-foreground", className)}>
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0">
          <dt className="sr-only">{item.label}</dt>
          <dd className="m-0 min-w-0 truncate">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
