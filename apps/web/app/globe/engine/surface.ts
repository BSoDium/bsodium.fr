/**
 * The land's own picture (`surfaceMaterial`, engine/materials.ts: NASA's Blue Marble as a dot matrix, denser where the ground is darker, `public/media/earth-grey.png`) is a layer
 * for the UNZOOMED views: whole at the page's resting view and for the whole of the range below the country borders, and thinning out (fewer dots, from `from` to `to`, the zoom of
 * the unified camera) only over the last stretch before the borders come on (`TUNING.borderZoom`), which take its place. At rest it is a little under its full strength (`rest`);
 * the interlude brings it to its whole (`landShare`, 0..1, the caption's own easing).
 */
export const SURFACE = {
  url: "/media/earth-grey.png",
  rest: 0.8,
  from: 2.2,
  to: 3.2,
} as const;

/** How much of the land's picture is shown at `zoom` (the camera's, as drawn), with the interlude's share `landShare`: 0..1. */
export function surfaceShare(zoom: number, landShare: number): number {
  const t = Math.min(1, Math.max(0, (zoom - SURFACE.from) / (SURFACE.to - SURFACE.from)));
  const zoomK = 1 - t * t * (3 - 2 * t);
  const strength = SURFACE.rest + (1 - SURFACE.rest) * Math.min(1, Math.max(0, landShare));
  return zoomK * strength;
}
