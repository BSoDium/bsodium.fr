import { ENTRY_KIND_LABEL, type EntryKind } from "~/lib/entry-kind";
import { cn } from "~/lib/utils";
import { Glyph } from "./glyphs";

interface KindTagProps {
  kind: EntryKind;
  /** Glyph only; the word stays in the accessibility tree. For dense rows (the search results). */
  iconOnly?: boolean;
  /** Draw the glyph in the foreground colour (the selected row). */
  solid?: boolean;
  className?: string;
}

/**
 * Kind coding: the kind's glyph beside its word, plain (no box, no tint). Show it only where kinds are mixed (search results, the
 * related entries): a list that is already "Articles" does not say "Article" on every row (docs/design-system.md, "Kind coding").
 */
export function KindTag({ kind, iconOnly, solid, className }: KindTagProps) {
  return (
    <span data-slot="kind-tag" data-kind={kind} className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="ds-kind-glyph" data-solid={solid ? "" : undefined}>
        <Glyph name={kind} />
      </span>
      <span className={iconOnly ? "sr-only" : "text-sm text-muted-foreground"}>{ENTRY_KIND_LABEL[kind]}</span>
    </span>
  );
}
