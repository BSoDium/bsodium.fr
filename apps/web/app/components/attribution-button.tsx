import { useEffect, useMemo, useRef, useState } from "react";
import { CreditsDialog } from "~/components/credits-dialog";
import { Icon } from "~/components/ui/icon";
import { attributionFor, attributionLine, type AttributionTiles } from "~/globe/street/core/attribution";
import { createCreditsCollapse, type CreditsCollapse, type CreditsSurface } from "~/lib/credits-collapse";
import { MAP_CARD } from "~/lib/map-card";
import { cn } from "~/lib/utils";

interface AttributionButtonProps {
  /** The street map's tile configuration (decides which sources are credited), or null for the globe alone. */
  tiles: AttributionTiles | null;
  /** CSS px of the right edge covered by the detail panel: the card stays left of it. */
  insetRight: number;
  reducedMotion: boolean;
  /** Which map this sits on; the phone's line is shown once per page load per surface. */
  surface?: CreditsSurface;
}

/**
 * The map's credits. From `md` (768 px) up: ONE line of mono text with the main contributors ("© OpenStreetMap · OpenFreeMap · Natural Earth", from the
 * same list as the dialog, so it follows the tile configuration), then a middle dot (the same separator as between the credits) and a "See more" button with an up-left arrow (`Icon`, inline size) that opens the
 * credits dialog (`CreditsDialog`). Both sit in the dev badge's card (`MAP_CARD`), bottom right of the map, left of the detail
 * panel's inset.
 *
 *  - The line is real, selectable text in the dim `--subtle-foreground` (less contrast, never less opacity). It never wraps and
 *    never overflows: it is one line high with the overflow clipped, and its items are unbreakable, so on a narrow screen the
 *    LAST items fall to the clipped second line first (priority order = the order of the list: the street data first, the
 *    courtesy credit last) and the card never grows past the room between the viewport edge (or the panel) and its margin.
 *  - The button is a real `<button aria-haspopup="dialog">` named "See more credits". Hover and keyboard focus raise it to the foreground; the
 *    global focus ring shows on keyboard focus.
 *  - Below `md` the long card is gone (clutter on a small screen). The OSM Foundation's guidelines do not allow the credit to be
 *    hidden behind an icon by default, so a SHORT line ("© OpenStreetMap contributors · OpenFreeMap · Natural Earth", wrapping
 *    between credits, never clipped) is shown beside the 28 px "i" button at load, and collapses to the button alone after 5 s or on
 *    the first pan, zoom or tap on the map, once per page load per surface (`lib/credits-collapse.ts`). The button
 *    (`data-attribution="compact"`, named "Map credits", 44 px touch target) always opens the same dialog.
 * Place it in a positioned container that fills the map.
 */
