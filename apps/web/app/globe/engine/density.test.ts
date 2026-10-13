import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Pixel density is CONSTANT at runtime (docs/performance.md, "Constant pixel density"; owner, 2026-10-12: "we should keep a constant
 * pixel density"). A frame governor used to step the street render scale and the art pixel on measured frame times; it hunted on a
 * machine whose frame INTERVAL was 25 ms with 0.5 ms of real work, and the map changed resolution in front of the owner.
 *
 * The only things that may change the size of the art cell while the page is up are the viewport (container size, which crosses the
 * 520 px phone rule) and the device pixel ratio (the window moved to another display): both go through `TUNING.pixelSize`, a pure
 * function of those two (`tuning.test.ts`). This test pins the other half: nothing in the code can feed it anything else, and no
 * code can change the street render scale after the map is created. The behaviour is checked in a real browser, under a 6x CPU
 * throttle, by `scripts/globe/handover-perf.mjs density`.
 */
const globeDir = fileURLToPath(new URL("..", import.meta.url));

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) yield p;
  }
}

const sources = [...walk(globeDir)].map((file) => ({
  file: relative(globeDir, file).split("\\").join("/"),
  // comments are exempt: the history is documented in them
  code: readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\s\/\/ .*$/gm, ""),
}));

const offenders = (re: RegExp) => sources.filter((s) => re.test(s.code)).map((s) => s.file);

describe("no code path changes the pixel density at runtime", () => {
  it("there is no frame governor, no quality state and no frame clock", () => {
    expect(offenders(/\bFrameGovernor\b|\bFRAME_CLOCK\b|\bFrameClock\b|\bQUALITY\b|\bcellBoost\b|\bapplyQuality\b|\bforceQuality\b/)).toEqual([]);
    expect(sources.some((s) => s.file === "engine/governor.ts")).toBe(false);
  });

  it("the street render scale is read once, when the map is created: nothing sets it afterwards", () => {
    expect(offenders(/\bsetRenderScale\b/)).toEqual([]);
    expect(offenders(/\bcompositorOptions\.scale\s*=[^=]/)).toEqual([]);
  });

  it("the renderer's art pixel is derived in one place, from the container size and the device pixel ratio", () => {
    const derivations = sources.filter((s) => /\bTUNING\.pixelSize\(|\bSTREET_TUNING\.pixelSize\(/.test(s.code)).map((s) => s.file).sort();
    expect(derivations).toEqual(["engine/renderer.ts", "street/core/pixel.ts"]);
  });

  it("ART_PIXEL is only written by the load-time debug override", () => {
    const writes = sources.filter((s) => /\bART_PIXEL\.(desktop|phone|phoneBelow)\s*=[^=]/.test(s.code)).map((s) => s.file);
    expect(writes).toEqual(["engine/tuning.ts"]);
    const tuning = sources.find((s) => s.file === "engine/tuning.ts")!.code;
    const fn = tuning.slice(tuning.indexOf("export function applyDebugArtPixel"), tuning.indexOf("export const TUNING"));
    expect(fn.match(/\bART_PIXEL\.\w+\s*=[^=]/g)?.length).toBe(2);
    // ... and `TUNING` itself (everything after the override) never assigns it
    expect(/\bART_PIXEL\.\w+\s*=[^=]/.test(tuning.slice(tuning.indexOf("export const TUNING")))).toBe(false);
  });
});
