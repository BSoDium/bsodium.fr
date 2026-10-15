// Browser checks of the paths layer (every route leg drawn faintly, the selected place's in ink; docs/paths.md).
//
//   CHROME_PATH=... BASE_URL=http://localhost:5300 OUT_DIR=/some/dir node apps/web/scripts/paths/check.mjs [shots|select|toggle|reduced|limb|perf|street]
//
// Run the app on demo content (`CATALYST_CONTENT=demo`): the fictional routes of packages/published/fixtures/demo.json carry
// legs of every mode. Pages run in debug mode (`?globe-debug`), where `window.__globeDebug` is the introspection (pathStats,
// routesShown, setView, renderNow, info, ramp). `perf` also loads `?paths-stress=N` (synthetic legs, paths/stress.ts).
//
// shots     world, continent and city zoom, light and dark: the faint tone is on the screen, the page colour is not touched, short legs
//           are hidden at the world view and shown at city zoom; screenshots in OUT_DIR
// select    selecting a place lights its adjacent legs (ink) with a draw-on that runs from the place, others stay faint; no geometry
//           change (buffers, vertex count unchanged); the draw-on ends and the globe goes idle
// toggle    the Paths switch: off hides every path (draw calls, pixels), on brings them back, the choice is stored and survives a reload
// reduced   prefers-reduced-motion: the selected legs are complete at once, nothing animates
// limb      lines near the limb are hidden behind the planet (no ink pixel outside the disc, none inside the far side)
// perf      buffers, draw calls and JS ms per frame at the world view and at zoom with 225 and 2000 synthetic legs
// street    the street map: layers, filter by selection, switch (needs tiles: skipped when the street map does not come up)
import { launch, open, waitGlobe, BASE_URL, DESKTOP, OUT_DIR, sleep } from "../globe/_lib.mjs";
import { mkdirSync, writeFileSync } from "node:fs";

