/**
 * Pointer controls for the canvas, the Apple Maps way: drag to rotate (with inertia handled by the host), tap or click to select, and
 *   - a PINCH and a SPREAD zoom, about the midpoint of the fingers (two pointers on a touch screen; a trackpad's pinch arrives as `wheel` with `ctrlKey`,
 *     and in Safari as `gesture*` events: `engine/wheel-input.ts`);
 *   - a classic mouse wheel zooms about the cursor;
 *   - a two-finger SWIPE on a trackpad PANS like a drag (and lets go like one: inertia where the device gave none), never zooms.
 * Which of the wheel's devices is which is `engine/wheel.ts`. There is deliberately no keyboard handling: the canvas is not focusable and the place list is
 * the accessible path.
 *
 * `touch-action: none` and `overscroll-behavior: none` are set on the canvas only, and the wheel is `preventDefault`ed on the canvas only, so a finger or a
 * wheel that starts anywhere else (list, panel, page) still scrolls normally, and over the map the page neither scrolls nor goes back on a swipe.
 */
import { attachWheelInput } from "./wheel-input";
import { inputDebug } from "./wheel-debug";
import { warmHover } from "./hover-warm";
import type { DragSample } from "./motion";

export type PointerKind = "mouse" | "touch";

export interface ControlsHost {
  /** A new gesture started: cancel flights and inertia. */
  stopMotion(): void;
  panPixels(dx: number, dy: number): void;
  /** Zoom by `dLog2` zoom levels (positive zooms in), keeping the point under the container-relative CSS-px point (x, y) where it is on the screen. */
  zoomAt(dLog2: number, x: number, y: number): void;
  fling(samples: readonly DragSample[], now: number): void;
  /** Place under a container-relative CSS-px point (labels first, then markers), or null. */
  pickAt(x: number, y: number, kind: PointerKind): string | null;
  select(slug: string): void;
  /** The mouse is over this node (a group is highlighted) or over nothing (null); mouse only, never while a button is down. */
  hover?(slug: string | null): void;
}

const TAP_SLOP: Record<PointerKind, number> = { mouse: 4, touch: 8 };
const kindOf = (e: PointerEvent): PointerKind => (e.pointerType === "touch" ? "touch" : "mouse");

interface Drag {
  moved: number;
  samples: DragSample[];
  /** A second pointer joined at some point: never a tap, never a fling. */
  multi: boolean;
}

export function attachControls(canvas: HTMLCanvasElement, container: HTMLElement, host: ControlsHost): () => void {
  const pointers = new Map<number, { x: number; y: number }>();
  let drag: Drag | null = null;
  let pinchDist = 0;
  let pinchMid = { x: 0, y: 0 };
  let pinchTotal = 0;
  const cleanups: (() => void)[] = [];
  // The first layout change after the first mouse move blocks a macOS renderer for 30 ms once (engine/hover-warm.ts): take it before the first drag.
  cleanups.push(warmHover(canvas.ownerDocument.defaultView ?? canvas, canvas.ownerDocument as never));

  const on = <K extends keyof HTMLElementEventMap>(
    type: K,
    fn: (e: HTMLElementEventMap[K]) => void,
    opts?: AddEventListenerOptions,
  ) => {
    canvas.addEventListener(type, fn as EventListener, opts);
    cleanups.push(() => canvas.removeEventListener(type, fn as EventListener, opts));
  };

  const local = (e: MouseEvent) => {
    const r = container.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const pinchDistance = () => {
    const [a, b] = [...pointers.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  /** The midpoint of the first two pointers, client px. */
  const midpoint = () => {
    const [a, b] = [...pointers.values()];
    return a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : { x: 0, y: 0 };
  };
  const toLocal = (clientX: number, clientY: number) => {
    const r = container.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  };

  on("pointerdown", (e) => {
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // The pointer may already be gone; the gesture still works without capture.
    }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    host.stopMotion();
    if (pointers.size === 1) drag = { moved: 0, samples: [], multi: false };
    if (pointers.size === 2) {
      pinchDist = pinchDistance();
      pinchMid = midpoint();
      pinchTotal = 0;
      if (drag) drag.multi = true;
    }
    if (e.pointerType === "mouse") canvas.style.cursor = "grabbing";
  });

  on("pointermove", (e) => {
    const prev = pointers.get(e.pointerId);
    if (!prev) {
      if (e.pointerType === "mouse") {
        const p = local(e);
        const hit = host.pickAt(p.x, p.y, "mouse");
        canvas.style.cursor = hit ? "pointer" : "grab";
        host.hover?.(hit);
      }
      return;
    }
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size >= 2) {
      const dist = pinchDistance();
      const mid = midpoint();
      // About where the fingers were (so the point between them stays between them), then with the fingers' midpoint as a drag.
      if (pinchDist > 0 && dist > 0) {
        const p = toLocal(pinchMid.x, pinchMid.y);
        // The exact ratio of the fingers' distance, no damping and no gain: a physical pinch.
        const d = Math.log2(dist / pinchDist);
        pinchTotal += d;
        inputDebug()?.log({ kind: "touch", reason: `two pointers, distance ${pinchDist.toFixed(0)} -> ${dist.toFixed(0)} px`, zoom: d, cum: pinchTotal, t: e.timeStamp });
        host.zoomAt(d, p.x, p.y);
      }
      host.panPixels(mid.x - pinchMid.x, mid.y - pinchMid.y);
      pinchDist = dist;
      pinchMid = mid;
      return;
    }
    if (!drag) return;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    drag.samples.push({ t: e.timeStamp, dx, dy });
    if (drag.samples.length > 8) drag.samples.shift();
    host.panPixels(dx, dy);
  });

  const end = (e: PointerEvent) => {
    if (!pointers.delete(e.pointerId)) return;
    pinchDist = 0;
    if (e.pointerType === "mouse") canvas.style.cursor = "grab";
    // A finger lifted while another is still down: the remaining one must not start a drag from the pinch.
    if (pointers.size > 0 || !drag) return;
    const d = drag;
    drag = null;
    if (e.type !== "pointerup" || d.multi) return;
    const kind = kindOf(e);
    if (d.moved <= TAP_SLOP[kind]) {
      const p = local(e);
      const slug = host.pickAt(p.x, p.y, kind);
      if (slug) host.select(slug);
    } else {
      host.fling(d.samples, e.timeStamp);
    }
  };
  on("pointerup", end);
  on("pointercancel", end);
  on("pointerleave", (e) => {
    if (e.pointerType === "mouse" && !pointers.has(e.pointerId)) host.hover?.(null);
  });

  canvas.style.overscrollBehavior = "none";
  cleanups.push(
    attachWheelInput(canvas, {
      begin: () => host.stopMotion(),
      zoom: (d, clientX, clientY) => {
        const p = toLocal(clientX, clientY);
        host.zoomAt(d, p.x, p.y);
      },
      pan: (dx, dy) => host.panPixels(dx, dy),
      panEnd: (samples, now) => host.fling(samples, now),
    }),
  );

  return () => {
    for (const c of cleanups) c();
    cleanups.length = 0;
    pointers.clear();
  };
}
