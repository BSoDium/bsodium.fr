/**
 * The caption's quality governor (docs/performance.md, "Hitches"): pure decisions, no DOM, time is passed in. The caption's rAF loop feeds it one
 * sample per display frame it drew (the time since the previous frame and the draw's JS time) and it answers which rung of
 * `CAPTION_LOAD.ladder` to draw at. Smoothness comes first: the caption is drawn on every display frame while it moves; a rung is given up only when
 * a real overload shows (more than `lateShare` of the frames late over `windowMs`), in the order slices, pixel ratio, then every second frame, and
 * taken back one rung at a time after `upAfterMs` of calm.
 *
 * The display's period is derived, never assumed: the median of the first `periodSamples` deltas (16.7 ms at 60 Hz, 8.3 at 120, 6.9 at 144). A frame
 * at a rung that skips frames is expected `skip` periods after the last. Deltas over `stallMs` (a background tab's throttled rAF, a window that lost
 * focus, the machine asleep) are not samples and restart the window: they are not overload.
 */
import { CAPTION_LOAD } from "./tuning";

export interface LoadRung {
  /** Draw every `skip`th display frame (1: every one). */
  skip: number;
  /** The most the second canvas is drawn at. */
  dpr: number;
  /** The most slices of the thickness. */
  slices: number;
}

export class QualityGovernor {
  /** Index into `CAPTION_LOAD.ladder`: 0 is the best. */
  level = 0;
  /** The display's period, ms, once derived (null before). */
  period: number | null = null;
  private first: number[] = [];
  private late: number[] = [];
  private times: number[] = [];
  private lastChange = -Infinity;
  private calmSince = -1;

  constructor(private cfg: typeof CAPTION_LOAD = CAPTION_LOAD) {}

  get rung(): LoadRung {
    return this.cfg.ladder[this.level]!;
  }

  /** Forget the window (a new showing, a resize, the page coming back: the old samples say nothing about the present); the derived period stays. */
  reset(now: number): void {
    this.late.length = 0;
    this.times.length = 0;
    this.calmSince = -1;
    this.lastChange = now;
  }

  /** Forget the display too (the window moved to another screen). */
  forgetDisplay(now: number): void {
    this.period = null;
    this.first.length = 0;
    this.reset(now);
  }

  /** The fraction of the frames in the window that were late (checks and the overlay). */
  get lateShare(): number {
    return this.late.length ? this.late.reduce((a, b) => a + b, 0) / this.late.length : 0;
  }

  /**
   * One drawn frame at time `now`: `delta` ms since the previous drawn frame, `jsMs` the draw's JS time. Returns the new level when it changed.
   */
  sample(now: number, delta: number, jsMs: number): number | null {
    const c = this.cfg;
    if (delta >= c.stallMs) {
      this.reset(now);
      return null;
    }
    if (this.period === null) {
      // the first frames say what the display is: the median of their deltas (the rung 0 draws every frame, so a delta is a period)
      if (delta > 3 && delta < 40) this.first.push(delta);
      if (this.first.length >= c.periodSamples) {
        const s = [...this.first].sort((a, b) => a - b);
        this.period = s[Math.floor(s.length / 2)]!;
      }
      return null;
    }
    const expected = this.period * this.rung.skip;
    const isLate = delta > c.lateRatio * expected || jsMs > c.jsShare * expected ? 1 : 0;
    this.late.push(isLate);
    this.times.push(now);
    while (this.times.length && now - this.times[0]! > c.windowMs) {
      this.times.shift();
      this.late.shift();
    }
    if (this.times.length < c.minSamples) return null;
    const share = this.lateShare;
    if (share > c.lateShare && this.level < c.ladder.length - 1 && now - this.lastChange >= c.downPauseMs) {
      this.level++;
      this.lastChange = now;
      this.late.length = 0;
      this.times.length = 0;
      this.calmSince = -1;
      return this.level;
    }
    if (share <= c.calmShare) {
      if (this.calmSince < 0) this.calmSince = now;
      if (this.level > 0 && now - this.calmSince >= c.upAfterMs && now - this.lastChange >= c.upAfterMs) {
        this.level--;
        this.lastChange = now;
        this.late.length = 0;
        this.times.length = 0;
        this.calmSince = -1;
        return this.level;
      }
    } else this.calmSince = -1;
    return null;
  }
}
