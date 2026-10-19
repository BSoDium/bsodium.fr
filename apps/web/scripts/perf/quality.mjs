// The caption's quality governor under load (docs/performance.md, "Hitches"): the page runs 40 s with the CPU throttled (CDP
// `Emulation.setCPUThrottlingRate`, a weak machine) and then 25 s unthrottled; the caption's frame rate, the rung of the ladder and the main
// thread's long frames are sampled each second, with the governor on and off. Headless Chrome: the throttle slows the main thread (the draw's JS
// and the timers), which is what the governor measures; it is not a GPU-bound slowdown.
//
//   CHROME_PATH=... BASE_URL=http://localhost:5210 RATE=6 node scripts/perf/quality.mjs
import { BASE_URL, DESKTOP, launch } from "../globe/_lib.mjs";

const RATE = Number(process.env.RATE ?? 6);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await launch();
const table = [];
for (const enabled of [false, true]) {
  const ctx = await browser.newContext({ ...DESKTOP, colorScheme: "dark" });
  const page = await ctx.newPage();
  await page.goto(`${BASE_URL}/?globe-debug&ring&showcase&no-street&hero-idle=600000`);
  await page.waitForFunction(() => window.__globeDebug?.caption()?.phase === "rest", null, { timeout: 120000 });
  await page.evaluate((e) => window.__globeDebug.energy({ qualityEnabled: e, idleFreezeMs: 0 }), enabled);
  await page.evaluate(() => {
    window.__long = [];
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(e.duration))).observe({ entryTypes: ["longtask"] });
  });
  const cdp = await ctx.newCDPSession(page);
  const snap = () => page.evaluate(() => ({ c: window.__globeDebug.caption(), long: window.__long.length, longMax: Math.max(0, ...window.__long) }));
  const rows = [];
  let prev = await snap();
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: RATE });
  for (let s = 1; s <= 65; s++) {
    if (s === 41) await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    await sleep(1000);
    const now = await snap();
    rows.push({ s, fps: now.c.captionFrames - prev.c.captionFrames, level: now.c.quality.level, dpr: now.c.quality.dpr, slices: now.c.quality.slices, longTasks: now.long - prev.long, throttled: s <= 40 });
    prev = now;
  }
  const avg = (a, k) => (a.reduce((x, y) => x + y[k], 0) / a.length).toFixed(1);
  const hot = rows.filter((r) => r.throttled && r.s > 10);
  table.push({
    governor: enabled ? "on" : "off",
    "throttled: caption fps": avg(hot, "fps"),
    "throttled: long tasks/s": avg(hot, "longTasks"),
    "throttled: end rung": rows[39].level,
    "unthrottled: caption fps (last 10 s)": avg(rows.slice(-10), "fps"),
    "unthrottled: end rung": rows.at(-1).level,
  });
  if (enabled) console.log(rows.filter((r) => r.s % 5 === 0).map((r) => `${r.s}s${r.throttled ? "*" : ""}: ${r.fps} fps, rung ${r.level} (dpr ${r.dpr}, ${r.slices} slices)`).join("\n"));
  await ctx.close();
}
console.table(table);
await browser.close();
