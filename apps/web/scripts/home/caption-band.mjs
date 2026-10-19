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
/**
 * The words alone over MAGENTA (the globe's canvases, the ring and the hero hidden, the page painted magenta): every pixel inside a word, face,
 * outline or thickness, must be exactly its own grey (R = G = B): a thickness that is not fully opaque shows as a magenta tint. Pixels within
 * `edge` device pixels of the page colour are the antialiased silhouette and are not looked at. Returns { interior, tinted, tintedShare }.
 */
async function magentaTest(page, edge = 3) {
  await page.evaluate(() => {
    window.__globeDebug.captionDim("none");
    window.__globeDebug.pinCaption(4000);
    window.__globeDebug.setView({ lon: 25, lat: 6 });
    window.__globeDebug.renderNow();
    for (const c of document.querySelectorAll("[data-globe] canvas")) if (c.style.zIndex !== "15") c.dataset.v = c.style.visibility, (c.style.visibility = "hidden");
    const h = document.querySelector("[data-slot=landing-hero]");
    if (h) h.dataset.v = h.style.visibility, (h.style.visibility = "hidden");
    document.documentElement.dataset.bg = document.documentElement.style.background;
    document.documentElement.style.background = "#ff00ff";
    document.body.style.background = "#ff00ff";
    for (const el of document.querySelectorAll("[data-globe]")) el.style.background = "#ff00ff";
  });
  await sleep(200);
  const rect = await page.evaluate(() => {
    const b = [...document.querySelectorAll("[data-globe] canvas")].find((c) => c.style.zIndex === "15").getBoundingClientRect();
    return { x: b.left, y: b.top, width: b.width, height: b.height };
  });
  const png = await page.screenshot({ type: "png", clip: rect });
  const palette = await page.evaluate(() => {
    const c = window.__globeDebug.caption().colors;
    return [c.face, c.outline, c.side, c.accent].map((v) => v.map((x) => Math.round(x * 255)));
  });
  await page.evaluate(() => {
    for (const c of document.querySelectorAll("[data-globe] canvas")) if (c.dataset.v !== undefined) c.style.visibility = c.dataset.v;
    const h = document.querySelector("[data-slot=landing-hero]");
    if (h) h.style.visibility = h.dataset.v ?? "";
    document.documentElement.style.background = document.documentElement.dataset.bg ?? "";
    document.body.style.background = "";
    for (const el of document.querySelectorAll("[data-globe]")) el.style.background = "";
    window.__globeDebug.captionDim(null);
    window.__globeDebug.pinCaption(null);
  });
  return page.evaluate(
    async ([b64, edge, pal]) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const cv = document.createElement("canvas");
      cv.width = img.width;
      cv.height = img.height;
      const x = cv.getContext("2d");
      x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, cv.width, cv.height).data;
      const W = cv.width;
      const H = cv.height;
      const mag = (i) => d[i] === 255 && d[i + 1] === 0 && d[i + 2] === 255;
      let interior = 0;
      let tinted = 0;
      for (let y = edge; y < H - edge; y++)
        for (let xx = edge; xx < W - edge; xx++) {
          const i = (y * W + xx) * 4;
          if (mag(i)) continue;
          // (the whole square of `edge` device pixels round it: a slit or a counter is an edge too)
          let near = false;
          for (let dy = -edge; dy <= edge && !near; dy++)
            for (let dx = -edge; dx <= edge; dx++)
              if (y + dy >= 0 && y + dy < H && xx + dx >= 0 && xx + dx < W && mag(((y + dy) * W + xx + dx) * 4)) {
                near = true;
                break;
              }
          if (near) continue;
          interior++;
          // (a pixel is the caption's own when it is one of its colours or on the line between two of them, the antialiasing between a face and
          // its contour; anything else was pulled toward the page behind it, magenta here)
          let own = false;
          for (let a = 0; a < pal.length && !own; a++)
            for (let b = a; b < pal.length && !own; b++) {
              const P = pal[a];
              const Q = pal[b];
              const vx = Q[0] - P[0];
              const vy = Q[1] - P[1];
              const vz = Q[2] - P[2];
              const len2 = vx * vx + vy * vy + vz * vz;
              let u = len2 > 0 ? ((d[i] - P[0]) * vx + (d[i + 1] - P[1]) * vy + (d[i + 2] - P[2]) * vz) / len2 : 0;
              u = Math.min(1, Math.max(0, u));
              const dx = P[0] + u * vx - d[i];
              const dy = P[1] + u * vy - d[i + 1];
              const dz = P[2] + u * vz - d[i + 2];
              if (dx * dx + dy * dy + dz * dz < 144) own = true;
            }
          // (not its own: a LEAK is one that a mix with the page behind it, magenta, explains; a junction of three of its own colours is not)
          if (!own) {
            let leak = false;
            for (let k = 0; k < pal.length && !leak; k++)
              for (let al = 0.05; al < 0.96 && !leak; al += 0.05) {
                const ex = pal[k][0] * al + 255 * (1 - al);
                const ey = pal[k][1] * al;
                const ez = pal[k][2] * al + 255 * (1 - al);
                if ((ex - d[i]) ** 2 + (ey - d[i + 1]) ** 2 + (ez - d[i + 2]) ** 2 < 144) leak = true;
              }
            if (leak) tinted++;
          }
        }
      return { interior, tinted, tintedShare: tinted / Math.max(1, interior) };
    },
    [png.toString("base64"), edge, palette],
  );
}

