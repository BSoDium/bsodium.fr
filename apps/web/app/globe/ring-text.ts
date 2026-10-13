/**
 * The words of the ring of type that circles the planet when the globe is zoomed out (engine/ring.ts, docs/web-architecture.md, "Ring of type"),
 * built from the site's identity.
 *
 * Decorative (the ring is `aria-hidden`; none of this is the page's content) and one place only: the app's `SITE` constant (`lib/site.ts`) is
 * the single source of who the site is, and the component that mounts the globe (`routes/shell.tsx`) hands the phrases in through
 * `GlobeProps.ringPhrases`; the engine takes them as a plain string (`createHandover({ ringText })`) so that `engine/` never knows who the site
 * is, and this folder imports nothing from the rest of the app (`layering.test.ts`): the identity is a structural type here, not an import.
 * Capitals, the separator (a middle dot, `RING.separator`) and the dot that closes the loop are applied by `ringText` in the engine.
 */

import { ringText } from "./engine/ring";

/** What the ring needs of the site's identity (a structural subset of `SITE` in `lib/site.ts`). */
export interface RingIdentity {
  /** The owner's name. */
  name: string;
  /** What the owner does. */
  role: string;
  /** Where. */
  location: string;
  /** The fields, in the owner's order, separated by commas ("A, b and c, d"): each one is a phrase of the ring. */
  speciality: string;
}

/**
 * The most letters the line may have (spaces and separators included): the line goes round the ring a whole number of times (`ringLayout`) at about
 * 11 px a letter, so it closes well, with letters near their size and a tracking near the nominal, between about 100 and 130 letters (on a 390 px phone
 * the ring is 770 px round: 130 letters of 0.74 em at 9.4 px; at 165 they shrink to 7.9 px, and on a laptop the line fits neither one turn nor two).
 */
export const RING_LINE_BUDGET = 130;

/**
 * The phrases of the ring, in reading order: the name, the role, the specialities in the owner's order, the place. Blank parts are left out, and when the
 * line would be longer than `budget` letters the last specialities are left off (never the name, the role or the place).
 */
export function ringPhrases(id: RingIdentity, budget: number = RING_LINE_BUDGET): string[] {
  const clean = (list: readonly string[]) => list.map((p) => p.trim()).filter((p) => p.length > 0);
  const specialities = clean(id.speciality.split(","));
  const build = (n: number) => clean([id.name, id.role, ...specialities.slice(0, n), id.location]);
  let n = specialities.length;
  while (n > 0 && ringText(build(n)).length > budget) n--;
  return build(n);
}
