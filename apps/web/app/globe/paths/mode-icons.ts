/**
 * The way a leg was travelled, as a small picture on its path (`trail-dots-layer.ts`): a square badge in the colour of the path at that point with the
 * mode's icon in the page colour inside it, at full resolution (owner, 2026-10-21: the 9 x 7 pixel sprites were as good as the art grid allows; the
 * badges are drawn in device pixels, from the vector icons of `mode-icon-paths.ts`). `unknown` has none (the map does not say what it does not know).
 * The picture is the redundant half of the mode (the line's pattern is the other): neither carries it alone.
 */
import type { LegMode } from "./modes";
import { MODE_ICON_NODES } from "./mode-icon-paths";

/** The badge's side and the icon's, CSS px. Square corners: the badge is a pixel-art plate, only finer. */
export const BADGE_PX = 22;
export const ICON_PX = 15;

const SVG = "http://www.w3.org/2000/svg";

/** Whether a mode wears a picture. */
export const hasIcon = (mode: LegMode): boolean => !!MODE_ICON_NODES[mode === "walk" ? "walk" : mode];

/**
 * The badge element for a mode: `background` the path's colour there, `ink` the icon's (the page colour, which contrasts with it in both schemes),
 * `ring` the page colour round the badge that sets it off the lines it sits on. No text: decoration (`aria-hidden` on the layer).
 */
export function badgeElement(mode: LegMode, background: string, ink: string, ring: string): HTMLElement | null {
  const icon = MODE_ICON_NODES[mode];
  if (!icon) return null;
  const el = document.createElement("div");
  el.dataset.legBadge = mode;
  Object.assign(el.style, {
    position: "absolute",
    width: `${BADGE_PX}px`,
    height: `${BADGE_PX}px`,
    background,
    boxShadow: `0 0 0 2px ${ring}`,
    display: "grid",
    placeItems: "center",
    pointerEvents: "none",
  });
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(ICON_PX));
  svg.setAttribute("height", String(ICON_PX));
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", ink);
  svg.setAttribute("stroke-width", "2.25");
  svg.setAttribute("stroke-linecap", "square");
  svg.setAttribute("stroke-linejoin", "miter");
  for (const [tag, attrs] of icon.node) {
    const child = document.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(attrs)) child.setAttribute(k, v);
    svg.append(child);
  }
  el.append(svg);
  return el;
}