const stateOf = (page) => page.evaluate(() => ({ c: window.__globeDebug.caption(), v: window.__globeDebug.view() }));

async function open(options, scheme = "dark") {
  const ctx = await browser.newContext({ ...options, colorScheme: scheme });
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
    // The owner's bug: the globe's lines showed THROUGH the thickness. Three pictures of the same held frame: everything (A), the caption's canvas
    // over the bare page (B) and over magenta (M). The words are the pixels of M that are not magenta (eroded: the edge's antialiasing blends with
    // what is behind); inside them A and B must be the same colour, so nothing of the globe shows through a face, an outline or a thickness.
    await page.evaluate(() => {
      window.__globeDebug.captionDim("none");
      window.__globeDebug.setView({ lon: 25, lat: 6 });
      window.__globeDebug.pinCaption(4000);
      window.__globeDebug.renderNow();
    });
    await sleep(200);
    const rect = await page.evaluate(() => {
      const b = [...document.querySelectorAll("[data-globe] canvas")].find((c) => c.style.zIndex === "15").getBoundingClientRect();
      return { x: b.left, y: b.top, width: b.width, height: b.height };
    });
    const A = await page.screenshot({ type: "png", clip: rect });
    const hide = (on) =>
      page.evaluate((on) => {
        for (const c of document.querySelectorAll("[data-globe] canvas")) if (c.style.zIndex !== "15") c.style.visibility = on ? "hidden" : "";
        const h = document.querySelector("[data-slot=landing-hero]");
        if (h) h.style.visibility = on ? "hidden" : "";
      }, on);
    await hide(true);
    const B = await page.screenshot({ type: "png", clip: rect });
    await page.evaluate(() => {
      document.documentElement.dataset.bg = document.documentElement.style.background;
      document.documentElement.style.background = "#ff00ff";
      document.body.style.background = "#ff00ff";
      for (const el of document.querySelectorAll("[data-globe]")) el.style.background = "#ff00ff";
    });
    await sleep(100);
    const M = await page.screenshot({ type: "png", clip: rect });
    await page.evaluate(() => {
      document.documentElement.style.background = document.documentElement.dataset.bg ?? "";
      document.body.style.background = "";
      for (const el of document.querySelectorAll("[data-globe]")) el.style.background = "";
      window.__globeDebug.captionDim(null);
      window.__globeDebug.pinCaption(null);
    });
    await hide(false);
    const cmp = await page.evaluate(
      async ([a, b, m, edge]) => {
        const load = async (u) => {
          const img = new Image();
          img.src = `data:image/png;base64,${u}`;
          await img.decode();
          const cv = document.createElement("canvas");
          cv.width = img.width;
          cv.height = img.height;
          const x = cv.getContext("2d");
          x.drawImage(img, 0, 0);
          return { d: x.getImageData(0, 0, cv.width, cv.height).data, w: cv.width, h: cv.height };
        };
        const [PA, PB, PM] = [await load(a), await load(b), await load(m)];
        const mag = (i) => PM.d[i] === 255 && PM.d[i + 1] === 0 && PM.d[i + 2] === 255;
        let interior = 0;
        let seen = 0;
        for (let y = edge; y < PM.h - edge; y++)
          for (let x = edge; x < PM.w - edge; x++) {
            const i = (y * PM.w + x) * 4;
            if (mag(i)) continue;
            let near = false;
            for (let dy = -edge; dy <= edge && !near; dy++)
              for (let dx = -edge; dx <= edge; dx++)
                if (mag(((y + dy) * PM.w + x + dx) * 4)) {
                  near = true;
                  break;
                }
            if (near) continue;
            interior++;
            if (Math.abs(PA.d[i] - PB.d[i]) + Math.abs(PA.d[i + 1] - PB.d[i + 1]) + Math.abs(PA.d[i + 2] - PB.d[i + 2]) > 9) seen++;
          }
        return { interior, seen };
      },
      [A.toString("base64"), B.toString("base64"), M.toString("base64"), label === "phone" ? 4 : 3],
    );
    ok(cmp.interior > 3000 && cmp.seen / cmp.interior < (label === "phone" ? 0.02 : 0.01), `${label}: the words are opaque: ${cmp.seen} of ${cmp.interior} interior pixels of the words differ with and without the globe under them`);
  }
  {
    const m = await magentaTest(page, label === "phone" ? 6 : 4);
    // (a phone's strokes are a few device pixels: only the with-and-without comparison above is exact there; the tint share is looked at on a desktop)
    ok(m.interior > 3000 && (label === "phone" || m.tintedShare < 0.02), `${label}: dark, over magenta, no interior pixel of a word is pulled toward the page behind it (${m.tinted} tinted of ${m.interior})`);
  }
  // The orbit's ends, by pixels: a row turned from 0 to 180 degrees goes round the planet. Its glyph pixels (the caption's canvas alone, over the
  // page's own colour) fall away towards the side without a cliff, it is still there past the shell's horizon (seen from behind, curling back
  // towards the planet), and it ends only when the planet's body hides it. (The first version of the equator layout vanished in the open, beside
  // the planet, at the shell's horizon: its strips were drawn from the front only.)
  {
    await page.evaluate(() => window.__globeDebug.captionDim("none"));
    await page.evaluate(() => {
      for (const c of document.querySelectorAll("[data-globe] canvas")) if (c.style.zIndex !== "15") c.dataset.v = c.style.visibility, (c.style.visibility = "hidden");
      const h = document.querySelector("[data-slot=landing-hero]");
      if (h) h.dataset.v = h.style.visibility, (h.style.visibility = "hidden");
    });
    const rect = await page.evaluate(() => {
      const b = [...document.querySelectorAll("[data-globe] canvas")].find((c) => c.style.zIndex === "15").getBoundingClientRect();
      return { x: b.left, y: b.top, width: b.width, height: b.height };
    });
    const count = async (deg) => {
      await page.evaluate((d) => window.__globeDebug.pinCaptionAngle(d), deg);
      await sleep(60);
      const png = await page.screenshot({ type: "png", clip: rect });
      return page.evaluate(async (b64) => {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const cv = document.createElement("canvas");
        cv.width = img.width;
        cv.height = img.height;
        const x = cv.getContext("2d");
        x.drawImage(img, 0, 0);
        const d = x.getImageData(0, 0, cv.width, cv.height).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - d[0]) + Math.abs(d[i + 1] - d[1]) + Math.abs(d[i + 2] - d[2]) > 14) n++;
        return n;
      }, png.toString("base64"));
    };
    const angles = [];
    for (let a = 0; a <= 180; a += 10) angles.push(a);
    const counts = [];
    for (const a of angles) counts.push(await count(a));
    await page.evaluate(() => {
      for (const c of document.querySelectorAll("[data-globe] canvas")) if (c.dataset.v !== undefined) c.style.visibility = c.dataset.v;
      const h = document.querySelector("[data-slot=landing-hero]");
      if (h) h.style.visibility = h.dataset.v ?? "";
      window.__globeDebug.pinCaptionAngle(null);
      window.__globeDebug.captionDim(null);
    });
    const peak = Math.max(...counts);
    const at = (a) => counts[angles.indexOf(a)];
    ok(at(0) > 2000, `${label}: the rows have glyph pixels in place (${at(0)} px)`);
    ok(at(100) > 0 && at(110) > 0, `${label}: a row is still drawn at 100 and 110 degrees, past the shell's horizon (${at(100)}, ${at(110)} px)`);
    let cliff = null;
    for (let i = 1; i < angles.length; i++) if (counts[i - 1] > 0.1 * peak && counts[i] < 0.05 * counts[i - 1]) cliff = `${angles[i - 1]} -> ${angles[i]}: ${counts[i - 1]} -> ${counts[i]}`;
    ok(cliff === null, `${label}: no cliff in the glyph pixels (${counts.join(", ")}${cliff ? "; cliff " + cliff : ""})`);
    let last = peak;
    let mono = true;
    for (let i = angles.indexOf(60); i < angles.length; i++) {
      if (counts[i] > last * 1.25 + 50) mono = false;
      last = Math.min(last, counts[i]);
    }
    ok(mono, `${label}: the pixels fall away towards the side from 60 degrees (monotone within 25 %)`);
    ok(at(180) < 0.02 * peak, `${label}: and the row ends behind the planet's body (${at(180)} px at 180 degrees)`);
  }
  // The roll (round 8): one continuous path per row. Sampled by holding the caption's clock (`pinCaption(ms)`): the first row's turn at the seams
  // (entrance -> roll at `enter.ms`, roll -> exit at `enter.ms + dwell`) has the same speed on both sides, the roll goes from +amp to -amp over the
  // dwell, and the rows are staggered in it.
  {
    const turnAt = async (ms) => {
      await page.evaluate((ms) => window.__globeDebug.pinCaption(ms), ms);
      await sleep(30);
      return page.evaluate(() => {
        const c = window.__globeDebug.caption();
        return c.lines.filter((l) => l.parent < 2).map((l) => ({ row: l.parent, theta: (l.theta * 180) / Math.PI, side: l.side }));
      });
    };
    const Ein = 900;
    const T = 5500;
    const th = async (ms, row = 0) => (await turnAt(ms)).find((l) => l.row === row).theta;
    const speed = async (a, b) => ((await th(b)) - (await th(a))) / (b - a); // degrees a ms
    const mid = await speed(Ein + 1000, Ein + 1100);
    const vIn = await speed(Ein - 12, Ein - 2);
    const vRoll = await speed(Ein + 2, Ein + 12);
    const vRollEnd = await speed(Ein + T - 12, Ein + T - 2);
    const vOut = await speed(Ein + T + 2, Ein + T + 12);
    const close = (a, b) => Math.abs(a - b) <= 0.12 * Math.abs(b); // (a hair either side of a seam: the acceleration is zero AT it and grows from there)
    ok(close(vIn, mid) && close(vRoll, mid), `${label}: no speed jump entering the roll (${(vIn * 1000).toFixed(2)} / ${(vRoll * 1000).toFixed(2)} against ${(mid * 1000).toFixed(2)} deg/s)`);
    ok(close(vRollEnd, mid) && close(vOut, mid), `${label}: no speed jump leaving the roll (${(vRollEnd * 1000).toFixed(2)} / ${(vOut * 1000).toFixed(2)} against ${(mid * 1000).toFixed(2)} deg/s)`);
    const a0 = await th(Ein);
    const a1 = await th(Ein + T);
    ok(Math.abs(a0 + a1) < 0.2 && Math.abs(a0) > 4 && Math.abs(a0) < 12, `${label}: the roll goes from ${a0.toFixed(2)} to ${a1.toFixed(2)} degrees over the dwell (+amp to -amp)`);
    const r0 = await th(4000, 0);
    const r1 = await th(4000 + 450, 1);
    ok(Math.abs(Math.abs(r0) - Math.abs(r1)) < 0.3, `${label}: the stagger goes on in the roll: row 2 at +450 ms is where row 1 was (${Math.abs(r0).toFixed(2)} / ${Math.abs(r1).toFixed(2)} degrees)`);
    await page.evaluate(() => window.__globeDebug.pinCaption(null));
    await sleep(200);
  }
  // At rest the roll is the caption's own loop: about 30 drawn frames a second, none of them a full frame of the globe; and nothing at all when the
  // caption is hidden (a gesture's fade has run its course).
  {
    const snap = () => page.evaluate(() => ({ c: window.__globeDebug.caption(), frames: window.__globeDebug.frames() }));
    await page.evaluate(() => window.__globeDebug.showcase(false));
    await sleep(500);
    await page.evaluate(() => window.__globeDebug.showcase(true));
    await page.waitForFunction(() => window.__globeDebug.caption().phase === "rest", null, { timeout: 15000 });
    await sleep(300);
    const s0 = await snap();
    await sleep(3000);
    const s1 = await snap();
    const per = (s1.c.captionFrames - s0.c.captionFrames) / 3;
    ok(s1.c.drifting && per > 40 && per < 150 && s1.frames - s0.frames <= 2, `${label}: at rest the roll draws ${per.toFixed(1)} caption frames a second and ${s1.frames - s0.frames} full frames in 3 s (JS ${(((s1.c.captionMs - s0.c.captionMs) / Math.max(1, s1.c.captionFrames - s0.c.captionFrames))).toFixed(2)} ms a frame)`);
    // smoothness: while the roll moves the caption is drawn on every display frame (rAF), the intervals are the display's period, not a timer's
    await page.evaluate(() => window.__globeDebug.traceCaption(true));
    await sleep(3000);
    const trace = await page.evaluate(() => window.__globeDebug.traceCaption(false));
    const ds = trace.map((t) => t[1]).filter((d) => d > 0).sort((x, y) => x - y);
    const med = ds[Math.floor(ds.length / 2)];
    const p95 = ds[Math.floor(ds.length * 0.95)];
    ok(ds.length > 100 && med < 40 && p95 <= 1.6 * med, `${label}: the roll is drawn on every display frame: ${ds.length} frames in 3 s, interval median ${med?.toFixed(1)} ms, p95 ${p95?.toFixed(1)} ms (a timer's would be 50 and uneven)`);
    await page.evaluate(() => window.__globeDebug.showcase(false));
    await sleep(700);
    const h0 = await snap();
    await sleep(1500);
    const h1 = await snap();
    ok(h1.c.phase === "hidden" && h1.c.captionFrames === h0.c.captionFrames && h1.frames === h0.frames, `${label}: hidden, nothing runs (caption frames ${h0.c.captionFrames} -> ${h1.c.captionFrames}, full frames ${h0.frames} -> ${h1.frames})`);
    await page.evaluate(() => window.__globeDebug.showcase(true));
    await page.waitForFunction(() => window.__globeDebug.caption().phase === "rest", null, { timeout: 15000 });
  }
  // The energy pass's hold: after `idleFreezeMs` without an input the roll and the ring stand still (the composition stays), and an input
  // starts them again.
  {
    const snap = () => page.evaluate(() => ({ c: window.__globeDebug.caption(), r: window.__globeDebug.ring(), f: window.__globeDebug.frames() }));
    await page.evaluate(() => window.__globeDebug.energy({ idleFreezeMs: 1500 }));
    await sleep(2600);
    const a0 = await snap();
    await sleep(1500);
    const a1 = await snap();
    // the settle: before everything stops every visible row is in the middle (within a small tolerance), all four in view, one phrase set showing
    const lines = a1.c.lines.filter((l) => l.visible);
    ok(lines.length === 4 && lines.every((l) => Math.abs(l.theta) < 0.01), `${label}: held, every row is in view and in the middle (${lines.map((l) => ((l.theta * 180) / Math.PI).toFixed(2)).join(", ")} degrees)`);
    const [t0, t1] = a1.c.lines.filter((l) => l.parent < 2).sort((x, y) => x.parent - y.parent).map((l) => l.text);
    const PAIRS = [[/^A PERSONAL/, /^ORGANISED/], [/SOFTWARE/, /ARTWORKS/], [/SOFTWARE/, /ARTWORKS/]];
    ok(PAIRS.some(([x, y]) => x.test(t0 ?? "") && y.test(t1 ?? "")), `${label}: held, the two upper rows are one phrase set (${t0} / ${t1})`);
    ok(a1.c.captionFrames === a0.c.captionFrames && a1.r.frames === a0.r.frames && a1.f === a0.f, `${label}: frozen after the idle budget: nothing is drawn in 1.5 s (caption ${a0.c.captionFrames} -> ${a1.c.captionFrames}, ring ${a0.r.frames} -> ${a1.r.frames}, globe ${a0.f} -> ${a1.f})`);
    await page.mouse.move(options.viewport.width / 2 + 3, 12);
    await sleep(1200);
    const a2 = await snap();
    ok(a2.c.captionFrames > a1.c.captionFrames || a2.r.frames > a1.r.frames, `${label}: an input starts the roll and the ring again`);
    await page.evaluate(() => window.__globeDebug.energy({ idleFreezeMs: 0 }));
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
{
  const { ctx, page, logs } = await open(DESKTOP, "light");
  const m = await magentaTest(page, 4);
  ok(m.interior > 3000 && m.tintedShare < 0.02, `light, over magenta, no interior pixel of a word is pulled toward the page behind it (${m.tinted} tinted of ${m.interior})`);
  ok(logs.length === 0, "light: no page error");
  await ctx.close();
}
await browser.close();
if (failures.length) {
  console.log(`\n${failures.length} failed`);
  process.exit(1);
}
console.log("\nAll caption band checks passed.");
