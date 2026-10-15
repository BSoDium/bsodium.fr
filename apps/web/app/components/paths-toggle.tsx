import { Toggle } from "~/components/ui/toggle";

interface PathsToggleProps {
  on: boolean;
  onChange(on: boolean): void;
  /** CSS px of the right edge covered by the detail panel: the control stays left of it (as the credits card does). */
  insetRight: number;
}

/**
 * The map's "Paths" switch: every leg of every route drawn faintly (and the selected place's in ink), or none. A design-system
 * `Toggle` (`aria-pressed`, a name that never changes), small, bottom right of the map directly above the credits card and left of
 * the detail panel's inset. Drawn only where there is something to switch (`routes` have legs).
 */
export function PathsToggle({ on, onChange, insetRight }: PathsToggleProps) {
  return (
    <div
      data-paths-toggle=""
      style={{ right: `calc(${insetRight}px + 0.5rem)`, bottom: "calc(max(0.5rem, env(safe-area-inset-bottom)) + 1.75rem)" }}
      className="absolute z-20"
    >
      <Toggle size="sm" pressed={on} onPressedChange={onChange} aria-label="Paths">
        Paths
      </Toggle>
    </div>
  );
}
