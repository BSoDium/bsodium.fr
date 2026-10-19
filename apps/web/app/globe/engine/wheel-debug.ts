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

const f = (v: number | undefined, digits = 1) => (v === undefined ? "-" : Number.isInteger(v) ? String(v) : v.toFixed(digits));

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
        const out = e.zoom !== undefined ? ` zoom ${e.zoom >= 0 ? "+" : ""}${e.zoom.toFixed(3)}` : e.pan ? ` pan ${f(e.pan[0])},${f(e.pan[1])}` : "";
        return `${e.kind.padEnd(7)}${raw}${out}  ${e.reason}`;
      });
      box.textContent = `input (${entries.length})\n${lines.join("\n")}`;
    },
  };
  return shared;
}
