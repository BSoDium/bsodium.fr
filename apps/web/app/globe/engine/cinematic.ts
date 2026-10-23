import { seededUnit, type CinematicPlan } from "./caption";
import { markPlayed, sessionStores, visitState } from "./visit";

/**
 * The caption's rare cinematic interlude (an easter egg, issue #293), after the studio logo's opening: once in a long while every line leaves
 * round the orbit (the caption's own orbit exit), the stage stays empty for a beat, and ONE big word, twice the size of the others and centred on
 * the equator, rises out of the planet's shadow from the west, slowly, settles for a long time, and goes on round the far side; then the usual
 * showing begins again from its first phrase set. The word is decoration: the caption is hidden from assistive technology, the real copy is in
 * the page, and nothing changes in the layout.
 *
 * It costs nothing at rest: it runs in the caption's own 30 a second loop like the roll (`CaptionMotion.drifting`), with no timer, and it is
 * frozen like the roll by the energy pass's hold.
 *
 * When it may play (all of them): the visitor has been here before (a first visit would only be puzzled by it), motion is not reduced, it has not
 * played in this browser session, the page is not a debug one, and the session's seeded draw says so (`chance`). `?cinematic` (or sessionStorage
 * "cinematic" = "1") plays it at the end of the first cycle, whatever the rest says (not under reduced motion): for the owner and for captures.
 */
export const CINEMATIC = {
  /** The share of eligible sessions it plays in. */
  chance: 0.12,
  /**
   * The word, in the heavy serif and the caption's own colours, on a shell of its own: `radius` (the rows' is 1.25), a higher orbit, so that it
   * floats clear of the surface and curves round the limb like the studio's wordmark. Its cap height is as large as its chord allows
   * (`placeEgg`): at least `capScale` times the rows' (twice), at most `maxCapScale`, and its half width on the screen reaches `fill` of the
   * planet's silhouette radius at most (the rows' limit is 1.04: the word is on the equator, level with none of the page's text, so it may
   * overhang the disc's sides: the studio's wordmark is about 1.8 times as wide as its globe) and `maxHalfScreen` of the stage's width (a
   * phone's planet is nearly as wide as the screen: the word must not leave it).
   */
  word: "Universal",
  /**
   * The planet and the word lean to the left while the globe is pulled back (degrees, the north pole toward the left of the screen: the studio's
   * globe is tilted on its axis and its wordmark orbits on the same slant); it eases in and out with the pull-back.
   */
  tiltDeg: 12,
  /**
   * The letters are thicker than the caption's (a stroke in the face colour, caps: the script's own `embolden` is 0.05) and outlined in gold: the
   * outline only (the thickness stays the quiet tone of the other rows), a deeper gold on the light page and a paler one on the dark.
   */
  embolden: 0.07,
  gold: { light: "#a87a12", dark: "#e6c35c" },
  radius: 2,
  capScale: 2,
  maxCapScale: 6,
  fill: 1.85,
  maxHalfScreen: 0.47,
  /**
   * The timing (engine/caption.ts `EggShape`, ms): the rows leave in `leaveMs`, the stage is empty for `gapMs`, the word comes in in `enterMs` (a
   * long ease from `ease`: 1, against 2.2 for the regular rows, that lands at the roll's own speed), holds rolling through `ampDeg` for `holdMs`,
   * and leaves in `exitMs`. The globe pulls back by `zoomLevels` levels of zoom (0.7: to 62 % of its size, the word and the ring with it) over
   * the first `zoomInMs` and comes back over the last `zoomOutMs`, so that the wordmark is not the size of the page. All of it is over about 8.5 s after it begins, so that it is done before the idle hold (30 s) when it begins early.
   */
  shape: { leaveMs: 500, gapMs: 400, enterMs: 4600, ease: 1, holdMs: 2400, exitMs: 650, ampDeg: 2.5, zoomLevels: 0.7, zoomInMs: 2200, zoomOutMs: 2000, zoomCutMs: 700 },
  /** The side the word comes in from: west (-1), the way the planet turns, so it follows the surface round. */
  side: -1 as 1 | -1,
  /**
   * When it begins, as the number of cycles of the first showing that go by first (a cycle is 6.9 s): the second or the third time the first row
   * would leave, 13 to 20 s in (a visitor has settled, and it is over before the idle hold at 30 s).
   */
  cycles: [1, 2] as const,
} as const;

/**
 * The interlude's plan, or null: a pure function of the session's seed and what is known about the visit. `forced`: at the first row's first
 * exit, drawn or not (never under reduced motion).
 */
export function planCinematic(input: { seed: number; returning: boolean; played: boolean; reduced: boolean; forced?: boolean }): CinematicPlan | null {
  const { seed, returning, played, reduced, forced = false } = input;
  if (reduced) return null;
  const shape = { ...CINEMATIC.shape };
  if (forced) return { n: 0, shape, side: CINEMATIC.side };
  if (!returning || played) return null;
  const next = seededUnit((seed ^ 0x43494e45) | 0);
  next(); // (the first draw of a small seed is poorly mixed)
  if (next() >= CINEMATIC.chance) return null;
  const cycles = CINEMATIC.cycles;
  return { n: cycles[Math.min(cycles.length - 1, Math.floor(next() * cycles.length))]!, shape, side: CINEMATIC.side };
}

/** The page's own flag: `?cinematic` or sessionStorage "cinematic" = "1". */
export function cinematicForced(): boolean {
  try {
    return new URLSearchParams(location.search).has("cinematic") || sessionStorage.getItem("cinematic") === "1";
  } catch {
    return false;
  }
}

/** Debug pages (what the browser checks run in) never play it, unless it is asked for. */
function onDebugPage(): boolean {
  try {
    return new URLSearchParams(location.search).has("globe-debug") || sessionStorage.getItem("globe-debug") === "1";
  } catch {
    return false;
  }
}

/** The plan for this page load: what the layer is given. */
export function planForPage(seed: number, reduced: boolean): CinematicPlan | null {
  const { local, session } = sessionStores();
  const forced = cinematicForced();
  if (onDebugPage() && !forced) return null;
  return planCinematic({ seed, reduced, forced, ...visitState(local, session) });
}

/** The egg has begun: it will not play again in this browser session. */
export function notePlayed(): void {
  markPlayed(sessionStores().session);
}
