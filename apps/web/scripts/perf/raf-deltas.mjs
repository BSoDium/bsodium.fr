// The caption's frame intervals as the OWNER sees them (docs/performance.md, "Hitches"): the display frames between two drawn caption frames
// while a row rolls slowly and while rows LEAVE fast, with the page's own rAF loop (every display frame, time-based) against the earlier rounds'
// timer loop (a setTimeout at 20 a second: how many display frames pass between two draws, which is the judder). `HZ=60` is the headless default;
// `HZ=uncapped` launches with the frame rate limit off (rAF at whatever the machine renders: a stand-in for a 120 or 144 Hz screen) and checks
// that the governor DERIVES the display's period.
//
//   CHROME_PATH=... BASE_URL=http://localhost:5210 HZ=60|uncapped node scripts/perf/raf-deltas.mjs
import { chromium } from "playwright-core";
import { BASE_URL, DESKTOP } from "../globe/_lib.mjs";

const UNCAPPED = process.env.HZ === "uncapped";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH,
  headless: true,
  args: ["--use-angle=metal", "--ignore-gpu-blocklist", "--enable-gpu", ...(UNCAPPED ? ["--disable-gpu-vsync", "--disable-frame-rate-limit"] : [])],
});
const ctx = await browser.newContext({ ...DESKTOP, colorScheme: "dark" });
const page = await ctx.newPage();
await page.goto(`${BASE_URL}/?globe-debug&ring&showcase&no-street&hero-idle=600000&caption-fps`);
await page.waitForFunction(() => window.__globeDebug?.caption()?.phase === "rest", null, { timeout: 120000 });
await page.evaluate(() => window.__globeDebug.energy({ idleFreezeMs: 0 }));
// a rAF counter and the earlier rounds' timer loop (20 a second), both in the page
await page.evaluate(() => {
  window.__frames = 0;
  const tick = () => {
    window.__frames++;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  window.__timerGaps = [];
  let last = null;
  const step = () => {
    const f = window.__frames;
    if (last !== null) window.__timerGaps.push(f - last);
    last = f;
    setTimeout(step, 50);
  };
  setTimeout(step, 50);
});
const stats = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const q = (p) => s[Math.min(s.length - 1, Math.floor(s.length * p))];
  return { n: s.length, p50: +q(0.5).toFixed(2), p95: +q(0.95).toFixed(2), p99: +q(0.99).toFixed(2), max: +s.at(-1).toFixed(2) };
};
const out = {};
for (const phase of ["roll", "exit"]) {
  await page.evaluate(() => {
    window.__globeDebug.traceCaption(true);
    window.__timerGaps.length = 0;
  });
  if (phase === "exit") await page.evaluate(() => window.__globeDebug.captionSwap());
  await sleep(phase === "roll" ? 8000 : 2200);
  const r = await page.evaluate(() => ({ trace: window.__globeDebug.traceCaption(false), gaps: window.__timerGaps.slice(), q: window.__globeDebug.caption().quality, frames: window.__frames }));
  const deltas = r.trace.map((t) => t[1]).filter((d) => d > 0);
  const period = r.q.period;
  out[phase] = { rAF: stats(deltas), displayPeriodMs: period ? +period.toFixed(2) : null, late: +(deltas.filter((d) => d > 1.5 * (period ?? 16.7)).length / Math.max(1, deltas.length)).toFixed(3), draw: stats(r.trace.map((t) => t[2])), rung: r.q.level };
  const hist = {};
  for (const g of r.gaps) hist[g] = (hist[g] ?? 0) + 1;
  out[phase].timerLoopFramesBetweenDraws = Object.keys(hist).length > 12 ? "(not meaningful: frames are not paced by a vsync here)" : hist;
}
console.log(JSON.stringify({ mode: UNCAPPED ? "uncapped (120 Hz stand-in)" : "60 Hz", ...out }, null, 1));
await browser.close();
