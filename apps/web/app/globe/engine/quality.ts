/**
 * The caption's quality governor (docs/performance.md, "Hitches"): pure decisions, no DOM, time is passed in. The caption's own loop feeds it
 * one sample per drawn frame (how long since the previous frame was due against what was asked, and the JS time of the draw); it answers which
 * rung of `CAPTION_LOAD.ladder` the caption should be on. A frame loop that cannot keep up (a slow GPU, a busy main thread, a big window) shows as
 * intervals longer than the period it asked for: the governor steps DOWN quickly (a second or two) and back UP slowly (several seconds of headroom),
 * never twice in a row without a pause (hysteresis), and never above rung 0 or below the last rung.
 *
 * The order of the ladder is the owner's: the caption's frame rate first (it moves 3 degrees a second: 20 and 15 a second look the same), then
 * the canvas's pixel ratio (the glyphs are large), then the thickness's slice count (it is solid: fewer slices are a coarser step along an edge-on side).
 */
import { CAPTION_LOAD } from "./tuning";

export interface QualityRung {
  /** Least time between two caption frames, ms. */
  frameMs: number;
  /** The most the second canvas is drawn at. */
  dpr: number;
  /** Slices of the thickness. */
  slices: number;
}

export class QualityGovernor {
  /** Index into `CAPTION_LOAD.ladder`: 0 is the best. */
  level = 0;
  private ratios: number[] = [];
  private times: number[] = [];
  private lastChange = -Infinity;
  private calmSince = -1;

  constructor(private cfg: typeof CAPTION_LOAD = CAPTION_LOAD) {}

  get rung(): QualityRung {
    return this.cfg.ladder[this.level]!;
  }

  /** Forget the window (a new showing, a resize, the page coming back): old samples say nothing about the present. */
  reset(now: number): void {
    this.ratios.length = 0;
    this.times.length = 0;
    this.calmSince = -1;
    this.lastChange = now;
  }

  /**
   * One drawn frame: `interval` ms since the previous one, `target` ms it was asked to be, `jsMs` the draw's own JS time. Returns the new level when
   * it changed, else null.
   */
  sample(now: number, interval: number, target: number, jsMs: number): number | null {
    const c = this.cfg;
    // (a late timer and a slow draw both count: the ratio of what happened to what was asked, the draw's own time against its share of the period)
    const ratio = Math.max(interval / target, (jsMs * c.jsShare) / target);
    this.ratios.push(ratio);
    this.times.push(now);
    while (this.times.length && now - this.times[0]! > c.windowMs) {
      this.times.shift();
      this.ratios.shift();
    }
    if (this.times.length < c.minSamples) return null;
    const sorted = [...this.ratios].sort((a, b) => a - b);
    const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]!;
    if (q(0.75) > c.downRatio && this.level < c.ladder.length - 1 && now - this.lastChange >= c.downPauseMs) {
      this.level++;
      this.lastChange = now;
      this.ratios.length = 0;
      this.times.length = 0;
      this.calmSince = -1;
      return this.level;
    }
    if (q(0.9) < c.upRatio) {
      if (this.calmSince < 0) this.calmSince = now;
      if (this.level > 0 && now - this.calmSince >= c.upAfterMs && now - this.lastChange >= c.upAfterMs) {
        this.level--;
        this.lastChange = now;
        this.ratios.length = 0;
        this.times.length = 0;
        this.calmSince = -1;
        return this.level;
      }
    } else this.calmSince = -1;
    return null;
  }
}
