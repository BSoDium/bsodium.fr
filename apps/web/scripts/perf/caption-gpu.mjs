// The caption's frame INCLUDING the GPU's work, over a minute of cycles (docs/performance.md, "Hitches"): every 40 ms one caption frame is drawn
// and the GPU waited for (a 1 x 1 read back of the second canvas), and its time is recorded against the cycle the first row is in; the report is
// the distribution and the slowest frames with what the rows were doing. A rAF probe alone cannot see this in headless Chrome (its frames are
// paced by a fixed clock).
//
//   CHROME_PATH=... BASE_URL=http://localhost:5210 SECONDS=60 SIZE=1440x900x2 node scripts/perf/caption-gpu.mjs
import { BASE_URL, launch } from "../globe/_lib.mjs";

const SECONDS = Number(process.env.SECONDS ?? 60);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const [W, H, DSF] = (process.env.SIZE ?? "1440x900x2").split("x").map(Number);
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DSF, colorScheme: "dark" });
const page = await ctx.newPage();
await page.goto(`${BASE_URL}/?globe-debug&ring&showcase&no-street&hero-idle=600000${process.env.QUERY ?? ""}`);
await page.waitForFunction(() => window.__globeDebug?.caption()?.phase === "rest", null, { timeout: 120000 });
if (process.env.ENERGY) await page.evaluate((p) => window.__globeDebug.energy(JSON.parse(p)), process.env.ENERGY);
const rows = await page.evaluate(async (seconds) => {
  const out = [];
  const t0 = performance.now();
  while (performance.now() - t0 < seconds * 1000) {
    const ms = window.__globeDebug.captionGpuMs();
    const c = window.__globeDebug.caption();
    out.push([performance.now() - t0, ms, c.cycle.swaps, c.cycle.swapping ? 1 : 0, c.lines.filter((l) => l.visible).length]);
    await new Promise((r) => setTimeout(r, 40));
  }
  return out;
}, SECONDS);
const ms = rows.map((r) => r[1]).sort((a, b) => a - b);
const pct = (p) => ms[Math.min(ms.length - 1, Math.floor(ms.length * p))];
const swapRows = rows.filter((r) => r[3] === 1).map((r) => r[1]);
const restRows = rows.filter((r) => r[3] === 0).map((r) => r[1]);
const avg = (a) => (a.reduce((x, y) => x + y, 0) / Math.max(1, a.length)).toFixed(2);
console.log(JSON.stringify({ size: `${W}x${H}@${DSF}`, frames: rows.length, p50: pct(0.5), p95: pct(0.95), p99: pct(0.99), max: ms.at(-1), avgSwap: avg(swapRows), avgRest: avg(restRows) }));
for (const r of [...rows].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`  t ${(r[0] / 1000).toFixed(1)} s: ${r[1].toFixed(1)} ms (cycle ${r[2]}, swapping ${r[3]}, rows in view ${r[4]})`);
await browser.close();
