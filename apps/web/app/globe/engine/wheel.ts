/**
 * Which device a `wheel` event comes from (pure, unit tested in `wheel.test.ts` with recorded-shape streams per device): the map follows Apple Maps.
 *
 *   pinch   a trackpad pinch (browsers send it as `wheel` with `ctrlKey`) or Safari's `gesturechange`: ZOOMS, about the pinch's midpoint.
 *   wheel   a classic mouse wheel (discrete notches): ZOOMS, about the cursor.
 *   swipe   a two-finger swipe on a trackpad, a Magic Mouse's surface, a precision touchpad: PANS the map, never zooms.
 *
 * A browser does not say which device an event is from, so it is a heuristic: per event what is certain, per STREAM what is not, and a safe default (a
 * swipe pans: the one wrong answer that must not happen is a trackpad swipe that zooms). A stream is the run of events with less than `STREAM_GAP_MS`
 * between two of them; its kind is decided ONCE, by its first event (or its second, see below) and kept until `STREAM_GAP_MS` of silence.
 *
 * First event of a stream, in this order (the first line that matches decides):
 *
 *   1. `ctrlKey`                    a pinch. Unless it looks like a notch (rules 2 to 4): ctrl + mouse wheel (the browser's own page zoom gesture) zooms as a wheel.
 *   2. `deltaMode` line or page     a wheel (Firefox on Windows and Linux: 3 lines a notch). A trackpad always reports pixels.
 *   3. `wheelDeltaY` a nonzero multiple of 120 with no `deltaX`
 *                                   a wheel (Chrome on Windows, Linux, and Chrome's synthetic input: `Input.dispatchMouseEvent`). One notch is 120 legacy units
 *                                   whatever `deltaY` says (100 on Windows, 53 on Linux, 66.67 at 150 % scaling): a notch does not need `deltaY` to be round.
 *                                   Not when `wheelDeltaY` is exactly -3 `deltaY` and `deltaY` is under 60: that is how macOS Chrome reports a trackpad's small steps.
 *   4. `deltaY` a nonzero multiple of 4.000244140625 and no `deltaX`
 *                                   a wheel (macOS Chrome's mouse wheel; the number maps use for it).
 *   5. a fractional delta           a swipe (a mouse never sends one except by rule 3's scaling): macOS Safari and Chrome trackpads, momentum.
 *   6. any `deltaX`                 a swipe (a wheel has no horizontal axis).
 *   7. `|delta|` under 4            a swipe (so small only a finger on a surface gives it).
 *   8. otherwise AMBIGUOUS: a whole-number delta of 4 or more, with nothing else to tell. `pending` is returned and the event is held back for `PENDING_MS`:
 *        - no second event in that time: it was one notch of a wheel (an isolated event; a swipe does not come alone): `wheel`, applied late by 40 ms;
 *        - a second event: `|dt * delta| < 200` is a swipe (small steps in quick succession), else a wheel (the rule maps use).
 *
 * The cases, what each device sends, and the rule that settles it (what each row says of a real device is from documentation and bug reports and was NOT checked on
 * the hardware: see docs/web-architecture.md, "Input model"; the shapes are in the test):
 *
 *   | Device, browser                          | deltaMode | deltaX | deltaY                             | wheelDeltaY | cadence                   | Rule       | Kind  |
 *   | ---------------------------------------- | --------- | ------ | ---------------------------------- | ----------- | ------------------------- | ---------- | ----- |
 *   | Mouse wheel, Chrome/Edge, Windows        | 0         | 0      | +-100 (66.67 at 150 %)             | -+120       | a notch at a time         | 3          | wheel |
 *   | Mouse wheel, Chrome, Linux               | 0         | 0      | +-53                               | -+120       | a notch at a time         | 3          | wheel |
 *   | Mouse wheel, Firefox, Windows / Linux    | 1         | 0      | +-3 (lines)                        | -+120       | a notch at a time         | 2          | wheel |
 *   | Mouse wheel, Chrome, macOS               | 0         | 0      | k * 4.000244140625                 | -3 deltaY   | a notch at a time         | 4 (or 8)   | wheel |
 *   | Mouse wheel, Safari / Firefox, macOS     | 0         | 0      | whole numbers, 4 and up            | -3 deltaY   | a notch at a time         | 8          | wheel |
 *   | Trackpad two-finger swipe, Chrome, macOS | 0         | any    | 1, 2, 5, ... fractions, momentum   | -3 deltaY   | 60 Hz, ramps up, decays   | 5, 6 or 7  | swipe |
 *   | Trackpad two-finger swipe, Safari, macOS | 0         | any    | fractions, momentum                | -3 deltaY   | 60 Hz, ramps up, decays   | 5, 6 or 7  | swipe |
 *   | Trackpad two-finger swipe, Firefox, macOS| 0         | any    | whole numbers, momentum            | 0 or -3 dY  | 60 Hz, ramps up, decays   | 6, 7 or 8  | swipe |
 *   | Magic Mouse, any browser, macOS          | 0         | any    | as the trackpad                    | -3 deltaY   | as the trackpad           | 5, 6, 7    | swipe |
 *   | Precision touchpad, Chrome/Edge, Windows | 0         | any    | whole numbers, no momentum         | not x120    | 60 Hz while the fingers move | 6, 7 or 8 | swipe |
 *   | Trackpad pinch, Chrome/Edge/Firefox      | 0         | 0      | small, fractional, signed          | any         | 60 Hz                     | 1          | pinch |
 *   | Ctrl + mouse wheel                       | 0 or 1    | 0      | as the mouse wheel                 | -+120       | a notch at a time         | 1 then 2-4 | wheel |
 *   | Trackpad pinch, Safari                   | no `wheel` event: `gesturestart` / `gesturechange` / `gestureend` with a cumulative `scale` (wheel-input.ts)            | pinch |
 *   | Two-finger pinch on a touch screen       | pointer events, not `wheel` (engine/controls.ts)                                                                       | pinch |
 *
 * What it gets wrong, on purpose: an unknown mouse that reports whole numbers and fast bursts of them in the same breath as a trackpad (rule 8: a wheel spun
 * very fast on macOS Safari/Firefox, whose bursts look like a slow swipe) pans instead of zooming; the cure is a notch of its own signature (rules 2 to 4) or ctrl.
 */
