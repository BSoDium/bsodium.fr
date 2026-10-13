/**
 * Whether an Escape key press is the panel's to act on (closing the place or entry panel): not when something else already took it
 * (`defaultPrevented`), and not when it is for a dialog. The search palette is a modal `dialog` whose own Escape closes it, and the
 * key event also reaches the panel's document listener: without this the same key press would close the palette AND the panel under it.
 * Pure (structural types), so the rule is tested without a DOM.
 */
export interface EscapeLike {
  readonly key: string;
  readonly defaultPrevented: boolean;
  /** A DOM event's target (anything: only an element has `closest`). */
  readonly target: unknown;
}

const hasClosest = (t: unknown): t is { closest: (selector: string) => unknown } => typeof (t as { closest?: unknown } | null)?.closest === "function";

/** `dialogOpen`: whether any modal dialog is open in the document (`document.querySelector("dialog[open]") !== null`). */
export function panelOwnsEscape(e: EscapeLike, dialogOpen: boolean): boolean {
  if (e.key !== "Escape" || e.defaultPrevented) return false;
  if (dialogOpen) return false;
  return !(hasClosest(e.target) && e.target.closest("dialog") !== null);
}
