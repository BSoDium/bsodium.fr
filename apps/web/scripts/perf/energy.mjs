// The resting home screen's energy (docs/performance.md, "Energy"): per second over 20 s at rest, headless Chrome through CDP
// (Performance.getMetrics: TaskDuration, ScriptDuration, LayoutDuration, RecalcStyleDuration), the frames each canvas draws, requestAnimationFrame
// callbacks, and the CPU time of Chrome's GPU and renderer processes read with `ps`. Each configuration is a fresh page with the energy knobs set
// through `__globeDebug.energy(patch)`. Honest about its limits: headless Chrome on the dev machine, no GPU energy counters, no battery.
//
//   CHROME_PATH=/path/to/chrome BASE_URL=http://localhost:5210 SECONDS=20 node scripts/perf/energy.mjs [name,name,...]
import { execSync } from "node:child_process";
import { BASE_URL, DESKTOP, launch } from "../globe/_lib.mjs";

const SECONDS = Number(process.env.SECONDS ?? 20);
const OLD = { spinFrameMs: 0, captionDpr: 2, captionWindow: "planet", idleFreezeMs: 0, holdWhenBlurred: false, holdWhenOffscreen: false, holdOnSaveData: false };
const SHIPPED = { spinFrameMs: 100, captionDpr: 1.5, captionWindow: "band", idleFreezeMs: 0, holdWhenBlurred: false, holdWhenOffscreen: false, holdOnSaveData: false };
// (since round 10 the caption and the ring are drawn on every display frame while they move: no knob lowers their rate; what saves energy is the
// idle hold, the slices on demand, the band-sized canvas, the paced idle rotation, the pauses and the low-power hint)
const CONFIGS = {
  "before (round 8: full frames at the display rate, planet-box canvas, dpr 2)": OLD,
  "shipped, moving (caption and ring on every display frame, rotation 10 a second, band canvas, dpr 1.5)": SHIPPED,
  "shipped, after the idle hold (2 s here, 30 s shipped)": { ...SHIPPED, idleFreezeMs: 2000 },
};
const only = process.argv[2]?.split(",");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** CPU seconds of every Chrome-for-Testing helper of a kind ("GPU", "Renderer"), summed. */
function cpuSeconds(kind) {
  let out = "";
  try {
    out = execSync(`ps -axo cputime=,command=`, { encoding: "utf8", maxBuffer: 1 << 24 });
  } catch {
    return NaN;
  }
  let total = 0;
  for (const line of out.split("\n")) {
    if (!line.includes("Google Chrome for Testing Helper") || !line.includes(kind === "GPU" ? "--type=gpu-process" : "--type=renderer")) continue;
    const m = line.trim().match(/^(\d+):(\d+\.\d+)|^(\d+):(\d+):(\d+\.\d+)/);
    if (!m) continue;
    total += m[1] !== undefined ? Number(m[1]) * 60 + Number(m[2]) : Number(m[3]) * 3600 + Number(m[4]) * 60 + Number(m[5]);
  }
  return total;
}

const browser = await launch();
const rows = [];
for (const [name, patch] of Object.entries(CONFIGS)) {
  if (only && !only.includes(name)) continue;
  const ctx = await browser.newContext({ ...DESKTOP, colorScheme: "dark" });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    const raf = window.requestAnimationFrame.bind(window);
    window.__rafCalls = 0;
    window.requestAnimationFrame = (cb) => (window.__rafCalls++, raf(cb));
  });
  await page.goto(`${BASE_URL}/?globe-debug&ring&showcase&no-street&rotate&spin-idle=2500&hero-idle=600000`);
  await page.waitForFunction(() => window.__globeDebug?.caption()?.phase === "rest", null, { timeout: 120000 });
  await page.evaluate((p) => window.__globeDebug.energy(p), patch);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Performance.enable");
  await sleep(6000); // the spin starts after its idle delay and eases in; the knobs settle
  const metrics = async () => Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
  const snap = () =>
    page.evaluate(() => ({ raf: window.__rafCalls, frames: window.__globeDebug.frames(), caption: window.__globeDebug.caption().captionFrames, ring: window.__globeDebug.ring()?.frames ?? 0, spinning: window.__globeDebug.spin().phase }));
  const m0 = await metrics();
  const s0 = await snap();
  const g0 = cpuSeconds("GPU");
  const r0 = cpuSeconds("Renderer");
  const t0 = Date.now();
  await sleep(SECONDS * 1000);
  const dt = (Date.now() - t0) / 1000;
  const m1 = await metrics();
  const s1 = await snap();
  const g1 = cpuSeconds("GPU");
  const r1 = cpuSeconds("Renderer");
  const per = (k) => ((m1[k] - m0[k]) / dt) * 1000;
  rows.push({
    config: name,
    "task ms/s": +per("TaskDuration").toFixed(1),
    "script ms/s": +per("ScriptDuration").toFixed(1),
    "layout ms/s": +per("LayoutDuration").toFixed(1),
    "style ms/s": +per("RecalcStyleDuration").toFixed(1),
    "globe fps": +((s1.frames - s0.frames) / dt).toFixed(1),
    "caption fps": +((s1.caption - s0.caption) / dt).toFixed(1),
    "ring fps": +((s1.ring - s0.ring) / dt).toFixed(1),
    "rAF/s": +((s1.raf - s0.raf) / dt).toFixed(1),
    "GPU cpu ms/s": +(((g1 - g0) / dt) * 1000).toFixed(0),
    "renderer cpu ms/s": +(((r1 - r0) / dt) * 1000).toFixed(0),
    spin: s1.spinning,
  });
  console.log(JSON.stringify(rows.at(-1)));
  await ctx.close();
}
await browser.close();
console.table(rows);
