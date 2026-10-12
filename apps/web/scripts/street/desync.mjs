// Camera desync gate: while the camera moves (fast wheel bursts and trackpad inertia, the way the owner zooms) what the screen shows must
// be the picture of the camera the overlay boxes follow. Owner report (2026-10-12): "when you zoom in or out rather fast onto a location,
// sometimes the bounding boxes and some of the content continue zooming, but the actual data on the map stays in place and fades out".
//
// Cause (docs/street-architecture.md, "One camera per frame"): the cut waits up to 1.2 s for the street map's tiles while the Three.js globe
// stays on screen, and the globe draws at most its own maximum zoom (6.5) while the boxes, labels and the street map follow the camera:
// past 6.5 a frozen picture at the wrong scale sat under boxes that kept zooming, then the cut cross-faded from it ("fades out"). A
// style swap's hold (compositor.hold) froze the street picture the same way while the camera moved.
//
// Per frame (after all of the frame's work, a MessageChannel task posted from a rAF callback) the page samples:
//   street picture shown   desync = max(registration of the map's camera against the controller's at five landmarks, how far the
//                          presented picture is from the map's camera (`debug().staleCells()`))
//   globe picture shown    desync = 0 up to the globe's maximum zoom; above it the displacement of the frozen picture at the corner
//                          of the screen (the globe draws 6.5, the camera is further in), and the frame counts as stale
// Real wheel input (page.mouse.wheel, aligned to frames by Chrome), tiles delayed by Playwright routing so that the cut cannot be ready.
//
//   BASE_URL=http://localhost:5430 node scripts/street/desync.mjs [--only=cut-in,cut-trackpad,cut-out,street,hold] [--place=hcmc|paris|lisbon]
//        [--delay=900] [--json=out.json] [--rows=1]
// SOURCE=fallback (default: the local archive, HCMC) | primary (OpenFreeMap: any place). Needs the app with the debug hooks (dev server or a
// build with CATALYST_DEV_ROUTES=1) and Chrome for Testing.
import { writeFileSync } from "node:fs";
import { DESKTOP, SOURCE, launch, openApp, settleApp, setCamera, waitStreetOk } from "../globe/handover-lib.mjs";

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const t = a.replace(/^--/, ""); const i = t.indexOf("="); return i < 0 ? [t, "1"] : [t.slice(0, i), t.slice(i + 1)]; }));
const only = args.only ? new Set(args.only.split(",")) : null;
const want = (n) => !only || only.has(n);
const DELAY = Number(args.delay ?? 900);
const PLACES = { hcmc: { lon: 106.7009, lat: 10.7769 }, paris: { lon: 2.3522, lat: 48.8566 }, lisbon: { lon: -9.1393, lat: 38.7223 } };
const place = PLACES[args.place ?? (SOURCE === "primary" ? "paris" : "hcmc")];
if (!place) throw new Error(`unknown place ${args.place}`);
/** The Three.js globe's own maximum internal zoom (TUNING.maxZoom, asserted in handover/maths.test.ts). */
const GLOBE_MAX_ZOOM = 6.5;
/** Tolerance: one art cell (the pass cannot show less), plus the rounding of the landmarks. */
const TOL_CELLS = 1;
const profile = { ...DESKTOP, deviceScaleFactor: 1 };
const report = {};
const failures = [];
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name} ${detail}`);
  if (!ok) failures.push(name);
};

const SAMPLER = `
window.__dsync = {
  start(globeMax) {
    const frames = [];
    const mc = new MessageChannel();
    const st = { stop: false, frames, t0: performance.now() };
    const sample = () => {
      const d = window.__handoverDebug;
      const row = { t: Math.round(performance.now() - st.t0), z: d.zoom(), shown: d.blend().shown, desync: 0, kind: "none" };
      const s = d.street();
      const root = document.querySelector("[data-street-root]")?.parentElement;
      const streetVisible = !!s && !!root && root.style.opacity === "1";
      if (streetVisible) {
        const dbg = s.debug(), m = dbg.map();
        const W = m.getCanvas().clientWidth, H = m.getCanvas().clientHeight;
        let reg = 0;
        for (const [a, b] of [[0.5, 0.5], [0.1, 0.1], [0.9, 0.1], [0.1, 0.9], [0.9, 0.9]]) {
          const p = m.unproject([a * W, b * H]);
          const e = d.registrationError(p.lng, p.lat);
          if (e !== null && e > reg) reg = e;
        }
        const cell = dbg.cellCss();
        const stale = dbg.staleCells() * cell;
        row.kind = "street"; row.reg = +reg.toFixed(2); row.stale = +stale.toFixed(2); row.cell = cell;
        row.desync = Math.max(reg, stale);
        row.easing = dbg.easing();
      } else if (row.shown < 1) {
        // the globe is what is shown: faithful up to its maximum zoom, a frozen picture of that zoom above it
        const over = d.zoom() - globeMax;
        row.kind = "globe";
        if (over > 1e-3) {
          const W = innerWidth, H = innerHeight;
          row.desync = Math.hypot(W / 2, H / 2) * (Math.pow(2, over) - 1);
          row.stale = 1;
        }
      }
      frames.push(row);
      if (!st.stop) requestAnimationFrame(() => mc.port2.postMessage(0));
    };
    mc.port1.onmessage = sample;
    requestAnimationFrame(() => mc.port2.postMessage(0));
    window.__dsyncState = st;
  },
  stop() { window.__dsyncState.stop = true; return window.__dsyncState.frames; },
};`;

/** n wheel events from `dy` (deltaY, negative = in), `gap` ms apart, each scaled by `decay` (trackpad inertia). */
const burst = ({ n, dy, gap, decay = 1, start = 40, t0 = 0 }) => {
  const ev = [];
  let t = start + t0, v = dy;
  for (let i = 0; i < n; i++) {
    ev.push({ t: Math.round(t), dy: v });
    t += gap;
    v *= decay;
  }
  return ev;
};

async function session(browser, { from, tiles = true, reduced = false } = {}) {
  const { page, ctx, logs } = await openApp(browser, profile, { path: "/", reducedMotion: reduced ? "reduce" : "no-preference" });
  let delay = 0;
  if (tiles) {
    const slow = async (route) => {
      if (delay) await new Promise((r) => setTimeout(r, delay));
      await route.continue();
    };
    await page.route("**/places.pmtiles", slow);
    await page.route("**/*.pbf", slow);
  }
  await page.addStyleTag({ content: "header, nav, [data-attribution] { visibility: hidden !important; }" });
  await page.evaluate(SAMPLER);
  // the street map has to exist and have its tiles before the gesture starts (a warm session), then the tiles are slowed down
  await setCamera(page, { ...place, zoom: 3.0 });
  await page.waitForTimeout(300);
  await setCamera(page, { ...place, zoom: Math.max(from, 3.0) });
  await waitStreetOk(page);
  await settleApp(page);
  if (from < 3.0) await setCamera(page, { ...place, zoom: from });
  await settleApp(page);
  return { page, ctx, logs, setDelay: (v) => (delay = v) };
}

async function gesture(page, events, tailMs = 900) {
  await page.mouse.move(DESKTOP.viewport.width / 2, DESKTOP.viewport.height / 2);
  await page.evaluate((m) => window.__dsync.start(m), GLOBE_MAX_ZOOM);
  const t0 = Date.now();
  for (const e of events) {
    const wait = t0 + e.t - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    await page.mouse.wheel(0, e.dy);
  }
  await page.waitForTimeout(tailMs);
  return page.evaluate(() => window.__dsync.stop());
}

function analyse(frames) {
  const first = frames.findIndex((f, i) => i > 0 && f.z !== frames[0].z);
  const g = first < 0 ? [] : frames.slice(first + 1); // after the first frame of the gesture
  const tol = (f) => TOL_CELLS * (f.cell ?? 2.5);
  const bad = g.filter((f) => f.desync > tol(f) + 1e-6);
  let badMs = 0;
  for (let i = 1; i < g.length; i++) if (g[i].desync > tol(g[i]) + 1e-6) badMs += g[i].t - g[i - 1].t;
  const stale = g.filter((f) => f.stale === 1 && f.kind === "globe");
  let cutZ = null;
  for (let i = 1; i < frames.length; i++) if (frames[i].shown >= 1 && frames[i - 1].shown < 1) { cutZ = frames[i].z; break; }
  return {
    frames: frames.length,
    gestureFrames: g.length,
    maxDesyncPx: +g.reduce((m, f) => Math.max(m, f.desync), 0).toFixed(1),
    maxReg: +g.reduce((m, f) => Math.max(m, f.kind === "street" ? f.reg : 0), 0).toFixed(2),
    maxStalePx: +g.reduce((m, f) => Math.max(m, f.kind === "street" ? f.stale : 0), 0).toFixed(1),
    badFrames: bad.length,
    badMs,
    globeStaleFrames: stale.length,
    cutZ: cutZ === null ? null : +cutZ.toFixed(2),
    zEnd: +frames[frames.length - 1].z.toFixed(2),
    easingAtEnd: frames[frames.length - 1].easing ?? null,
  };
}

function gate(name, a) {
  report[name] = a;
  check(`${name}: no frame of the gesture is more than ${TOL_CELLS} art cell off the camera`, a.badFrames === 0, `(max ${a.maxDesyncPx} px, ${a.badFrames} frames, ${a.badMs} ms; registration ${a.maxReg} px, held picture ${a.maxStalePx} px)`);
  check(`${name}: the globe is never the shown renderer past its maximum zoom`, a.globeStaleFrames === 0, `(${a.globeStaleFrames} frames)`);
}

const browser = await launch();
try {
  const cases = [
    // from the globe through the cut at a fast wheel: the cut cannot wait for slow tiles behind a globe that cannot draw the camera
    ["cut-in", { from: 3.0, events: burst({ n: 50, dy: -140, gap: 10 }) }],
    ["cut-trackpad", { from: 2.8, events: burst({ n: 45, dy: -260, gap: 8, decay: 0.93 }) }],
    ["cut-out", { from: 9, events: burst({ n: 45, dy: 100, gap: 12 }) }],
    // at street scale: in then out, the camera never leaves the map's
    ["street", { from: 11, events: [...burst({ n: 25, dy: -100, gap: 12 }), ...burst({ n: 25, dy: 100, gap: 12, t0: 25 * 12 + 250 })] }],
  ];
  for (const [name, c] of cases) {
    if (!want(name)) continue;
    const { page, ctx, logs, setDelay } = await session(browser, { from: c.from });
    setDelay(DELAY);
    const frames = await gesture(page, c.events);
    const a = analyse(frames);
    gate(name, a);
    if (args.rows) for (const f of frames) console.log(JSON.stringify(f));
    // at rest everything has arrived: the street map presents what it classified, nothing is easing
    await settleApp(page).catch(() => {});
    const rest = await page.evaluate(() => {
      const d = window.__handoverDebug, s = d.street();
      if (!s || d.blend().shown < 1) return { street: false };
      const dbg = s.debug();
      const T = dbg.readCodes()?.levels, P = dbg.readPresentedLevels();
      let diff = 0;
      if (T && P) for (let i = 0; i < T.length; i++) if (T[i] !== P[i]) diff++;
      return { street: true, diff, easing: dbg.easing(), stale: dbg.staleCells() };
    });
    if (rest.street) check(`${name}: at rest the presented picture is the classified one`, rest.diff === 0 && rest.easing === 0 && rest.stale === 0, `(${rest.diff} cells differ, easing ${rest.easing})`);
    if (logs.length) console.error(logs.slice(-3).join("\n"));
    await ctx.close();
  }

  if (want("hold")) {
    // a style swap holds the presented picture: it stays while the camera rests, and ends the moment the camera moves
    const { page, ctx } = await session(browser, { from: 12, tiles: false });
    const rest = await page.evaluate(async () => {
      const d = window.__handoverDebug, dbg = d.street().debug();
      const frame = () => new Promise((r) => requestAnimationFrame(r));
      const lit = () => dbg.readPresentedLevels().reduce((n, v) => n + (v > 0 ? 1 : 0), 0);
      const before = lit();
      dbg.hold(true);
      // the map changes under the hold (what a style swap does): the held picture must not
      dbg.map().setLayoutProperty("water-fill", "visibility", "none");
      for (let i = 0; i < 6; i++) await frame();
      const held = lit();
      return { before, held, stale: dbg.staleCells() };
    });
    check("hold: at rest the picture stays held (a swap shows no flash of unloaded layers)", rest.held === rest.before && rest.stale === 0, `(lit ${rest.before} -> ${rest.held})`);
    const frames = await gesture(page, burst({ n: 25, dy: -60, gap: 14 }), 500);
    const a = analyse(frames);
    gate("hold", a);
    await ctx.close();
  }
} finally {
  await browser.close();
}
if (args.json) writeFileSync(args.json, JSON.stringify(report, null, 2));
console.log("\n" + JSON.stringify(report));
if (failures.length) {
  console.error(`\n${failures.length} FAILED: ${failures.join("; ")}`);
  process.exit(1);
}
console.log("\ndesync ok");
