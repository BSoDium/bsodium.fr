/**
 * The words of the ring of type that circles the planet when the globe is zoomed out (engine/ring.ts, docs/web-architecture.md, "Ring of type").
 *
 * Site identity facts only, decorative (the ring is `aria-hidden`; none of this is the page's content). Kept in this one file on purpose: it is
 * the only place the ring's words live, and the engine takes them as a plain string (`createHandover({ ringText })`) so that `engine/` never
 * knows who the site is. `lib/site.ts` (the site identity, introduced in a parallel branch) is deliberately not imported: the globe imports
 * nothing from the rest of the app (`layering.test.ts`). When that file lands, this can be fed from it by the one component that mounts the
 * globe, without touching the engine.
 *
 * Capitals are applied by `ringText`; the separator is a middle dot (`RING.separator`).
 */
export const RING_PHRASES: readonly string[] = [
  "Elliot Négrel-Jerzy",
  "Front-end engineer",
  "Data visualisation",
  "Cartography",
  "Design systems",
  "Paris",
];
