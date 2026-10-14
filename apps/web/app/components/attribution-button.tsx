import { useMemo, useRef, useState } from "react";
import { CreditsDialog } from "~/components/credits-dialog";
import { Icon } from "~/components/ui/icon";
import { attributionFor, attributionLine, type AttributionTiles } from "~/globe/street/core/attribution";
import { MAP_CARD } from "~/lib/map-card";
import { cn } from "~/lib/utils";

interface AttributionButtonProps {
  /** The street map's tile configuration (decides which sources are credited), or null for the globe alone. */
  tiles: AttributionTiles | null;
  /** CSS px of the right edge covered by the detail panel: the card stays left of it. */
  insetRight: number;
  reducedMotion: boolean;
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
 *  - Below `md` the card is gone (it is clutter on a small screen) and a 28 px "i" button (`data-attribution="compact"`, named
 *    "Map credits", 44 px touch target) in the same corner opens the same dialog: the credits stay one tap away, as the licences ask.
 * Place it in a positioned container that fills the map.
 */
export function AttributionButton({ tiles, insetRight, reducedMotion }: AttributionButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const compactRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
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
          small button, in the same corner, opens the same dialog. A solid plate (the page colour, no alpha), the dim `--subtle-foreground` icon at
          `text-base` (17.6 px as an inline icon) in a 28 px box; the invisible `::after` makes the touch target 44 px, reaching down to the screen's
          edge and so it is 44 CSS px square (the 1 px border is outside the ::after's containing box, hence 9 px). */}
      <button
        ref={compactRef}
        type="button"
        data-attribution="compact"
        aria-haspopup="dialog"
        aria-label="Map credits"
        style={{ right: "0.5rem", bottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
        className="absolute z-20 flex size-7 cursor-pointer touch-manipulation items-center justify-center rounded-sm border border-border bg-background text-base text-subtle-foreground select-none after:absolute after:-inset-[9px] after:content-[''] hover:text-foreground focus-visible:text-foreground md:hidden"
        onClick={() => setOpen(true)}
      >
        <Icon name="info" size="inline" />
      </button>
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
