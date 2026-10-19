// Frame-time hitches of the resting home screen (docs/performance.md, "Hitches"): a rAF probe records the interval between display frames, a
// PerformanceObserver the long tasks, and the caption's cycle numbers; the report lists every interval over `LIMIT` ms with what the caption was
// doing (which cycle, whether a row was entering or leaving) and the worst per cycle. Headless Chrome on Metal.
//
//   CHROME_PATH=... BASE_URL=http://localhost:5210 SECONDS=60 node scripts/perf/hitches.mjs
import { BASE_URL, DESKTOP, launch } from "../globe/_lib.mjs";

const SECONDS = Number(process.env.SECONDS ?? 60);
const LIMIT = Number(process.env.LIMIT ?? 34);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await launch();
const [W, H, DSF] = (process.env.SIZE ?? "1440x900x2").split("x").map(Number);
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DSF, colorScheme: "dark" });
const page = await ctx.newPage();
await page.goto(`${BASE_URL}/?globe-debug&ring&showcase&no-street&rotate&spin-idle=2500&hero-idle=600000${process.env.QUERY ?? ""}`);
await page.waitForFunction(() => window.__globeDebug?.caption()?.phase === "rest", null, { timeout: 120000 });
await page.evaluate(() => {
  const P = (window.__probe = { frames: [], long: [], last: performance.now(), t0: performance.now() });
  const loop = (t) => {
    P.frames.push([t, t - P.last, window.__globeDebug.caption().cycle.swaps]);
    P.last = t;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) P.long.push([e.startTime, e.duration]);
  }).observe({ entryTypes: ["longtask"] });
});
await sleep(SECONDS * 1000);
const r = await page.evaluate(() => {
  const P = window.__probe;
  const st = window.__globeDebug.caption();
  return { frames: P.frames, long: P.long, cap: { frames: st.captionFrames, ms: st.captionMs }, texture: st.texture?.length };
});
const dts = r.frames.map((f) => f[1]).filter((d) => d > 0);
const sorted = [...dts].sort((a, b) => a - b);
const pct = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
const bad = r.frames.filter((f) => f[1] > LIMIT);
console.log(JSON.stringify({ seconds: SECONDS, frames: dts.length, p50: pct(0.5), p95: pct(0.95), p99: pct(0.99), max: Math.max(...dts), over: bad.length, longTasks: r.long.length, longMax: Math.max(0, ...r.long.map((l) => l[1])), captionFrames: r.cap.frames }));
for (const b of bad.slice(0, 40)) console.log(`  t ${(b[0] / 1000).toFixed(2)} s: ${b[1].toFixed(0)} ms (caption cycle ${b[2]})`);
for (const l of r.long.slice(0, 20)) console.log(`  long task at ${(l[0] / 1000).toFixed(2)} s: ${l[1].toFixed(0)} ms`);
await browser.close();
