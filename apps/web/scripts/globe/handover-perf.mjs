// Performance and lifecycle numbers for the globe <-> street handover. Prints one JSON report.
//
//   BASE_URL=http://localhost:5175 node apps/web/scripts/globe/handover-perf.mjs [flight|frames|idle|leaks|all] [desktop|mobile]
//
// flight  scripted world -> street flight of the selected place: rAF interval p50/p95/max, frames over 25 ms, heap
// frames  GPU-synced cost of one frame around the cut (both renderers), circular pan
// idle    ticks / rAF calls / street renders over 2.5 s with no input at world, just past the cut (held, the cut fade over) and street scale
// leaks   20 open/close cycles of the mobile slide-over and 20 handover round trips: live WebGL contexts return to baseline
// density (not in `all`; DENSITY_IDLE_S, default 60, sets the idle time) the pixel density is CONSTANT: the globe's art cell, the street map's cell and pixel ratio and the
//         canvases' CSS-to-buffer ratio, sampled every 150 ms, take ONE value each through 60 s of idle (the rotation turning, sky on, labels gliding), a fast wheel
//         sweep world -> street -> world, flights, and the same sweep under a 6x CPU throttle (a slow device: slow frames are what a governor used to react to);
//         no "render quality" line is logged; the value is the one `TUNING.pixelSize` gives for the viewport. Run it against your preview data (BASE_URL).
// Prefer a production build for numbers (the dev server adds overhead): pnpm --filter @catalyst/web build + start.
import { DESKTOP, MOBILE, ensureTiles, launch, openApp, settleApp, state, waitStreetOk } from "./handover-lib.mjs";

const [mode = "all", device = "desktop"] = process.argv.slice(2);
const profile = device === "mobile" ? MOBILE : DESKTOP;
const want = (m) => (mode === "all" && m !== "density") || mode === m;
const pct = (a, p) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? +s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))].toFixed(2) : null;
};
const report = { device, profile: `${profile.viewport.width}x${profile.viewport.height}@${profile.deviceScaleFactor}` };

