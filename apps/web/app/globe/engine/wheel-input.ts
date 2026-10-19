/**
 * Wheel and Safari gesture input of a map, the Apple Maps way (the classification is `engine/wheel.ts`): a pinch and a mouse wheel ZOOM about the pointer, a
 * two-finger swipe PANS. One router for the globe canvas (`engine/controls.ts`) and the standalone street map (`street/engine.ts`).
 *
 * `wheel` is listened to with `passive: false` and ALWAYS `preventDefault`ed on the element it is attached to: over the map the page neither scrolls nor goes
 * back on a horizontal swipe. It is attached to the map's own canvas, never to the document, so the hero's panels, the lists and the page keep their native scroll
 * wherever the pointer is not on the map. Safari's `gesturestart` / `gesturechange` / `gestureend` (a trackpad pinch there; there is no ctrl-wheel) are
 * handled the same way, with the pinch's cumulative `scale` turned into steps.
 */
import { inputDebug, inputKindOverride } from "./wheel-debug";
import { PENDING_MS, STREAM_GAP_MS, WheelClassifier, swipePan, zoomStep, type WheelSample } from "./wheel";
import type { DragSample } from "./motion";

export interface WheelHandlers {
  /** A stream or a gesture starts: cancel flights and inertia. */
  begin(): void;
  /** Zoom by `dLog2` levels (positive in) about the client point. */
  zoom(dLog2: number, clientX: number, clientY: number): void;
  /** A swipe's step, as the drag of the content under the fingers, CSS px (the same sign as a pointer drag's `dx`, `dy`). */
  pan(dx: number, dy: number): void;
  /** A swipe went quiet: its last steps, for an inertia where the device gave none. Optional. */
  panEnd?(samples: readonly DragSample[], now: number): void;
}

/** How long a swipe may be quiet before it has ended (shorter than a stream: the momentum events of a trackpad come every frame). */
const SWIPE_END_MS = 70;

interface GestureEventLike extends Event {
  scale: number;
  clientX: number;
  clientY: number;
}

export function attachWheelInput(el: HTMLElement, handlers: WheelHandlers, timers: Pick<Window, "setTimeout" | "clearTimeout"> = window): () => void {
  const classifier = new WheelClassifier();
  const debug = inputDebug();
  let pending: { sample: WheelSample; x: number; y: number } | null = null;
  let pendingTimer = 0;
  let endTimer = 0;
  let swipeSamples: DragSample[] = [];
  let lastT = Number.NEGATIVE_INFINITY;
  let gestureScale = 0;

  const apply = (kind: "pinch" | "wheel" | "swipe", s: WheelSample, x: number, y: number, reason: string) => {
    if (kind === "swipe") {
      const p = swipePan(s);
      debug?.log({ kind, reason, sample: s, pan: [p.dx, p.dy], t: s.t });
      swipeSamples.push({ t: s.t, dx: p.dx, dy: p.dy });
      if (swipeSamples.length > 8) swipeSamples.shift();
      handlers.pan(p.dx, p.dy);
      timers.clearTimeout(endTimer);
      endTimer = timers.setTimeout(() => {
        const last = swipeSamples.at(-1);
        const samples = swipeSamples;
        swipeSamples = [];
        if (last) handlers.panEnd?.(samples, last.t);
      }, SWIPE_END_MS);
      return;
    }
    const d = zoomStep(s, kind);
    debug?.log({ kind, reason, sample: s, zoom: d, t: s.t });
    handlers.zoom(d, x, y);
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    // Safari: a pinch is `gesture*` events; a stray wheel in the middle of one is not a second input.
    if (gestureScale > 0) return;
    const legacy = (e as WheelEvent & { wheelDeltaY?: number }).wheelDeltaY;
    const s: WheelSample = { t: e.timeStamp, dx: e.deltaX, dy: e.deltaY, mode: e.deltaMode, ctrl: e.ctrlKey, wheelDy: typeof legacy === "number" ? legacy : undefined };
    if (s.t - lastT > STREAM_GAP_MS) {
      swipeSamples = [];
      handlers.begin();
    }
    lastT = s.t;
    const declared = s.ctrl ? null : inputKindOverride();
    const v = declared ? { kind: declared, reason: `declared by sessionStorage["input-kind"]` } : classifier.classify(s);
    if (v.kind === "pending") {
      pending = { sample: s, x: e.clientX, y: e.clientY };
      timers.clearTimeout(pendingTimer);
      pendingTimer = timers.setTimeout(() => {
        const p = pending;
        pending = null;
        if (!p) return;
        const r = classifier.timeout();
        if (r.kind !== "pending") apply(r.kind, p.sample, p.x, p.y, r.reason);
      }, PENDING_MS);
      return;
    }
    if (pending) {
      const p = pending;
      pending = null;
      timers.clearTimeout(pendingTimer);
      apply(v.kind, p.sample, p.x, p.y, v.reason);
    }
    apply(v.kind, s, e.clientX, e.clientY, v.reason);
  };

  const onGestureStart = (e: Event) => {
    e.preventDefault();
    gestureScale = 1;
    handlers.begin();
  };
  const onGestureChange = (e: Event) => {
    e.preventDefault();
    const g = e as GestureEventLike;
    if (!(gestureScale > 0) || !(g.scale > 0)) return;
    const d = Math.log2(g.scale / gestureScale);
    gestureScale = g.scale;
    debug?.log({ kind: "gesture", reason: `Safari gesturechange scale ${g.scale.toFixed(3)}`, zoom: d, t: g.timeStamp });
    if (d) handlers.zoom(d, g.clientX, g.clientY);
  };
  const onGestureEnd = (e: Event) => {
    e.preventDefault();
    gestureScale = 0;
  };

  const opts: AddEventListenerOptions = { passive: false };
  el.addEventListener("wheel", onWheel, opts);
  el.addEventListener("gesturestart", onGestureStart, opts);
  el.addEventListener("gesturechange", onGestureChange, opts);
  el.addEventListener("gestureend", onGestureEnd, opts);
  return () => {
    el.removeEventListener("wheel", onWheel, opts);
    el.removeEventListener("gesturestart", onGestureStart, opts);
    el.removeEventListener("gesturechange", onGestureChange, opts);
    el.removeEventListener("gestureend", onGestureEnd, opts);
    timers.clearTimeout(pendingTimer);
    timers.clearTimeout(endTimer);
  };
}