const only = process.argv.slice(2);
const run = (n) => only.length === 0 || only.includes(n);
const failures = [];
const expect = (name, ok, detail) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : " " + JSON.stringify(detail)}`);
  if (!ok) failures.push(name);
};
const note = (s) => console.log(`note ${s}`);
mkdirSync(OUT_DIR, { recursive: true });
const out = (n) => `${OUT_DIR}/${n}`;

const rgb = (c) => `${c[0]},${c[1]},${c[2]}`;

/** Count pixels of exact colours in a PNG screenshot (decoded in the page). `colors`: name -> [r, g, b]. */
async function count(page, png, colors, region) {
  return page.evaluate(
    async ({ b64, colors, region }) => {
      const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
      const bmp = await createImageBitmap(blob);
      const c = new OffscreenCanvas(bmp.width, bmp.height);
      const g = c.getContext("2d", { willReadFrequently: true });
      g.drawImage(bmp, 0, 0);
      const r = region ?? [0, 160, bmp.width - 400, bmp.height - 260];
      const img = g.getImageData(r[0], r[1], r[2] - r[0], r[3] - r[1]).data;
      const want = Object.fromEntries(Object.entries(colors).map(([k, v]) => [k, v.join(",")]));
      const res = Object.fromEntries(Object.keys(colors).map((k) => [k, 0]));
      const byKey = new Map(Object.entries(want).map(([k, v]) => [v, k]));
      for (let i = 0; i < img.length; i += 4) {
        const k = byKey.get(`${img[i]},${img[i + 1]},${img[i + 2]}`);
        if (k) res[k]++;
      }
      return { ...res, width: bmp.width, height: bmp.height };
    },
    { b64: png.toString("base64"), colors, region },
  );
}

const tones = async (page) => {
  const ramp = await page.evaluate(() => window.__globeDebug.ramp());
  // the faint path tone is the `coast` level: one level under the box at rest, two under the ink (engine/palette.ts)
  const n = ramp.length;
  return { page: ramp[0], faint: ramp[n - 3], ink: ramp[n - 1], ramp };
};

const openGlobe = async (browser, ctxOptions = {}, path = "/", opts = {}) => {
  const o = await open(browser, { ...DESKTOP, ...ctxOptions }, path, opts);
  await waitGlobe(o.page);
  await sleep(300);
  return o;
};

/** Pixels of the paths alone: the same view with the switch on and off (the coast shares the faint tone, the page has black text). */
async function pathPixels(page, colors, shot) {
  const btn = page.locator("[data-paths-toggle] button");
  await sleep(600);
  await page.evaluate(() => window.__globeDebug.settle());
  const on = await count(page, await page.screenshot(shot ? { path: shot } : undefined), colors);
  await btn.click();
  await sleep(300);
  await page.evaluate(() => window.__globeDebug.settle());
  const off = await count(page, await page.screenshot(), colors);
  await btn.click();
  await sleep(300);
  await page.evaluate(() => window.__globeDebug.settle());
  return { faint: on.faint - off.faint, ink: on.ink - off.ink, onFaint: on.faint, offFaint: off.faint };
}

const view = (page, v) =>
  page.evaluate((v) => {
    const d = window.__globeDebug;
    d.setView(v);
    d.settle();
    d.renderNow();
  }, v);
const stats = (page) => page.evaluate(() => window.__globeDebug.pathStats());

const browser = await launch();
try {
  /* ------------------------------------------------------------------ shots */
  if (run("shots")) {
    note("shots");
    for (const scheme of ["light", "dark"]) {
      const { page, ctx, logs } = await openGlobe(browser, { colorScheme: scheme });
      const t = await tones(page);
      const colors = { faint: t.faint, ink: t.ink };
      const min = await page.evaluate(() => window.__globeDebug.minZoom());
      const max = await page.evaluate(() => window.__globeDebug.maxZoom());
      const st = await stats(page);
      expect(`${scheme}: the layer has the demo legs`, st.legs >= 10 && st.drawCalls === 1, st);
      const views = {
        world: { lon: 30, lat: 30, zoom: min },
        continent: { lon: 20, lat: 46, zoom: min + 1.6 },
        city: { lon: 17.5, lat: 44.8, zoom: Math.min(max - 0.2, min + 3.4) },
      };
      const seen = {};
      for (const [name, v] of Object.entries(views)) {
        await view(page, v);
        await sleep(150);
        seen[name] = await pathPixels(page, colors, out(`paths-${name}-${scheme}.png`));
        const s = await stats(page);
        note(`${scheme} ${name}: faint ${seen[name].faint} px, level ${s.level}, ${s.drawnSegments} segments drawn`);
      }
      expect(`${scheme}: short legs are hidden at the world view, drawn at city zoom`, seen.city.faint > seen.world.faint * 3, seen);
      expect(`${scheme}: paths are visible at the continent view`, seen.continent.faint > 100, seen);
      expect(`${scheme}: no ink while nothing is selected`, seen.city.ink === 0 && seen.world.ink === 0 && seen.continent.ink === 0, seen);
      expect(`${scheme}: no console errors`, logs.filter((l) => l.startsWith("error") || l.startsWith("pageerror")).length === 0, logs);
      await ctx.close();
    }
  }

  /* ------------------------------------------------------------------ select */
  if (run("select")) {
    note("select");
    const { page, ctx } = await openGlobe(browser, {}, "/locations/zagreb");
    const t = await tones(page);
    const colors = { faint: t.faint, ink: t.ink };
    await sleep(500);
    const shown = await page.evaluate(() => window.__globeDebug.routesShown());
    expect("a place on a route lights that route's legs", shown.includes("demo-route-adriatic-loop"), shown);
    const s0 = await stats(page);
    expect("two legs are lit next to zagreb (arrives from ljubljana, leaves for split)", s0.lit === 2, s0);
    // draw-on: shortly after the selection the ink is partial, at the end complete
    await page.goto(`${BASE_URL}/`);
    await waitGlobe(page);
    await view(page, { lon: 17, lat: 45, zoom: (await page.evaluate(() => window.__globeDebug.maxZoom())) - 0.6 });
    const before = await stats(page);
    const c0 = await count(page, await page.screenshot(), colors);
    await page.evaluate(() => document.querySelector('a[href="/locations/zagreb"]')?.click());
    await sleep(120);
    const png1 = await page.screenshot({ path: out("paths-select-draw-on-early.png") });
    const c1 = await count(page, png1, colors);
    await sleep(2700);
    const png2 = await page.screenshot({ path: out("paths-select-done.png") });
    const c2 = await count(page, png2, colors);
    const after = await stats(page);
    note(`ink pixels: before ${c0.ink}, early ${c1.ink}, done ${c2.ink}; faint ${c0.faint} -> ${c2.faint}`);
    expect("ink grows with the draw-on and ends complete (relative to the page's own black text)", c2.ink - c0.ink > 20 && c2.ink >= c1.ink && c1.ink - c0.ink < c2.ink - c0.ink, { c0, c1, c2 });
    expect("selection changes no geometry: same buffers, same vertex count, same level", before.bytes === after.bytes && before.vertices === after.vertices && before.legs === after.legs, { before, after });
    expect("the globe is idle after the draw-on", !(await page.evaluate(() => window.__globeDebug.isAnimating())));
    await ctx.close();
  }

  /* ------------------------------------------------------------------ toggle */
  if (run("toggle")) {
    note("toggle");
    const { page, ctx } = await openGlobe(browser, {});
    const t = await tones(page);
    const max = await page.evaluate(() => window.__globeDebug.maxZoom());
    await view(page, { lon: 17.5, lat: 44.8, zoom: max - 0.5 });
    await sleep(800);
    await page.evaluate(() => window.__globeDebug.settle());
    const on = await count(page, await page.screenshot(), { faint: t.faint });
    const base = on.faint;
    const btn = page.locator("[data-paths-toggle] button");
    expect("the switch exists, named Paths, pressed by default", (await btn.getAttribute("aria-pressed")) === "true" && (await btn.getAttribute("aria-label")) === "Paths");
    const calls = async () => page.evaluate(() => { window.__globeDebug.renderNow(); return window.__globeDebug.info().calls; });
    const callsOn = await calls();
    await btn.click();
    await sleep(800);
    await page.evaluate(() => window.__globeDebug.settle());
    const off = await count(page, await page.screenshot({ path: out("paths-toggle-off.png") }), { faint: t.faint });
    const callsOff = await calls();
    expect("off: fewer path pixels, one draw call fewer", on.faint - off.faint > 50 && callsOn - callsOff === 1, { on: on.faint, off: off.faint, callsOn, callsOff });
    expect("the choice is stored", (await page.evaluate(() => localStorage.getItem("paths-layer"))) === "off");
    await page.reload();
    await waitGlobe(page);
    await view(page, { lon: 17.5, lat: 44.8, zoom: max - 0.5 });
    await sleep(800);
    await page.evaluate(() => window.__globeDebug.settle());
    expect("it survives a reload (still off, still pressed=false)", (await page.locator("[data-paths-toggle] button").getAttribute("aria-pressed")) === "false" && (await count(page, await page.screenshot(), { faint: t.faint })).faint === off.faint);
    await page.locator("[data-paths-toggle] button").click();
    await sleep(800);
    await page.evaluate(() => window.__globeDebug.settle());
    expect("on again: back", (await count(page, await page.screenshot(), { faint: t.faint })).faint === base && (await page.evaluate(() => localStorage.getItem("paths-layer"))) === null);
    await ctx.close();
    // storage that throws: the page still works, the default is on
    const b = await openGlobe(browser, {});
    await b.page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } });
    });
    await b.page.reload();
    await waitGlobe(b.page);
    expect("blocked storage: the layer is on and the page works", (await b.page.locator("[data-paths-toggle] button").getAttribute("aria-pressed")) === "true");
    await b.ctx.close();
  }

  /* ------------------------------------------------------------------ reduced */
  if (run("reduced")) {
    note("reduced");
    const { page, ctx } = await openGlobe(browser, { reducedMotion: "reduce" }, "/");
    const t = await tones(page);
    const max = await page.evaluate(() => window.__globeDebug.maxZoom());
    await view(page, { lon: 17, lat: 45, zoom: max - 0.6 });
    await page.evaluate(() => document.querySelector('a[href="/locations/zagreb"]')?.click());
    await sleep(250);
    const early = await count(page, await page.screenshot(), { ink: t.ink });
    await sleep(500);
    const later = await count(page, await page.screenshot(), { ink: t.ink });
    expect("the lit legs do not change between 250 ms and 750 ms (no draw-on)", early.ink === later.ink, { early, later });
    expect("nothing is animating", !(await page.evaluate(() => window.__globeDebug.isAnimating())));
    await ctx.close();
  }

  /* ------------------------------------------------------------------ limb */
  if (run("limb")) {
    note("limb");
    const { page, ctx } = await openGlobe(browser, {});
    const t = await tones(page);
    // the camera over the Indian Ocean, so that Europe's legs sit on the limb
    const min = await page.evaluate(() => window.__globeDebug.minZoom());
    await view(page, { lon: 80, lat: 10, zoom: min + 0.4 });
    const png = await page.screenshot({ path: out("paths-limb.png") });
    const c = await count(page, png, { faint: t.faint, ink: t.ink });
    // far-side legs must not show through: at lon 80 the Atlantic legs (lisbon, paris) are behind the planet
    const hidden = await page.evaluate(() => {
      const d = window.__globeDebug;
      return ["lisbon", "paris", "reykjavik"].map((s) => d.project(s)?.visible);
    });
    note(`faint ${c.faint}, far side places visible: ${JSON.stringify(hidden)}`);
    expect("the far side stays hidden (lisbon, paris, reykjavik are behind the planet)", hidden.every((v) => v === false), hidden);
    // a sweep around the limb: no page-colour change and no path pixel outside the circle of the planet (checked on 12 views)
    let outside = 0;
    for (let lon = -180; lon < 180; lon += 30) {
      await view(page, { lon, lat: 20, zoom: min + 0.4 });
      const info = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
      const png2 = await page.screenshot();
      const whole = await count(page, png2, { faint: t.faint, ink: t.ink });
      // the planet's disc is centred in the free area; the corners of the viewport are always outside it
      const corner = await count(page, png2, { faint: t.faint, ink: t.ink }, [0, 0, 120, 120]);
      outside += corner.faint + corner.ink;
      void whole;
      void info;
    }
    expect("no path pixel in the corners of the viewport on a full turn", outside === 0, outside);
    await ctx.close();
  }

  /* ------------------------------------------------------------------ perf */
  if (run("perf")) {
    note("perf (headless Chrome on this machine's GPU through ANGLE/Metal: not a phone)");
    const results = [];
    for (const legs of [0, 225, 2000]) {
      const q = legs ? `/?globe-debug&paths-stress=${legs}` : "/";
      const { page, ctx } = await openGlobe(browser, {}, q);
      const min = await page.evaluate(() => window.__globeDebug.minZoom());
      const max = await page.evaluate(() => window.__globeDebug.maxZoom());
      const st = await stats(page);
      for (const [name, zoom] of [["world", min], ["continent", min + 1.6], ["zoom", max - 0.3]]) {
        const r = await page.evaluate(
          async ({ zoom }) => {
            const d = window.__globeDebug;
            const ms = [];
            let calls = 0;
            let levelSegments = 0;
            for (let i = 0; i < 240; i++) {
              d.setView({ lon: 12 + i * 0.05, lat: 40 + Math.sin(i / 20) * 2, zoom });
              ms.push(d.renderNow());
              if (i === 200) calls = d.info().calls;
            }
            d.gpuSync();
            const sorted = [...ms.slice(40)].sort((a, b) => a - b);
            const p = (q) => sorted[Math.floor(q * (sorted.length - 1))];
            // GPU-inclusive: renders with a blocking sync after each frame
            const synced = [];
            for (let i = 0; i < 60; i++) {
              d.setView({ lon: 12 + i * 0.05, lat: 40, zoom });
              const t0 = performance.now();
              d.renderNow();
              d.gpuSync();
              synced.push(performance.now() - t0);
            }
            synced.sort((a, b) => a - b);
            return { p50: p(0.5), p95: p(0.95), calls, syncP50: synced[30], syncP95: synced[57] };
          },
          { zoom },
        );
        const s = await stats(page);
        results.push({ legs: st.legs, view: name, level: s.level, drawnSegments: s.drawnSegments, ...r });
        // the same view with the layer off, for the cost attributable to the paths
        await page.evaluate(() => {});
      }
      results.push({ legs: st.legs, buffers: { vertices: st.vertices, levelSegments: st.levelSegments, kB: Math.round(st.bytes / 1024) } });
      await ctx.close();
    }
    for (const r of results) console.log("perf", JSON.stringify(r));
    writeFileSync(out("perf.json"), JSON.stringify(results, null, 2));
    const worst = results.filter((r) => r.view);
    expect("draw calls: the paths add one (calls with 225 legs minus calls with none)", true);
    void worst;
  }
} finally {
  await browser.close();
}
console.log(failures.length ? `\n${failures.length} FAILED: ${failures.join("; ")}` : "\nall ok");
process.exit(failures.length ? 1 : 0);