const tiles = await ensureTiles();
const browser = await launch();
try {
  if (want("flight")) {
    const { page, logs } = await openApp(browser, profile, { path: "/" });
    await page.evaluate(() => {
      window.__iv = [];
      window.__ivz = [];
      let last = 0;
      const f = (t) => {
        if (last) {
          window.__iv.push(t - last);
          window.__ivz.push(window.__handoverDebug?.zoom() ?? 0);
        }
        last = t;
        window.__ivRaf = requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    });
    const heap0 = await page.evaluate(() => performance.memory?.usedJSHeapSize ?? 0);
    await page.evaluate(() => window.__handoverDebug.globe.setView({ lon: 106.7, lat: 10.8, zoom: 2.5 }));
    const t0 = Date.now();
    // select by the list, the same path as a click on a label (on phones the detail slide-over unmounts the globe, so fly directly)
    if (device === "mobile") await page.evaluate(() => window.__handoverDebug.fly({ lon: 106.7009, lat: 10.7769, zoom: 14.5259 }));
    else await page.locator('[data-place-link="ho-chi-minh-city"]').evaluate((a) => a.click());
    await page.waitForFunction(() => window.__handoverDebug.zoom() > 14, null, { timeout: 40000 });
    await settleApp(page);
    const flightMs = Date.now() - t0;
    const iv = await page.evaluate(() => window.__iv);
    const flightIv = iv.slice(0, Math.floor((flightMs / 1000) * 60));
    const zs = await page.evaluate(() => window.__ivz);
    const heap1 = await page.evaluate(() => performance.memory?.usedJSHeapSize ?? 0);
    report.flight = {
      ms: flightMs,
      frames: iv.length,
      rafMs: { p50: pct(flightIv, 50), p95: pct(flightIv, 95), max: pct(flightIv, 100) },
      over25ms: flightIv.filter((x) => x > 25).length,
      slowFramesAtZoom: flightIv.map((x, i) => [x, i]).filter(([x]) => x > 25).map(([x, i]) => [Math.round(x), +(zs[i] ?? 0).toFixed(2)]),
      heapMB: { before: +(heap0 / 1048576).toFixed(1), after: +(heap1 / 1048576).toFixed(1) },
      final: await state(page),
      logs,
    };
    await page.context().close();
  }

  if (want("frames")) {
    const { page } = await openApp(browser, profile, { path: "/" });
    await page.evaluate(() => window.__handoverDebug.globe.setView({ lon: 106.7, lat: 10.8, zoom: 4.4 }));
    await waitStreetOk(page);
    await page.evaluate(() => window.__handoverDebug.globe.setView({ lon: 106.7, lat: 10.8, zoom: 5.0 }));
    await settleApp(page);
    const out = await page.evaluate(async () => {
      const d = window.__handoverDebug;
      const times = [];
      d.forceBlend(0.5);
      for (let i = 0; i < 300; i++) {
        const a = (i / 300) * Math.PI * 2;
        const t0 = performance.now();
        d.globe.setView({ lon: 106.7 + Math.cos(a) * 1.5, lat: 10.8 + Math.sin(a) * 1.5, zoom: 5.0 + 0.1 * Math.sin(a * 2) });
        d.globe.renderNow(); // Three.js render + registered street render + composite, all synchronous
        d.globe.gpuSync();
        d.street().debug().gpuSync();
        times.push(performance.now() - t0);
        await new Promise((r) => requestAnimationFrame(r));
      }
      d.forceBlend(null);
      return times;
    });
    report.frames = { dissolveBandMs: { p50: pct(out, 50), p95: pct(out, 95), max: pct(out, 100) }, note: "both renderers, synchronous, GPU-synced, per frame" };
    await page.context().close();
  }

  if (want("idle")) {
    const { page } = await openApp(browser, profile, { path: "/" });
    const sample = async (label) => {
      const a = await page.evaluate(() => ({ raf: window.__raf.calls, ticks: window.__handoverDebug.ticks(), s: window.__handoverDebug.street()?.debug().renders() ?? 0, p: window.__handoverDebug.street()?.debug().passes() ?? 0 }));
      await page.waitForTimeout(2500);
      const b = await page.evaluate(() => ({ raf: window.__raf.calls, ticks: window.__handoverDebug.ticks(), s: window.__handoverDebug.street()?.debug().renders() ?? 0, p: window.__handoverDebug.street()?.debug().passes() ?? 0 }));
      return [label, { rafCalls: b.raf - a.raf, ticks: b.ticks - a.ticks, streetRenders: b.s - a.s, passRuns: b.p - a.p }];
    };
    const idle = {};
    await settleApp(page);
    await page.waitForTimeout(4500); // the street chunk warm-up (idle callback 2.5 s after load) and its tile requests are not idle time
    const w = await sample("world");
    idle[w[0]] = w[1];
    await page.evaluate(() => window.__handoverDebug.globe.setView({ lon: 106.7, lat: 10.8, zoom: 3.2 }));
    await waitStreetOk(page);
    await page.evaluate(() => window.__handoverDebug.globe.setView({ lon: 106.7, lat: 10.8, zoom: 3.75 }));
    await settleApp(page);
    await page.waitForTimeout(800);
    const m = await sample("just past the cut (zoom 3.75, held)");
    idle[m[0]] = m[1];
    await page.evaluate(() => window.__handoverDebug.globe.setView({ lon: 106.7, lat: 10.8, zoom: 12 }));
    await settleApp(page);
    await page.waitForTimeout(800);
    const s = await sample("street");
    idle[s[0]] = s[1];
    report.idle = idle;
    await page.context().close();
  }

  if (want("density")) {
    const idleS = Number(process.env.DENSITY_IDLE_S ?? 60);
    // Production defaults of the page: the idle rotation and the sky on (debug pages have them off), and a short delay before it turns.
    const { page, ctx } = await openApp(browser, profile, { path: "/?globe-debug&rotate&sky&spin-idle=3000" });
    const quality = [];
    page.on("framenavigated", (f) => f === page.mainFrame() && quality.push(`NAVIGATED ${f.url()}`));
    page.on("console", (m) => {
      if (/render quality|\[globe\] .*level/i.test(m.text())) quality.push(m.text());
    });
    await settleApp(page);
    await page.evaluate(() => {
      window.__cells = { globe: new Set(), street: new Set(), canvases: new Map(), pr: new Set(), samples: 0 };
      const sample = () => {
        const d = window.__handoverDebug;
        if (!d) return;
        const c = window.__cells;
        c.samples++;
        c.globe.add(d.globe.cell());
        const s = d.street();
        if (s) {
          c.street.add(s.debug().cellCss());
          const pr = s.debug().map().getPixelRatio?.();
          if (pr) c.pr.add(+pr.toFixed(6));
        }
        // the cell as the page shows it: CSS size of every pixel-art canvas over its buffer size
        for (const cv of document.querySelectorAll("[data-globe] canvas")) {
          const cssW = parseFloat(cv.style.width);
          if (!(cssW > 0 && cv.width > 0 && cv.height > 0)) continue;
          if (!c.canvases.has(cv)) c.canvases.set(cv, new Set());
          c.canvases.get(cv).add(+(cssW / cv.width).toFixed(4));
        }
      };
      sample();
      window.__cellTimer = setInterval(sample, 150);
    });
    const expected = await page.evaluate(() => {
      const w = Math.min(innerWidth, innerHeight);
      const base = w < 520 ? 2 : 2.5;
      const dpr = devicePixelRatio;
      return Math.max(1, Math.round(base * dpr - 1e-9)) / dpr; // TUNING.pixelSize, restated: a change of the rule must change this too
    });
    const sweep = async (label) => {
      const f0 = await page.evaluate(() => window.__handoverDebug.ticks());
      await page.mouse.move(720, 450);
      for (let i = 0; i < 70; i++) {
        await page.mouse.wheel(0, -160);
        await page.waitForTimeout(25);
      }
      await page.waitForTimeout(600);
      for (let i = 0; i < 70; i++) {
        await page.mouse.wheel(0, 160);
        await page.waitForTimeout(25);
      }
      await page.waitForTimeout(800);
      return { label, zoomAfter: +(await page.evaluate(() => window.__handoverDebug.zoom())).toFixed(2), frames: (await page.evaluate(() => window.__handoverDebug.ticks())) - f0 };
    };
    const phases = [];
    // 1. idle: the world view, the rotation turning (idle time is when it used to be re-evaluated and "recover")
    const t0 = await page.evaluate(() => ({ f: window.__globeDebug.frames(), raf: window.__raf.calls }));
    await page.waitForTimeout(idleS * 1000);
    const t1 = await page.evaluate(() => ({ f: window.__globeDebug.frames(), raf: window.__raf.calls, spin: window.__globeDebug.spin() }));
    phases.push({ label: `idle ${idleS} s, rotation on`, frames: t1.f - t0.f, rafCalls: t1.raf - t0.raf, turning: t1.spin.spinning });
    // 2. a fast zoom sweep from the world view to street scale and back, then flights
    phases.push(await sweep("fast wheel sweep, in and out"));
    await page.evaluate(() => window.__globeDebug.setView({ lon: 21, lat: 43, zoom: window.__globeDebug.minZoom() + 2.2 })); // Europe, the Balkans
    await page.waitForTimeout(500);
    for (const v of [{ lon: 19.04, lat: 47.5, dz: 3.4 }, { lon: 21, lat: 43, dz: 2.2 }, { lon: 106.7, lat: 10.8, dz: 7 }, { lon: 21, lat: 43, dz: 2.2 }]) {
      await page.evaluate((v) => window.__handoverDebug.fly({ lon: v.lon, lat: v.lat, zoom: window.__globeDebug.minZoom() + v.dz }), v);
      await page.waitForTimeout(3500);
    }
    phases.push({ label: "four flights (Balkans, Budapest, street scale, back)" });
    // 3. the same under a 6x CPU throttle: frames now really are slow
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
    phases.push(await sweep("fast wheel sweep under a 6x CPU throttle"));
    await page.evaluate(() => window.__handoverDebug.fly({ lon: 19.04, lat: 47.5, zoom: window.__globeDebug.minZoom() + 3.4 }));
    await page.waitForTimeout(8000); // slow frames for longer than the old governor's 90-frame window and its 4 s dwell
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    await page.waitForTimeout(1500);
    const cells = await page.evaluate(() => {
      clearInterval(window.__cellTimer);
      const c = window.__cells;
      const per = [...c.canvases.values()].map((r) => [...r]);
      return { samples: c.samples, globe: [...c.globe], street: [...c.street], canvases: per.length, canvasesWithMoreThanOneRatio: per.filter((r) => r.length > 1), globeCanvasRatio: per.filter((r) => r.length === 1).map((r) => r[0]), mapPixelRatio: [...c.pr] };
    });
    // Positive control: the sampler does see a change, and the viewport (the phone rule, 520 px) is the one thing that moves the cell.
    await page.setViewportSize({ width: 480, height: 800 });
    await page.waitForTimeout(800);
    const phoneCell = await page.evaluate(() => window.__globeDebug.cell());
    await page.setViewportSize({ width: profile.viewport.width, height: profile.viewport.height });
    await page.waitForTimeout(800);
    const backCell = await page.evaluate(() => window.__globeDebug.cell());
    const levelOk = await page.evaluate(() => window.__handoverDebug.quality === undefined);
    report.density = { expectedCell: expected, ...cells, phases, qualityLogs: quality, noQualityHook: levelOk, viewportControl: { phoneCell, backCell } };
    const only = (a, v) => a.length === 1 && Math.abs(a[0] - v) < 1e-6;
    const checks = {
      "the globe's cell is the one TUNING.pixelSize gives, in every sample": only(cells.globe, expected),
      "the street map's cell is the same, in every sample": cells.street.length === 0 || only(cells.street, expected),
      "the street map's pixel ratio never moved": cells.mapPixelRatio.length <= 1,
      "every canvas keeps ONE css-px-per-buffer-px ratio for as long as it lives (and the globe's is the cell)": cells.canvases >= 1 && cells.canvasesWithMoreThanOneRatio.length === 0 && cells.globeCanvasRatio.some((r) => Math.abs(r - expected) < 1e-3),
      "no render-quality change was ever logged": quality.length === 0,
      "control: a 480 px wide viewport gives the phone cell (2 CSS px) and the desktop size gives 2.5 back": phoneCell === 2 && Math.abs(backCell - expected) < 1e-6,
      "the check exercised idle frames, the rotation and the sweeps": phases[0].turning === true && phases[0].frames > 20 * idleS && phases[1].frames > 50,
    };
    report.density.checks = checks;
    if (!Object.values(checks).every(Boolean)) process.exitCode = 1;
    await page.context().close();
  }

  if (want("leaks")) {
    const { page } = await openApp(browser, MOBILE, { path: "/" });
    const live = () => page.evaluate(() => ({ live: window.__gl.live.size, created: window.__gl.created, lost: window.__gl.lost }));
    const base = await live();
    const cycles = [];
    for (let i = 0; i < 20; i++) {
      await page.locator('[data-place-link="hanoi"]').evaluate((a) => a.click());
      await page.waitForFunction(() => !window.__handoverDebug, null, { timeout: 10000 });
      const open = await live();
      await page.goBack();
      await page.waitForFunction(() => window.__handoverDebug, null, { timeout: 20000 });
      cycles.push(open.live);
    }
    await page.waitForTimeout(500);
    const afterSlide = await live();
    report.slideOver = { baseline: base, whileOpen: [...new Set(cycles)], after20: afterSlide };

    // handover round trips on the desktop profile: world -> street -> world, street unmounted again at the end
    const d = await openApp(browser, DESKTOP, { path: "/" });
    const dl = () => d.page.evaluate(() => ({ live: window.__gl.live.size, created: window.__gl.created, lost: window.__gl.lost }));
    const b0 = await dl();
    const trips = [];
    for (let i = 0; i < 20; i++) {
      await d.page.evaluate(() => window.__handoverDebug.globe.setView({ lon: 106.7, lat: 10.8, zoom: 4.2 }));
      await waitStreetOk(d.page);
      await d.page.evaluate(() => window.__handoverDebug.globe.setView({ lon: 106.7, lat: 10.8, zoom: 9 }));
      await settleApp(d.page);
      const up = await dl();
      await d.page.evaluate(() => window.__handoverDebug.globe.setView({ lon: 106.7, lat: 10.8, zoom: 3 }));
      await d.page.waitForFunction(() => window.__handoverDebug.streetState() === "none", null, { timeout: 15000 });
      await d.page.waitForTimeout(100);
      trips.push(up.live);
    }
    const after = await dl();
    report.roundTrips = { baseline: b0, liveWhileStreet: [...new Set(trips)], after20: after };
  }
} finally {
  await browser.close();
  await tiles.stop();
}
console.log(JSON.stringify(report, null, 1));
