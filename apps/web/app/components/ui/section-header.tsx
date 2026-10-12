import type { ReactNode } from "react";
import { cn } from "~/lib/utils";

interface SectionHeaderProps {
  title: string;
  /** The heading level; pick the one that fits the outline of the page or panel. */
  as?: "h2" | "h3" | "h4";
  id?: string;
  /** A quiet annotation after the title: a count. */
  meta?: ReactNode;
  className?: string;
}

/** A section's heading: the title in the sans scale and, after it, a muted count. No numbering, no rule: space does the separating. */
export function SectionHeader({ title, as: Heading = "h2", id, meta, className }: SectionHeaderProps) {
  return (
    <header data-slot="section-header" className={cn("flex items-baseline gap-2", className)}>
      <Heading id={id} className="m-0 text-lg font-semibold tracking-tight">
        {title}
      </Heading>
      {meta !== undefined && meta !== null && <span className="text-sm text-muted-foreground tabular-nums">{meta}</span>}
    </header>
  );
}