export function AttributionButton({ tiles, insetRight, reducedMotion, surface = "globe" }: AttributionButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const compactRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  // The phone's line: server and first client render are collapsed (the button alone); the effect shows it, once per session per surface.
  const [lineShown, setLineShown] = useState(false);
  const compactBoxRef = useRef<HTMLDivElement>(null);
  const collapseRef = useRef<CreditsCollapse | null>(null);
  useEffect(() => {
    // (kept across StrictMode's second effect run: the guard is read once)
    collapseRef.current ??= createCreditsCollapse({ surface, onChange: setLineShown });
    const c = collapseRef.current;
    // Only on a phone: from `md` up the card is always there. A line shown and then a resize to a wide window just hides itself by CSS.
    if (window.matchMedia("(max-width: 767.98px)").matches) c.start();
    const map = compactBoxRef.current?.parentElement;
    const interact = () => c.interact();
    map?.addEventListener("pointerdown", interact, { passive: true });
    map?.addEventListener("wheel", interact, { passive: true });
    return () => {
      map?.removeEventListener("pointerdown", interact);
      map?.removeEventListener("wheel", interact);
      c.stop();
    };
  }, [surface]);
  const tilesKey = tiles ? `${tiles.primaryUrl}|${tiles.fallbackPmtilesUrl ?? ""}` : "";
  // `tiles` is compared by value, through `tilesKey`
  const credits = useMemo(() => attributionFor(tiles), [tilesKey]);
  const line = useMemo(() => attributionLine(credits), [credits]);

  return (
    <>
      <div
        data-attribution="card"
        style={{
          right: `calc(${insetRight}px + 0.5rem)`,
          bottom: "max(0.5rem, env(safe-area-inset-bottom))",
          maxWidth: `calc(100% - ${insetRight}px - 1rem)`,
        }}
        className={cn(MAP_CARD, "absolute z-20 flex items-center gap-[1ch] text-subtle-foreground max-md:hidden")}
      >
        <p className="h-4 min-w-0 overflow-hidden select-text">
          {line.map((name, i) => (
            <span key={name}>
              {i > 0 && " "}
              <span className="whitespace-nowrap">{i > 0 ? `· ${name}` : name}</span>
            </span>
          ))}
        </p>
        {/* the same middle dot as between the credits, outside the clipped text so that it stays beside the button on a narrow screen */}
        <span aria-hidden="true" className="shrink-0 select-none">
          ·
        </span>
        <button
          ref={buttonRef}
          type="button"
          aria-haspopup="dialog"
          aria-label="See more credits"
          className="inline-flex shrink-0 cursor-pointer touch-manipulation items-center gap-0.5 whitespace-nowrap select-none hover:text-foreground focus-visible:text-foreground"
          onClick={() => setOpen(true)}
        >
          See more
          <Icon name="arrow-up-left" size="inline" />
        </button>
      </div>
      {/* Below `md` (768 px, `useIsMobile`'s line) the card is not drawn (`display: none`: out of the tab order and the accessibility tree) and this
          box takes its corner: the short credits line while `lineShown` (the first 5 s of the session on this surface, or until the first
          interaction), then the small "i" button alone. The button is the same element in both states (it keeps the keyboard focus). A solid
          plate (the page colour, no alpha), the dim `--subtle-foreground` text and icon, no animation at all (so none to reduce). The button's
          invisible `::after` makes its touch target 44 CSS px square (the 1 px border is outside the ::after's containing box, hence 9 px). */}
      <div
        ref={compactBoxRef}
        style={{ right: "0.5rem", bottom: "max(0.375rem, env(safe-area-inset-bottom))", maxWidth: "calc(100% - 1rem)" }}
        className="absolute z-20 flex items-end gap-1 md:hidden"
      >
        {lineShown && <CompactCreditsLine names={compactNames(line)} />}
        <button
          ref={compactRef}
          type="button"
          data-attribution="compact"
          aria-haspopup="dialog"
          aria-label="Map credits"
          className="relative flex size-7 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-sm border border-border bg-background text-base text-subtle-foreground select-none after:absolute after:-inset-[9px] after:content-[''] hover:text-foreground focus-visible:text-foreground"
          onClick={() => setOpen(true)}
        >
          <Icon name="info" size="inline" />
        </button>
      </div>
      <CreditsDialog
        open={open}
        credits={credits}
        reducedMotion={reducedMotion}
        onClose={() => setOpen(false)}
        onClosed={() => {
          // whichever of the two is drawn (the other is `display: none` and cannot take the focus)
          const visible = [buttonRef.current, compactRef.current].find((b) => b && b.getClientRects().length > 0);
          visible?.focus();
        }}
      />
    </>
  );
}

/** The phone's names: "© OpenStreetMap" is said in full there ("contributors", as the licence's wording has it). */
const compactNames = (line: readonly string[]) => line.map((n) => (n === "© OpenStreetMap" ? "© OpenStreetMap contributors" : n));

/** The short line beside the "i" button: solid plate, mono 10 px, real selectable text; it wraps between credits and is never clipped. */
export function CompactCreditsLine({ names }: { names: readonly string[] }) {
  return (
    <p
      data-attribution="compact-line"
      className="flex min-h-7 min-w-0 flex-wrap items-center gap-x-[1ch] rounded-sm border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] leading-4 tracking-wide text-subtle-foreground select-text"
    >
      {names.map((name, i) => (
        <span key={name} className="whitespace-nowrap">
          {i > 0 ? `· ${name}` : name}
        </span>
      ))}
    </p>
  );
}
