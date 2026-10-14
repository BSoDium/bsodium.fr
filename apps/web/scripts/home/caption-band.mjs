// The caption's equator snap in a browser (docs/web-architecture.md, "Caption on the sphere"): the rows are fixed parallels centred on the
// equator, so the caption is only shown while the camera's latitude is inside the band (`CAPTION.band`). Whatever latitude the camera is left
// at, when the caption wants to come back the camera glides its LATITUDE (never the longitude) to the band's nearest edge and only then does
// the entrance start; the letters are the size they have at the load view (the owner saw them tiny after a tilt to the south: that cannot be).
// Also: the rows' baselines are equally far apart on the screen at the load view, and a gesture during the glide cancels both cleanly.
//
//   CHROME_PATH=/path/to/chrome BASE_URL=http://localhost:5451 OUT_DIR=/tmp/band node scripts/home/caption-band.mjs
import { mkdirSync } from "node:fs";
import { BASE_URL, OUT_DIR, DESKTOP, MOBILE, launch } from "../globe/_lib.mjs";

mkdirSync(OUT_DIR, { recursive: true });
const failures = [];
const ok = (cond, message) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${message}`);
  if (!cond) failures.push(message);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const QUERY = "?globe-debug&ring&showcase&no-street&hero-idle=60000";
const browser = await launch();

/** The rows now: heights of their ink boxes (CSS px, at the middle of each row) and the baselines' screen heights. */
const rowsOf = (page) =>
  page.evaluate(() => {
    const p = window.__globeDebug.captionProbe();
    const rows = p.rows.slice().sort((a, b) => a.row - b.row);
    const k = (a) => a[Math.floor(a.length / 2)];
    return { lat: p.lat, heights: rows.map((r) => Math.abs(k(r.bottom)[1] - k(r.top)[1])), base: rows.map((r) => k(r.base)[1]), zoom: p.zoom };
  });
const stateOf = (page) => page.evaluate(() => ({ c: window.__globeDebug.caption(), v: window.__globeDebug.view() }));

async function open(options) {
  const ctx = await browser.newContext({ ...options, colorScheme: "dark" });
  const page = await ctx.newPage();
  const logs = [];
  page.on("pageerror", (e) => logs.push(e.message));
  await page.goto(`${BASE_URL}/${QUERY}`);
  await page.waitForFunction(() => window.__globeDebug?.caption()?.phase === "rest", null, { timeout: 60000 });
  await sleep(400);
  return { ctx, page, logs };
}

for (const [label, options] of [["desktop", DESKTOP], ["phone", MOBILE]]) {
  const { ctx, page, logs } = await open(options);
  const band = (await stateOf(page)).c.band.deg;
  const load = await rowsOf(page);
  const loadState = (await stateOf(page)).c;
  load.capR = loadState.lines.map((l) => l.capR);
  load.scale = loadState.scale;
  ok(Math.abs(load.lat) <= band, `${label}: the page loads inside the band (latitude ${load.lat.toFixed(1)}, band +-${band})`);
  const gaps = load.base.slice(1).map((y, i) => y - load.base[i]);
  ok(Math.max(...gaps) - Math.min(...gaps) <= 1, `${label}: the baselines are equally far apart on the screen at the load view (${gaps.map((g) => g.toFixed(2)).join(", ")} px)`);
  const nearTop = load.base[0] > 0;
  ok(nearTop, `${label}: rows measured`);
  for (const start of [-60, -45, -30, 30, 45, 60, 85]) {
    await page.evaluate(() => window.__globeDebug.showcase(false));
    await sleep(350);
    await page.evaluate((lat) => {
      window.__globeDebug.setView({ lat });
      window.__globeDebug.settle();
    }, start);
    const before = await stateOf(page);
    ok(Math.abs(before.v.lat - Math.max(-85, Math.min(85, start))) < 1.5 || Math.abs(before.v.lat) > band, `${label}: left at latitude ${before.v.lat.toFixed(1)} (asked ${start})`);
    await page.evaluate(() => window.__globeDebug.showcase(true));
    // sample the glide: no caption before it has landed
    let early = 0;
    let sawSnap = false;
    let monotonic = true;
    let lastLat = before.v.lat;
    for (let t = 0; t < 4200; t += 40) {
      const s = await stateOf(page);
      if (s.c.band.snapping) {
        sawSnap = true;
        if (s.c.band.shown || s.c.phase !== "hidden") early++;
      }
      if (Math.abs(s.v.lat) > Math.abs(lastLat) + 0.01 && Math.sign(s.v.lat) === Math.sign(lastLat)) monotonic = false;
      lastLat = s.v.lat;
      if (s.c.phase === "rest") break;
      await sleep(40);
    }
    await sleep(300);
    const after = await stateOf(page);
    const rows = await rowsOf(page);
    ok(sawSnap, `${label}: from ${start} the camera glided to the band before the caption`);
    ok(early === 0, `${label}: from ${start} nothing of the caption showed during the glide`);
    ok(monotonic, `${label}: from ${start} the glide went one way (no overshoot)`);
    ok(after.c.phase === "rest" && after.c.band.shown, `${label}: from ${start} the caption came back and is at rest`);
    ok(Math.abs(after.v.lat) <= band + 0.01, `${label}: from ${start} the camera ended inside the band (${after.v.lat.toFixed(2)})`);
    ok(Math.abs(after.v.lon - before.v.lon) < 1e-6, `${label}: from ${start} the longitude did not move (${before.v.lon.toFixed(3)} -> ${after.v.lon.toFixed(3)})`);
    ok(Math.abs(after.v.zoom - before.v.zoom) < 1e-6, `${label}: from ${start} the zoom did not change`);
    // The letters themselves are what the load view has (the same cap height on the planet, the same static fit); what a camera at the band's edge
    // sees is that height foreshortened (a row 20 to 30 degrees from the view's middle: up to a quarter shorter), never the tiny type of a
    // solver that had to shrink the block for a tilt.
    const sizeNow = after.c.lines.map((l) => l.capR);
    ok(sizeNow.every((c) => Math.abs(c - load.capR[0]) < 1e-9) && Math.abs(after.c.scale - load.scale) < 1e-9, `${label}: from ${start} the letters are the load view's size (cap ${sizeNow[0]?.toFixed(4)} radii, scale ${after.c.scale.toFixed(3)})`);
    const worst = Math.max(...rows.heights.map((h, i) => Math.abs(h / load.heights[i] - 1)));
    ok(worst < 0.3, `${label}: from ${start} the rows are within foreshortening of the load view's height (worst ${(worst * 100).toFixed(1)} %: ${rows.heights.map((h) => h.toFixed(1)).join(", ")} against ${load.heights.map((h) => h.toFixed(1)).join(", ")} px)`);
  }
  // The orbit's ends: a row at 70 to 85 degrees of longitude is not cut by a vertical edge (the second canvas's window covers the shell's whole
  // silhouette: every projected point of every row, hidden behind the planet or not, is inside it); and the words are OPAQUE (nothing of the
  // globe shows through a letter's face, outline or thickness).
  for (const deg of [70, 78, 85, -70, -85]) {
    await page.evaluate((d) => window.__globeDebug.pinCaptionAngle(d), deg);
    await sleep(120);
    const r = await page.evaluate(() => {
      const p = window.__globeDebug.captionProbe();
      const el = [...document.querySelectorAll("[data-globe] canvas")].find((c) => c.style.zIndex === "15");
      const b = el.getBoundingClientRect();
      let worst = 0;
      for (const row of p.rows) for (const k of ["top", "bottom", "base"]) for (const [x, y] of row[k]) worst = Math.max(worst, b.left - x, x - b.right, b.top - y, y - b.bottom);
      return { worst, rows: p.rows.length, visible: window.__globeDebug.caption().lines.filter((l) => l.visible).length };
    });
    ok(r.rows > 0 && r.worst <= 0.5, `${label}: at ${deg} degrees every point of the rows is inside the caption's canvas (worst ${r.worst.toFixed(1)} px outside, ${r.visible} rows in view)`);
  }
  await page.evaluate(() => window.__globeDebug.pinCaptionAngle(null));
  {
    await page.evaluate(() => {
      window.__globeDebug.captionDim("none");
      window.__globeDebug.setView({ lon: 25, lat: 6 });
      window.__globeDebug.renderNow();
    });
    await sleep(300);
    const withGlobe = await page.screenshot({ type: "png" });
    const hide = (on, caption) =>
      page.evaluate(([on, caption]) => {
        for (const c of document.querySelectorAll("[data-globe] canvas")) if ((c.style.zIndex === "15") === caption) c.style.visibility = on ? "hidden" : "";
      }, [on, caption]);
    await hide(true, true); // the caption's canvas away: the globe and the page alone
    const noWords = await page.screenshot({ type: "png" });
    await hide(false, true);
    await hide(true, false); // the globe's canvases away: the words over the page's own colour
    const alone = await page.screenshot({ type: "png" });
    await hide(false, false);
    await page.evaluate(() => window.__globeDebug.captionDim(null));
    // The words' pixels are those that change when the caption's canvas is taken away; each must be the colour it has over the bare page.
    const cmp = await page.evaluate(async ([a, c, b]) => {
      const load = async (u) => {
        const img = new Image();
        img.src = `data:image/png;base64,${u}`;
        await img.decode();
        const cv = document.createElement("canvas");
        cv.width = img.width;
        cv.height = img.height;
        const x = cv.getContext("2d");
        x.drawImage(img, 0, 0);
        return x.getImageData(0, 0, cv.width, cv.height).data;
      };
      const [A, C, B] = [await load(a), await load(c), await load(b)];
      const W = Math.round(window.innerWidth * window.devicePixelRatio);
      const n = A.length / 4;
      const word = new Uint8Array(n);
      for (let p = 0; p < n; p++) {
        const i = p * 4;
        word[p] = Math.abs(A[i] - C[i]) + Math.abs(A[i + 1] - C[i + 1]) + Math.abs(A[i + 2] - C[i + 2]) >= 24 ? 1 : 0;
      }
      let ink = 0;
      let seen = 0;
      // (the interior of the words: a pixel whose four neighbours, 3 px away, are the words' too: the edges blend with what is under them)
      for (let p = 3 * W + 3; p < n - 3 * W - 3; p++) {
        if (!word[p] || !word[p - 3] || !word[p + 3] || !word[p - 3 * W] || !word[p + 3 * W]) continue;
        ink++;
        const i = p * 4;
        if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 12) seen++;
      }
      return { ink, seen };
    }, [withGlobe.toString("base64"), noWords.toString("base64"), alone.toString("base64")]);
    ok(cmp.ink > 1500 && cmp.seen / cmp.ink < 0.1, `${label}: the words are opaque: ${cmp.seen} of ${cmp.ink} interior pixels of the words show the globe under them (${((100 * cmp.seen) / Math.max(1, cmp.ink)).toFixed(2)} %)`);
  }
  // a gesture during the glide cancels it and the entrance, cleanly
  await page.evaluate(() => window.__globeDebug.showcase(false));
  await sleep(350);
  await page.evaluate(() => {
    window.__globeDebug.setView({ lat: -55 });
    window.__globeDebug.settle();
  });
  await page.evaluate(() => window.__globeDebug.showcase(true));
  await sleep(250);
  const mid = await stateOf(page);
  ok(mid.c.band.snapping && mid.c.phase === "hidden", `${label}: a glide is under way (${mid.v.lat.toFixed(1)}), nothing is shown`);
  await page.mouse.move(options.viewport.width / 2, options.viewport.height / 2);
  await page.mouse.down();
  await page.mouse.up();
  await sleep(1500);
  const cut = await stateOf(page);
  ok(!cut.c.band.snapping && !cut.c.band.shown && cut.c.phase === "hidden" && !cut.c.showcase, `${label}: a press during the glide ends it and the showcase: no caption, no fighting the pointer`);
  await page.screenshot({ path: `${OUT_DIR}/band-${label}.png` });
  ok(logs.length === 0, `${label}: no page error${logs.length ? `: ${logs[0]}` : ""}`);
  await ctx.close();
}
await browser.close();
if (failures.length) {
  console.log(`\n${failures.length} failed`);
  process.exit(1);
}
console.log("\nAll caption band checks passed.");