export type WheelKind = "pinch" | "wheel" | "swipe";

export interface WheelSample {
  /** The event's timestamp, ms (`Event.timeStamp`). */
  t: number;
  dx: number;
  dy: number;
  /** `WheelEvent.deltaMode`: 0 pixels, 1 lines, 2 pages. */
  mode: number;
  ctrl: boolean;
  /** The legacy `wheelDeltaY` (absent where the browser has none). */
  wheelDy?: number;
}

export interface WheelVerdict {
  kind: WheelKind | "pending";
  /** Why, short: shown by the debug overlay (`?input-debug`). */
  reason: string;
}

/** No wheel event for this long ends a stream: the next event starts a new one and is classified afresh. */
export const STREAM_GAP_MS = 300;
/** How long an ambiguous first event is held back, waiting for a second one. */
export const PENDING_MS = 40;
/** macOS Chrome's mouse wheel reports `deltaY` in multiples of this. */
export const MAC_TICK = 4.000244140625;
/** A pixel delta smaller than this is a finger on a surface. */
export const SMALL_DELTA = 4;

/** Zoom levels for a pixel of wheel (`wheel`) and of pinch (`pinch`, `deltaY` with `ctrlKey` is small and signed): the tuned speeds of the zoom since the first version. */
export const WHEEL_ZOOM_PER_PX = 0.0016;
/**
 * Zoom levels per pixel of a pinch's `deltaY` (the ctrl-wheel a trackpad pinch arrives as). TUNABLE, one constant (`?pinch-rate=N` on a `?input-debug` page tries another).
 *
 * Calibration. Chromium synthesizes the pinch's wheel as `deltaY = -100 * ln(scale)` (the 2015 code review that added it: "zooming in 2x is about -70"; the
 * inverse the PDF viewer uses is `exp(-deltaY / 100)`), so a physical pinch is `log2(scale) = -deltaY / (100 ln 2) = 0.0144` levels a pixel: fingers 3 cm to
 * 6 cm = about 69 px = one level. maplibre-gl's own trackpad rate (1/100 of `deltaY` through a logistic: 0.0072 levels a px) and d3-zoom's (0.02 ln units a px
 * with ctrl: 0.029) bracket it. 0.012 was 0.83 of physical and felt dead (owner, 2026-10-19: a trackpad is 5 cm across, a pinch covers little of it).
 * Apple Maps amplifies: 2.5 times the physical rate, 0.036, so one hand-span pinch is 2 to 3 levels. Touch pointers and Safari's `gesturechange` are
 * NOT amplified: they use the exact ratio of the fingers' distance, `log2(d / d_prev)`, `log2(scale / scale_prev)`.
 */
export const PINCH_ZOOM_RATE = 0.4;
/** A line of a `deltaMode` 1 wheel and a page of a `deltaMode` 2 one, in pixels. */
export const LINE_PX = 33;
export const PAGE_PX = 400;
/** No single event zooms more than this many levels. */
export const MAX_ZOOM_STEP = 0.75;
/** ... of one pinch event (a fast pinch sends deltaY of 20 or more in a frame). */
export const MAX_PINCH_STEP = 4;

const nearInt = (v: number) => Math.abs(v - Math.round(v)) < 1e-9;

/** A nonzero multiple of 120 in `wheelDeltaY`, with no horizontal movement: the notch of a classic wheel (and not macOS's -3 times a small trackpad step). */
function isNotch(s: WheelSample): boolean {
  if (s.dx !== 0 || s.wheelDy === undefined || s.wheelDy === 0 || s.dy === 0) return false;
  if (!nearInt(s.wheelDy / 120)) return false;
  return !(Math.abs(s.wheelDy) === 3 * Math.abs(s.dy) && Math.abs(s.dy) < 60);
}

