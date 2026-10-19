/**
 * `?input-debug` (or `sessionStorage["input-debug"] = "1"`): lists what the wheel classifier decided (engine/wheel.ts), for trying a device: a small
 * overlay in a corner with the last events (kind, why, the deltas), and the same entries in `window.__inputDebug` for the browser checks. Off otherwise: no
 * element, no array, no cost.
 */
import type { WheelKind, WheelSample } from "./wheel";

export interface InputLogEntry {
  /** `pinch`, `wheel`, `swipe`, `gesture` (Safari) or `touch` (two pointers). */
  kind: WheelKind | "gesture" | "touch";
  reason: string;
  sample?: WheelSample;
  /** What it did: a zoom step in levels, or a pan in px. */
  zoom?: number;
  /** Cumulative zoom change of the pinch in progress (levels). */
  cum?: number;
  /** Wheel events seen in the frame of this one (so far). */
  perFrame?: number;
  pan?: [number, number];
  t: number;
}

export interface InputDebug {
  log(entry: InputLogEntry): void;
}

declare global {
  interface Window {
    __inputDebug?: { entries: InputLogEntry[]; clear(): void };
  }
}

const MAX_ENTRIES = 400;
const SHOWN = 8;

export function inputDebugWanted(): boolean {
  try {
    return new URLSearchParams(location.search).has("input-debug") || sessionStorage.getItem("input-debug") === "1";
  } catch {
    return false;
  }
}

/**
 * Checks only (debug pages: `?globe-debug` or `sessionStorage["globe-debug"] = "1"`): `sessionStorage["input-kind"] = "wheel" | "swipe"` declares that every
 * plain (not ctrl) wheel event of the page is a mouse wheel or a swipe, whatever it looks like. The browser checks drive the app with Chrome's synthetic wheel
 * (`page.mouse.wheel`), which carries no device signature at a device scale factor of 2 (its legacy `wheelDeltaY` is 60, whatever the delta), so they say what they emulate.
 * Never read outside a debug page.
 */
export function inputKindOverride(): "wheel" | "swipe" | null {
  try {
    const debug = new URLSearchParams(location.search).has("globe-debug") || sessionStorage.getItem("globe-debug") === "1";
    if (!debug) return null;
    const v = sessionStorage.getItem("input-kind");
    return v === "wheel" || v === "swipe" ? v : null;
  } catch {
    return null;
  }
}

/**
 * `?pinch-rate=N` on ANY page (not only debug ones): levels a pixel of a trackpad pinch's deltaY instead of `PINCH_ZOOM_RATE`; kept in localStorage
 * (`pinch-rate`) so the owner can A/B it across reloads. `?pinch-rate=reset` forgets it. Read at each pinch, so a change applies at once.
 */
export function pinchRateOverride(): number | null {
  try {
    const q = new URLSearchParams(location.search).get("pinch-rate");
    if (q === "reset") localStorage.removeItem("pinch-rate");
    else if (q !== null && Number.isFinite(Number(q)) && Number(q) > 0 && Number(q) < 5) localStorage.setItem("pinch-rate", q);
    const n = Number(localStorage.getItem("pinch-rate"));
    return Number.isFinite(n) && n > 0 && n < 5 ? n : null;
  } catch {
    return null;
  }
}

const f = (v: number | undefined, digits = 1) => (v === undefined ? "-" : Number.isInteger(v) ? String(v) : v.toFixed(digits));

/** Events per animation frame and the zoom they gained over the last second, from the log's own entries. */
function frameStats() {
  const es = (window.__inputDebug?.entries ?? []).filter((e) => e.zoom !== undefined);
  const last = es.at(-1);
  if (!last) return { zoomPerSec: 0, max: 0, avg: 0 };
  const recent = es.filter((e) => last.t - e.t <= 1000);
  const span = Math.max(100, last.t - recent[0]!.t);
  const frames = new Map<number, number>();
  for (const e of recent) frames.set(Math.floor(e.t / 16.7), (frames.get(Math.floor(e.t / 16.7)) ?? 0) + 1);
  const counts = [...frames.values()];
  return { zoomPerSec: (recent.reduce((a, e) => a + (e.zoom ?? 0), 0) / span) * 1000, max: Math.max(...counts), avg: counts.reduce((a, c) => a + c, 0) / counts.length };
}

let shared: InputDebug | null = null;

/** The one logger of the page (several canvases share the overlay), or null when the flag is off. */
export function inputDebug(): InputDebug | null {
  if (shared) return shared;
  if (typeof document === "undefined" || !inputDebugWanted()) return null;
  const entries: InputLogEntry[] = [];
  window.__inputDebug = { entries, clear: () => void (entries.length = 0) };
  const box = document.createElement("pre");
  box.dataset.inputDebug = "";
  box.setAttribute("aria-hidden", "true");
  Object.assign(box.style, {
    position: "fixed",
    left: "8px",
    bottom: "8px",
    zIndex: "2147483000",
    margin: "0",
    padding: "6px 8px",
    font: "11px/1.35 ui-monospace, Menlo, monospace",
    color: "#fff",
    background: "rgb(0 0 0 / 0.78)",
    pointerEvents: "none",
    whiteSpace: "pre",
    maxWidth: "min(96vw, 640px)",
    overflow: "hidden",
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.append(box);
  shared = {
    log(entry) {
      entries.push(entry);
      if (entries.length > MAX_ENTRIES) entries.shift();
      const lines = entries.slice(-SHOWN).map((e) => {
        const s = e.sample;
        const raw = s ? ` dx${f(s.dx)} dy${f(s.dy)} m${s.mode}${s.ctrl ? " ctrl" : ""} wy${f(s.wheelDy)}` : "";
        const out = e.zoom !== undefined ? ` zoom ${e.zoom >= 0 ? "+" : ""}${e.zoom.toFixed(3)}${e.cum !== undefined ? ` (pinch total ${e.cum >= 0 ? "+" : ""}${e.cum.toFixed(2)})` : ""}` : e.pan ? ` pan ${f(e.pan[0])},${f(e.pan[1])}` : "";
        return `${e.kind.padEnd(7)}${raw}${out}  ${e.reason}`;
      });
      const st = frameStats();
      box.textContent = `input (${entries.length})  effective zoom ${st.zoomPerSec >= 0 ? "+" : ""}${st.zoomPerSec.toFixed(2)} levels/s  wheel events per frame max ${st.max} avg ${st.avg.toFixed(1)}\n${lines.join("\n")}`;
    },
  };
  return shared;
}
