/**
 * How translucent a map label's plate may be (pure, unit tested).
 *
 * The plate is the page colour at an ALPHA over whatever the map draws behind the label (app.css `.map-label`, `--label-plate-alpha`). The
 * less alpha, the more of the map shows through, and the less the text is separated from it: the least alpha that still keeps the text AA
 * (WCAG 4.5:1, the name at 14 px and the second line at 11 px are both "not large") against the WORST tone that can be behind a glyph is
 * the FLOOR, computed here from the tokens (`LABEL_PLATE_FLOOR`); the value used is chosen above it by eye (`LABEL_PLATE_ALPHA`).
 *
 * The worst tone behind a plate is the loudest the map ever draws: the `peak` level of the ramp (engine/palette.ts), which is the colour of
 * a box's outline at rest, one level above the coastline (the loudest tone of the map's own content: coastlines, borders, roads, graticule).
 * A plate that is over another node's outline sees exactly this colour, and everything else is quieter. A full-ink line (a route, a hovered
 * or selected outline) is louder; a plate is kept clear of every outline (the planner's `avoid`) and a route is thin, so it is not the
 * design case: `minPlateAlpha(..., ink)` gives what it would take (reported in docs/web-architecture.md).
 *
 * Compositing is what CSS does: per channel in sRGB, `alpha * plate + (1 - alpha) * behind`.
 */
import { AA_TEXT, contrastRatio, type Rgb } from "./palette";

export { AA_TEXT };

/** `top` at `alpha` over `under`, per sRGB channel (the CSS compositing of a translucent background). */
export function composite(top: Rgb, alpha: number, under: Rgb): Rgb {
  return [top[0] * alpha + under[0] * (1 - alpha), top[1] * alpha + under[1] * (1 - alpha), top[2] * alpha + under[2] * (1 - alpha)];
}

/**
 * The least alpha of a `plate` colour over `under` at which `text` has `target` contrast against the result. The contrast of a text colour
 * against `composite(plate, a, under)` is monotone in `a` as long as the plate is further from the text than `under` is (which is the case:
 * the plate is the page colour, `under` a map tone between it and the ink), so a bisection finds it to 1e-12. 0 when `under` alone is enough,
 * 1 when even the opaque plate is not (`plate` itself fails: nothing to do with transparency).
 */
export function minPlateAlpha(text: Rgb, plate: Rgb, under: Rgb, target: number = AA_TEXT): number {
  if (contrastRatio(text, under) >= target) return 0;
  if (contrastRatio(text, plate) < target) return 1;
  let lo = 0;
  let hi = 1;
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    if (contrastRatio(text, composite(plate, mid, under)) >= target) hi = mid;
    else lo = mid;
  }
  return hi;
}

/** A plate alpha as it is written in the CSS token: the analytic minimum rounded UP to a whole percent (never under it). */
export const roundPlateAlpha = (alpha: number): number => Math.ceil(alpha * 100 - 1e-9) / 100;

/** The two texts of a label against the plate: the name (the foreground) and the second line (the muted foreground). */
export interface LabelTextColours {
  foreground: Rgb;
  muted: Rgb;
}

/** The least alpha for both lines of a label over `under`: the larger of the two minima (the muted second line is the binding one). */
export function labelPlateAlpha(text: LabelTextColours, background: Rgb, under: Rgb, target: number = AA_TEXT): number {
  return Math.max(minPlateAlpha(text.foreground, background, under, target), minPlateAlpha(text.muted, background, under, target));
}

/**
 * The WCAG FLOOR of the plate alpha of each scheme: `roundPlateAlpha(labelPlateAlpha(...))` with the scheme's tokens over the `peak` level of
 * its ramp, the least at which both lines are AA (readability.test.ts recomputes it from the stylesheet and fails on any drift). Until
 * 2026-10-13 the stylesheet's token WAS this floor; the owner found the plate too see-through, so it is a chosen value above it now.
 */
export const LABEL_PLATE_FLOOR = { light: 0.7, dark: 0.62 } as const;

/**
 * The plate alpha of each scheme, as written in app.css (`--label-plate-alpha`, light and dark): a design choice (2026-10-13, owner: "not
 * opaque enough, a bit less see-through"), 0.16 / 0.18 above the floor so the plate reads as a ground over a busy map while the map still shows
 * through it (the text contrast only grows with the alpha: the floor's guarantee holds). Never above `LABEL_PLATE_MAX`: a plate that hid
 * the map would be the opaque sticker the translucent plate replaced.
 */
export const LABEL_PLATE_ALPHA = { light: 0.86, dark: 0.8 } as const;
/** The most opaque a map label's plate may be at rest and still be "translucent" (the map shows through a tenth of it or more). */
export const LABEL_PLATE_MAX = 0.9;