/** `deltaY` a nonzero multiple of macOS Chrome's wheel tick. */
export function isMacTick(dy: number): boolean {
  if (dy === 0) return false;
  const k = dy / MAC_TICK;
  return Math.abs(k) >= 0.5 && Math.abs(k - Math.round(k)) < 1e-6;
}

export class WheelClassifier {
  private last = Number.NEGATIVE_INFINITY;
  private kind: WheelKind | null = null;
  private first: WheelSample | null = null;

  /** Classify an event. `pending`: ambiguous, hold it and call `timeout()` after `PENDING_MS` unless another event comes first (it then settles both). */
  classify(s: WheelSample): WheelVerdict {
    // A pinch (or ctrl + a wheel) is decided per event: it has no stream.
    if (s.ctrl) {
      if (s.mode !== 0) return { kind: "wheel", reason: "ctrl + deltaMode line/page: mouse wheel" };
      // (a notch signature is NOT trusted with ctrl: a real pinch can land on a multiple of 120 or 4.0002, and the wheel branch would zoom it 20 times slower)
      return { kind: "pinch", reason: "ctrlKey: trackpad pinch" };
    }
    if (s.t - this.last > STREAM_GAP_MS) {
      this.kind = null;
      this.first = null;
    }
    this.last = s.t;
    if (this.kind) return { kind: this.kind, reason: `stream: ${this.kind}` };
    if (this.first) {
      // The second event of an ambiguous stream.
      const dt = s.t - this.first.t;
      const v = Math.max(Math.abs(s.dy), Math.abs(s.dx));
      this.first = null;
      if (s.dx !== 0 || !nearInt(s.dy) || Math.abs(dt * v) < 200) return this.decide("swipe", `second event ${dt.toFixed(0)} ms later: small steps in a row`);
      return this.decide("wheel", `second event ${dt.toFixed(0)} ms later: large and whole`);
    }
    if (s.mode !== 0) return this.decide("wheel", "deltaMode line/page: mouse wheel");
    if (isNotch(s)) return this.decide("wheel", "wheelDeltaY x120: mouse wheel notch");
    if (s.dx === 0 && isMacTick(s.dy)) return this.decide("wheel", "deltaY x4.0002: mouse wheel tick");
    if (!nearInt(s.dy) || !nearInt(s.dx)) return this.decide("swipe", "fractional delta: trackpad");
    if (s.dx !== 0) return this.decide("swipe", "deltaX: two-finger swipe");
    if (Math.abs(s.dy) < SMALL_DELTA) return this.decide("swipe", `|deltaY| < ${SMALL_DELTA}: finger on a surface`);
    this.first = s;
    return { kind: "pending", reason: "whole number, no signature: waiting for a second event" };
  }

  /** `PENDING_MS` passed with no second event: it was alone, a notch of a wheel. */
  timeout(): WheelVerdict {
    if (!this.first) return { kind: this.kind ?? "swipe", reason: "no pending event" };
    this.first = null;
    return this.decide("wheel", "isolated event: one notch of a wheel");
  }

  /** The state is dropped: the next event starts a stream. */
  reset(): void {
    this.last = Number.NEGATIVE_INFINITY;
    this.kind = null;
    this.first = null;
  }

  private decide(kind: WheelKind, reason: string): WheelVerdict {
    this.kind = kind;
    return { kind, reason };
  }
}

/** The step in zoom levels (positive = in) of one event of a `wheel` or a `pinch`. */
export function zoomStep(s: WheelSample, kind: "wheel" | "pinch", pinchRate = PINCH_ZOOM_RATE): number {
  const unit = s.mode === 1 ? LINE_PX : s.mode === 2 ? PAGE_PX : 1;
  let d: number;
  if (kind === "pinch") d = -s.dy * unit * pinchRate;
  // A tick of macOS Chrome's wheel is 4 px: one notch is worth what a 100 px notch is elsewhere.
  else if (s.mode === 0 && s.dx === 0 && isMacTick(s.dy) && !isNotch(s)) d = (-s.dy / MAC_TICK) * 100 * WHEEL_ZOOM_PER_PX;
  else d = -s.dy * unit * WHEEL_ZOOM_PER_PX;
  const cap = kind === "pinch" ? MAX_PINCH_STEP : MAX_ZOOM_STEP;
  return Math.max(-cap, Math.min(cap, d));
}

/** A swipe's movement as a drag's: the content follows the fingers (a positive `deltaY` is a scroll down: the content goes up), in CSS px. */
export function swipePan(s: WheelSample): { dx: number; dy: number } {
  const unit = s.mode === 1 ? LINE_PX : s.mode === 2 ? PAGE_PX : 1;
  return { dx: 0 - s.dx * unit, dy: 0 - s.dy * unit };
}
