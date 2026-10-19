// Input model checks (Playwright, headless Chrome): the map follows Apple Maps. Prints a JSON report, exit 1 on a failed expectation.
//
//   BASE_URL=http://localhost:5330 node apps/web/scripts/input/check.mjs [name ...]
//
// Needs the app served with CATALYST_TILES_FALLBACK_URL=http://127.0.0.1:5240/places.pmtiles (the script starts the local PMTiles server on that port; see
// scripts/street/_lib.mjs for TILES_FILE) and Chrome for Testing (CHROME_PATH). The events are SYNTHETIC: `WheelEvent`s with the legacy `wheelDeltaY` set the way each
// device sends it (engine/wheel.ts has the table), `PointerEvent`s with two touch pointers, and Safari's `gesture*` as plain events with a `scale`. They prove our
// handlers, not any browser's or device's real stream: nothing here ran on a trackpad, a Magic Mouse, a touch screen or Safari.
//
// Drills:
//   classify   what the classifier says for each device's stream, read back from `?input-debug` (window.__inputDebug)
//   swipe      a two-finger swipe PANS the globe (the zoom does not move; the direction and the amount are a drag's), momentum events add no jump
//   zoom       a ctrl-wheel (trackpad pinch) and a mouse-wheel notch zoom, at the tuned speeds; a mouse-wheel stream through CDP (`page.mouse.wheel`) too
//   anchor     the point under the cursor stays under it (1 px) through a mouse-wheel zoom from the world to street scale, across the cut, and back out
//   offdisc    a cursor beside the planet: no jump, no NaN
//   pinch      two touch pointers: spread zooms about their midpoint; the midpoint moving pans
//   safari     `gesturechange` zooms about the pointer
//   fling      a swipe that stops with no momentum lets go like a drag (inertia); one that decays on its own adds none
//   guard      a wheel over the map is `preventDefault`ed, a wheel over the page's own UI is not
//   street     the standalone street map (/dev/street): swipe pans (no zoom), ctrl-wheel and notch zoom about the pointer (1 px)
import { DESKTOP, ensureTiles, launch, openApp, settleApp, state, waitStreetOk } from "../globe/handover-lib.mjs";
import { FALLBACK_URL, dev, open as openStreet, settle, waitReady } from "../street/_lib.mjs";

// The other checks declare their `page.mouse.wheel` a mouse wheel (globe/_lib.mjs); this one tests the classification itself, so it declares nothing.
process.env.INPUT_KIND = "auto";
const only = process.argv.slice(2);
const results = [];
const failures = [];
const expect = (name, ok, detail) => {
  results.push({ name, ok, detail });
  if (!ok) failures.push(`${name}: ${JSON.stringify(detail)}`);
};
const run = (name) => only.length === 0 || only.includes(name);
const HCMC = { lon: 106.7009, lat: 10.7769 };

/** Page-side driver: dispatches the synthetic streams, spaced like a device's (real timers, so the timestamps are real). */
const DRIVER = () => {
  window.__drive = {
    target: (x, y) => {
      const el = document.elementFromPoint(x, y);
      return el ? `${el.tagName.toLowerCase()}${el.dataset.globe ? "[globe]" : ""}` : null;
    },
    /** events: [{ dx, dy, wy, mode, ctrl, wait }]. Resolves with how many were default-prevented. */
    async stream(x, y, events) {
      const el = document.elementFromPoint(x, y);
      let prevented = 0;
      for (const e of events) {
        const ev = new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          composed: true,
          clientX: x,
          clientY: y,
          deltaX: e.dx ?? 0,
          deltaY: e.dy ?? 0,
          deltaMode: e.mode ?? 0,
          ctrlKey: !!e.ctrl,
          wheelDeltaY: e.wy ?? 0,
          wheelDeltaX: 0,
        });
        el.dispatchEvent(ev);
        if (ev.defaultPrevented) prevented++;
        await new Promise((r) => setTimeout(r, e.wait ?? 16));
      }
      return prevented;
    },
    pointer(type, id, x, y, el) {
      const t = el ?? document.elementFromPoint(x, y);
      t.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: "touch", isPrimary: id === 1, bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: type === "pointerup" ? 0 : 1 }));
    },
    gesture(type, x, y, scale) {
      const el = document.elementFromPoint(x, y);
      const e = new Event(type, { bubbles: true, cancelable: true });
      Object.assign(e, { scale, clientX: x, clientY: y });
      el.dispatchEvent(e);
      return e.defaultPrevented;
    },
  };
};

/** The device streams, as the classifier's table has them. */
const mouseNotches = (n, dy = -100, wait = 40) => Array.from({ length: n }, () => ({ dy, wy: dy < 0 ? 120 : -120, wait }));
function trackpadSwipe({ dx = 0, dy = -40, momentum = true, frames = 40 }) {
  // Momentum as macOS gives it: the fingers ramp up, the OS then decays the speed to nothing over about 25 frames.
  const decay = Array.from({ length: 28 }, (_, k) => 0.85 ** (k + 1));
  const shape = momentum ? [0.1, 0.3, 0.6, 1, ...decay] : [0.2, 0.5, 0.9, 1, 1, 1, 1, 1, 1, 0.95, 0.9];
  return shape.slice(0, frames).map((k, i) => {
    const y = dy * k + Math.sign(dy) * 0.137 * (i % 3) * k;
    return { dx: dx * k ? dx * k + 0.071 * k : 0, dy: y, wy: Math.round(-3 * y), wait: 16 };
  });
}
const pinchStream = (sign, n = 10, step = 2.5) => Array.from({ length: n }, (_, i) => ({ dy: sign * (step + 0.31 * (i % 3)), ctrl: true, wy: Math.round(-3 * sign * step), wait: 16 }));

const view = (page) => page.evaluate(() => window.__handoverDebug.globe.view());
const kinds = (page) => page.evaluate(() => (window.__inputDebug?.entries ?? []).map((e) => e.kind));
const clearLog = (page) => page.evaluate(() => window.__inputDebug?.clear());
const noErrors = (name, logs) => expect(`${name}: no page errors`, !logs.some((l) => l.startsWith("pageerror") || /Uncaught/.test(l)), logs.slice(0, 5));
const DEG = Math.PI / 180;
/** Radius in px per radian at a unified zoom. */
const radiusPx = (zoom) => (512 * 2 ** zoom) / (2 * Math.PI);

const tiles = await ensureTiles();
const browser = await launch();
try {
  const openHome = async (extra = "") => {
    const r = await openApp(browser, DESKTOP, { path: `/?input-debug=1${extra}` });
    await r.page.addInitScript(DRIVER);
    await r.page.evaluate(DRIVER);
    return r;
  };
  const place = (page, v) => page.evaluate((x) => window.__handoverDebug.globe.setView(x), v);
  const cursorAt = (page) => page.evaluate(() => {
    const c = document.querySelector('[data-globe="three"] canvas') ?? document.querySelector("canvas");
    const r = c.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });

  // --- classify -----------------------------------------------------------------------------------------------------------------
  if (run("classify")) {
    const { page, logs } = await openHome();
    await place(page, { lon: 10, lat: 20, zoom: 3 });
    const x = 720;
    const y = 450;
    expect("the cursor point is over the globe canvas", /canvas/.test(await page.evaluate(([a, b]) => window.__drive.target(a, b), [x, y])), null);
    const cases = [
      ["mouse wheel (Chrome, Windows)", mouseNotches(3, 100), "wheel"],
      ["mouse wheel (Firefox, lines)", [{ dy: 3, mode: 1, wy: -120, wait: 60 }, { dy: 3, mode: 1, wy: -120, wait: 60 }], "wheel"],
      ["trackpad swipe, momentum (Chrome/Safari macOS)", trackpadSwipe({ dx: 5, dy: -50 }), "swipe"],
      ["Magic Mouse-like surface scroll", trackpadSwipe({ dx: 12, dy: 20 }), "swipe"],
      ["precision touchpad (whole numbers)", [3, 7, 12, 19, 24, 9].map((v) => ({ dx: v % 2, dy: v, wy: -v - 1, wait: 16 })), "swipe"],
      ["trackpad pinch (ctrl, fractional)", pinchStream(-1), "pinch"],
      ["ctrl + mouse wheel", [{ dy: -100, ctrl: true, wy: 120, wait: 40 }], "wheel"],
    ];
    for (const [name, events, want] of cases) {
      await page.waitForTimeout(350); // a new stream
      await clearLog(page);
      await place(page, { lon: 10, lat: 20, zoom: 3 });
      await page.evaluate(([a, b, ev]) => window.__drive.stream(a, b, ev), [x, y, events]);
      await page.waitForTimeout(150);
      const k = await kinds(page);
      expect(`classify: ${name} -> ${want}`, k.length > 0 && k.every((v) => v === want), k);
    }
    noErrors("classify", logs);
    await page.context().close();
  }

  // --- swipe ----------------------------------------------------------------------------------------------------------------------
  if (run("swipe")) {
    const { page, logs } = await openHome();
    for (const [name, dir] of [["up", { dx: 0, dy: -45 }], ["down", { dx: 0, dy: 45 }], ["right", { dx: 40, dy: 0 }], ["diagonal", { dx: -30, dy: 30 }]]) {
      await page.waitForTimeout(400);
      await place(page, { lon: 10, lat: 20, zoom: 3 });
      const v0 = await view(page);
      const events = trackpadSwipe(dir);
      await page.evaluate((ev) => window.__drive.stream(720, 450, ev), events);
      await page.waitForTimeout(250);
      const v1 = await view(page);
      const r = radiusPx(v0.zoom);
      // The drag's own maths (engine/renderer.ts panPixels), step by step: the longitude's scale follows the latitude as it changes.
      let wantLat = v0.lat;
      let wantLon = v0.lon;
      for (const e of events) {
        wantLon += e.dx / (r * Math.max(0.15, Math.cos(wantLat * DEG))) / DEG;
        wantLat -= e.dy / r / DEG;
      }
      expect(`swipe ${name}: never zooms`, Math.abs(v1.zoom - v0.zoom) < 1e-9, { z0: v0.zoom, z1: v1.zoom });
      expect(`swipe ${name}: pans like a drag (content follows the fingers)`, Math.abs(v1.lat - wantLat) < 0.03 * Math.max(1, Math.abs(wantLat - v0.lat)) + 0.01 && Math.abs(v1.lon - wantLon) < 0.03 * Math.max(1, Math.abs(wantLon - v0.lon)) + 0.01, { from: v0, to: v1, want: { lon: wantLon, lat: wantLat } });
    }
    noErrors("swipe", logs);
    await page.context().close();
  }

  // --- zoom speeds ------------------------------------------------------------------------------------------------------------------
  if (run("zoom")) {
    const { page, logs } = await openHome();
    await place(page, { lon: 10, lat: 20, zoom: 3 });
    const z0 = (await view(page)).zoom;
    const pinch = pinchStream(-1, 10, 2.5);
    const want = pinch.reduce((a, e) => a - e.dy * 0.036, 0);
    await page.evaluate((ev) => window.__drive.stream(720, 450, ev), pinch);
    const z1 = (await view(page)).zoom;
    expect("ctrl-wheel (pinch) zooms in at the tuned speed", Math.abs(z1 - z0 - want) < 1e-6, { gained: z1 - z0, want });
    await page.evaluate((ev) => window.__drive.stream(720, 450, ev), pinchStream(1, 10, 2.5));
    const z2 = (await view(page)).zoom;
    expect("ctrl-wheel the other way zooms out", z2 < z1 - 0.1, { z1, z2 });
    await page.waitForTimeout(400);
    await page.evaluate((ev) => window.__drive.stream(720, 450, ev), mouseNotches(3, -100, 60));
    const z3 = (await view(page)).zoom;
    expect("mouse-wheel notches zoom in (0.16 a notch of 100)", Math.abs(z3 - z2 - 0.48) < 1e-6, { gained: z3 - z2 });
    await page.waitForTimeout(400);
    // The real thing through CDP: `Input.dispatchMouseEvent` wheel events (legacy wheelDeltaY 120, the way scripts have always zoomed).
    await page.mouse.move(720, 450);
    const z4 = (await view(page)).zoom;
    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(40);
    }
    const z5 = (await view(page)).zoom;
    // (at a device scale factor of 2 the CSS delta is half the one sent: 50 px a notch, 0.08 levels)
    expect("page.mouse.wheel (CDP wheel events) zooms in", Math.abs(z5 - z4 - 0.32) < 1e-6, { gained: z5 - z4 });
    noErrors("zoom", logs);
    await page.context().close();
  }

  // --- anchor: the point under the cursor stays under it, world to street scale and back --------------------------------------------
  if (run("anchor")) {
    const { page, logs } = await openHome();
    // Place HCMC off the centre: the view centred a little west and south of it.
    await place(page, { lon: HCMC.lon - 16, lat: HCMC.lat - 7, zoom: 2.9 });
    await waitStreetOk(page).catch(() => null);
    const cursor = await page.evaluate((c) => {
      const p = window.__handoverDebug.globe.projectExact(c.lon, c.lat);
      return { x: Math.round(p.x), y: Math.round(p.y) };
    }, HCMC);
    expect("anchor: the cursor is well off the centre (otherwise the check proves nothing)", Math.hypot(cursor.x - 720, cursor.y - 450) > 150, cursor);
    expect("anchor: the cursor is over the canvas", /canvas/.test(await page.evaluate(([a, b]) => window.__drive.target(a, b), [cursor.x, cursor.y])), cursor);
    const geo = await page.evaluate((c) => window.__handoverDebug.globe.unprojectExact(c.x, c.y), cursor);
    await page.mouse.move(cursor.x, cursor.y);
    const sample = () =>
      page.evaluate(
        ([g, c]) => {
          const d = window.__handoverDebug;
          const p = d.globe.projectExact(g.lon, g.lat);
          let street = null;
          const s = d.street();
          if (s && d.blend().shown === 1) {
            const m = s.debug().map().project([g.lon, g.lat]);
            const r = s.canvas.getBoundingClientRect();
            street = Math.hypot(m.x + r.left - c.x, m.y + r.top - c.y);
          }
          return { zoom: d.zoom(), globe: Math.hypot(p.x - c.x, p.y - c.y), street, shown: d.blend().shown };
        },
        [geo, cursor],
      );
    let worst = { globe: 0, street: 0 };
    let streetFrames = 0;
    let lastShown = 0;
    let flips = 0;
    let atFlip = null;
    const zooms = [];
    const step = async (dy) => {
      await page.evaluate((e) => window.__drive.stream(e.x, e.y, [{ dy: e.dy, wy: e.dy < 0 ? 120 : -120, wait: 24 }]), { ...cursor, dy });
      const s = await sample();
      zooms.push(s.zoom);
      worst.globe = Math.max(worst.globe, s.globe);
      if (s.street !== null) {
        streetFrames++;
        worst.street = Math.max(worst.street, s.street);
      }
      if (s.shown !== lastShown) {
        flips++;
        atFlip = s;
        lastShown = s.shown;
      }
      return s;
    };
    // In: from the world to the street map's range (the fallback archive reaches map zoom 14).
    for (let i = 0; i < 160; i++) {
      const s = await step(-100);
      if (s.zoom > 12.5) break;
      if (i === 40) await waitStreetOk(page).catch(() => null);
    }
    await settleApp(page).catch(() => null);
    const top = await state(page);
    expect("anchor: reached street scale with the street map drawing", top.blend.shown === 1 && top.zoom > 7, top);
    const s1 = await sample();
    worst.globe = Math.max(worst.globe, s1.globe);
    if (s1.street !== null) worst.street = Math.max(worst.street, s1.street);
    expect("anchor: the point under the cursor stays under it (globe model, whole way in), px", worst.globe < 1, worst);
    expect("anchor: ... and in the street map's own projection while it draws", streetFrames > 5 && worst.street < 1, { streetFrames, worst });
    let maxStep = 0;
    for (let i = 1; i < zooms.length; i++) maxStep = Math.max(maxStep, Math.abs(zooms[i] - zooms[i - 1]));
    expect("anchor: no zoom jump (the notch is 0.16)", maxStep < 0.17 + 1e-6, { maxStep });
    expect("anchor: the handover happened on the way (the street map took over)", flips >= 1, { flips, atFlip });
    expect("anchor: at the cut itself the point is under the cursor in the street map", atFlip === null || atFlip.street === null || atFlip.street < 1, atFlip);
    // Out again.
    worst = { globe: 0, street: 0 };
    for (let i = 0; i < 260; i++) {
      const s = await step(100);
      if (s.zoom < 2.2) break;
    }
    await settleApp(page).catch(() => null);
    expect("anchor: and the whole way back out (until the point leaves the disc), px", worst.globe < 1, worst);
    noErrors("anchor", logs);
    await page.context().close();
  }

  // --- off the disc ----------------------------------------------------------------------------------------------------------------
  if (run("offdisc")) {
    const { page, logs } = await openHome();
    for (const [x, y] of [[40, 450], [1400, 120], [300, 120]]) {
      await place(page, { lon: 20, lat: 30, zoom: 1.2 });
      expect(`offdisc (${x}, ${y}): over the canvas`, /canvas/.test(await page.evaluate(([a, b]) => window.__drive.target(a, b), [x, y])), null);
      const v0 = await view(page);
      for (let i = 0; i < 6; i++) await page.evaluate(([a, b]) => window.__drive.stream(a, b, [{ dy: -100, wy: 120, wait: 30 }]), [x, y]);
      const v1 = await view(page);
      const moved = Math.hypot(v1.lon - v0.lon, v1.lat - v0.lat);
      expect(`offdisc (${x}, ${y}): finite, zoomed in, the view moved a little (not a jump)`, [v1.lon, v1.lat, v1.zoom].every(Number.isFinite) && v1.zoom > v0.zoom + 0.5 && moved < 60, { v0, v1, moved });
    }
    noErrors("offdisc", logs);
    await page.context().close();
  }

  // --- touch pinch --------------------------------------------------------------------------------------------------------------------
  if (run("pinch")) {
    const { page, logs } = await openHome();
    await place(page, { lon: HCMC.lon - 3, lat: HCMC.lat - 2, zoom: 3 });
    const mid = await page.evaluate((c) => {
      const p = window.__handoverDebug.globe.projectExact(c.lon, c.lat);
      return { x: Math.round(p.x), y: Math.round(p.y) };
    }, HCMC);
    const geo = await page.evaluate((c) => window.__handoverDebug.globe.unprojectExact(c.x, c.y), mid);
    const z0 = (await view(page)).zoom;
    await page.evaluate(
      async ({ x, y }) => {
        const d = window.__drive;
        const canvas = document.elementFromPoint(x, y);
        d.pointer("pointerdown", 1, x - 60, y, canvas);
        d.pointer("pointerdown", 2, x + 60, y, canvas);
        for (let i = 1; i <= 20; i++) {
          d.pointer("pointermove", 1, x - 60 - i * 6, y, canvas);
          d.pointer("pointermove", 2, x + 60 + i * 6, y, canvas);
          await new Promise((r) => setTimeout(r, 16));
        }
        d.pointer("pointerup", 1, x - 180, y, canvas);
        d.pointer("pointerup", 2, x + 180, y, canvas);
      },
      mid,
    );
    const v1 = await view(page);
    const after = await page.evaluate((g) => window.__handoverDebug.globe.projectExact(g.lon, g.lat), geo);
    expect("pinch: spreading two touch pointers zooms in (log2 of the distance ratio: 6 -> 2.0 levels)", Math.abs(v1.zoom - z0 - Math.log2(360 / 120)) < 1e-6, { gained: v1.zoom - z0 });
    expect("pinch: the point under the midpoint stays under it (1 px)", Math.hypot(after.x - mid.x, after.y - mid.y) < 1, { after, mid });
    // The midpoint moving pans: both pointers move 80 px right.
    const v2 = await view(page);
    await page.evaluate(
      async ({ x, y }) => {
        const d = window.__drive;
        const canvas = document.elementFromPoint(x, y);
        d.pointer("pointerdown", 1, x - 60, y, canvas);
        d.pointer("pointerdown", 2, x + 60, y, canvas);
        for (let i = 1; i <= 10; i++) {
          d.pointer("pointermove", 1, x - 60 + i * 8, y, canvas);
          d.pointer("pointermove", 2, x + 60 + i * 8, y, canvas);
          await new Promise((r) => setTimeout(r, 16));
        }
        d.pointer("pointerup", 1, x + 20, y, canvas);
        d.pointer("pointerup", 2, x + 140, y, canvas);
      },
      mid,
    );
    const v3 = await view(page);
    expect("pinch: the midpoint moving pans (the content follows, no zoom)", v3.lon < v2.lon - 0.01 && Math.abs(v3.zoom - v2.zoom) < 1e-9, { v2, v3 });
    noErrors("pinch", logs);
    await page.context().close();
  }

  // --- safari ------------------------------------------------------------------------------------------------------------------------------
  if (run("safari")) {
    const { page, logs } = await openHome();
    await place(page, { lon: HCMC.lon - 3, lat: HCMC.lat - 2, zoom: 3 });
    const cur = await page.evaluate((c) => {
      const p = window.__handoverDebug.globe.projectExact(c.lon, c.lat);
      return { x: Math.round(p.x), y: Math.round(p.y) };
    }, HCMC);
    const geo = await page.evaluate((c) => window.__handoverDebug.globe.unprojectExact(c.x, c.y), cur);
    const z0 = (await view(page)).zoom;
    const prevented = await page.evaluate(async ({ x, y }) => {
      const d = window.__drive;
      const out = [d.gesture("gesturestart", x, y, 1)];
      for (let i = 1; i <= 10; i++) {
        out.push(d.gesture("gesturechange", x, y, 1 + i * 0.15));
        await new Promise((r) => setTimeout(r, 16));
      }
      out.push(d.gesture("gestureend", x, y, 2.5));
      return out;
    }, cur);
    const v = await view(page);
    const after = await page.evaluate((g) => window.__handoverDebug.globe.projectExact(g.lon, g.lat), geo);
    expect("safari: gesturechange zooms by log2 of the scale (2.5x: 1.32 levels)", Math.abs(v.zoom - z0 - Math.log2(2.5)) < 1e-6, { gained: v.zoom - z0 });
    expect("safari: about the pointer (1 px)", Math.hypot(after.x - cur.x, after.y - cur.y) < 1, { after, cur });
    expect("safari: every gesture event is default-prevented", prevented.every(Boolean), prevented);
    noErrors("safari", logs);
    await page.context().close();
  }

  // --- fling ---------------------------------------------------------------------------------------------------------------------------
  if (run("fling")) {
    const { page, logs } = await openHome();
    await place(page, { lon: 10, lat: 0, zoom: 3 });
    // No momentum from the device: fingers lift at speed -> inertia like a drag release.
    const fast = Array.from({ length: 12 }, (_, i) => ({ dx: 30 + 0.2 * (i % 2), dy: 0, wy: 0, wait: 16 }));
    await page.evaluate((ev) => window.__drive.stream(720, 450, ev), fast);
    await page.waitForTimeout(110);
    const a = await view(page);
    await page.waitForTimeout(500);
    const b = await view(page);
    expect("fling: a swipe that stops at speed carries on (inertia), the way a drag release does", Math.abs(b.lon - a.lon) > 0.05, { a, b });
    await page.waitForTimeout(600);
    // A swipe whose own momentum decays to nothing adds none.
    await place(page, { lon: 10, lat: 0, zoom: 3 });
    await page.evaluate((ev) => window.__drive.stream(720, 450, ev), trackpadSwipe({ dx: 60, dy: 0 }));
    await page.waitForTimeout(150);
    const c = await view(page);
    await page.waitForTimeout(500);
    const d = await view(page);
    expect("fling: a swipe whose momentum decayed on its own adds no inertia", Math.abs(d.lon - c.lon) < 0.02, { c, d });
    noErrors("fling", logs);
    await page.context().close();
  }

  // --- guard -------------------------------------------------------------------------------------------------------------------------------
  if (run("guard")) {
    const { page, logs } = await openHome();
    const over = await page.evaluate(() => window.__drive.stream(720, 450, [{ dy: 3.3, wy: -10, wait: 1 }, { dy: -100, wy: 120, wait: 1 }, { dy: -2, ctrl: true, wait: 1 }]));
    expect("guard: every wheel over the map is default-prevented (no page scroll, no history swipe)", over === 3, over);
    const ui = await page.evaluate(() => {
      const el = document.querySelector("header, nav, main, [data-slot='site-header']") ?? document.body;
      let prevented = 0;
      for (const ev of [{ deltaY: 40 }, { deltaY: 3.3, ctrlKey: false }]) {
        const e = new WheelEvent("wheel", { bubbles: true, cancelable: true, ...ev });
        el.dispatchEvent(e);
        if (e.defaultPrevented) prevented++;
      }
      return { tag: el.tagName, prevented };
    });
    expect("guard: a wheel over the page's own UI is left alone (native scroll)", ui.prevented === 0, ui);
    const css = await page.evaluate(() => {
      const c = document.querySelector('[data-globe="three"] canvas') ?? document.querySelector("canvas");
      const s = getComputedStyle(c);
      return { touchAction: s.touchAction, overscroll: s.overscrollBehavior };
    });
    expect("guard: the canvas has touch-action none and overscroll-behavior none", css.touchAction === "none" && /none/.test(css.overscroll), css);
    noErrors("guard", logs);
    await page.context().close();
  }

  // --- the standalone street map ---------------------------------------------------------------------------------------------------------------
  if (run("street")) {
    const { page, logs } = await openStreet(browser, DESKTOP);
    await page.addInitScript(DRIVER);
    await page.goto(dev("/dev/street", { fallbackUrl: FALLBACK_URL, hud: 0, "input-debug": 1 }));
    await waitReady(page);
    await settle(page);
    await page.evaluate(DRIVER);
    const map = (fn, arg) => page.evaluate(fn, arg);
    await map(() => window.__streetDebug.map().jumpTo({ center: [106.7009, 10.7769], zoom: 12 }));
    await settle(page);
    const cam = () => map(() => { const m = window.__streetDebug.map(); const c = m.getCenter(); return { lon: c.lng, lat: c.lat, zoom: m.getZoom() }; });
    const c0 = await cam();
    const proj = (lon, lat) => map(([a, b]) => { const q = window.__streetDebug.map().project([a, b]); return { x: q.x, y: q.y }; }, [lon, lat]);
    const p0 = await proj(c0.lon, c0.lat);
    const swipe = trackpadSwipe({ dx: 20, dy: 50 });
    await page.evaluate((ev) => window.__drive.stream(720, 450, ev), swipe);
    await page.waitForTimeout(200);
    const c1 = await cam();
    const p1 = await proj(c0.lon, c0.lat);
    const sx = swipe.reduce((a, e) => a + e.dx, 0);
    const sy = swipe.reduce((a, e) => a + e.dy, 0);
    expect("street: a two-finger swipe never zooms", Math.abs(c1.zoom - c0.zoom) < 1e-9, { c0, c1 });
    expect("street: ... it pans by the wheel's own pixels, the content following the fingers (1 px)", Math.abs(p1.x - p0.x + sx) < 1 && Math.abs(p1.y - p0.y + sy) < 1, { moved: [p1.x - p0.x, p1.y - p0.y], wheel: [sx, sy] });
    // Anchored zoom about the cursor.
    const cur = { x: 1000, y: 300 };
    const geo = await map(([x, y]) => { const m = window.__streetDebug.map(); const r = m.getCanvasContainer().getBoundingClientRect(); const g = m.unproject([x - r.left, y - r.top]); return { lng: g.lng, lat: g.lat }; }, [cur.x, cur.y]);
    const fixed = async (name) => {
      const p = await map(([g]) => { const m = window.__streetDebug.map(); const r = m.getCanvasContainer().getBoundingClientRect(); const q = m.project([g.lng, g.lat]); return { x: q.x + r.left, y: q.y + r.top }; }, [geo]);
      expect(`street: ${name}: the point under the cursor stays under it (1 px)`, Math.hypot(p.x - cur.x, p.y - cur.y) < 1, { p, cur });
    };
    const z0 = (await cam()).zoom;
    await page.waitForTimeout(400);
    await page.evaluate((ev) => window.__drive.stream(1000, 300, ev), pinchStream(-1, 10, 2.5));
    const z1 = (await cam()).zoom;
    const wantStreet = pinchStream(-1, 10, 2.5).reduce((a, e) => a - e.dy * 0.036, 0);
    expect("street: ctrl-wheel zooms in at the same pinch rate as the globe (0.036 a px)", Math.abs(z1 - z0 - wantStreet) < 0.02, { gained: z1 - z0, wantStreet });
    await fixed("ctrl-wheel in");
    await page.waitForTimeout(400);
    await page.evaluate((ev) => window.__drive.stream(1000, 300, ev), mouseNotches(3, -100, 60));
    const z2 = (await cam()).zoom;
    expect("street: mouse-wheel notches zoom in (3 x 0.16)", Math.abs(z2 - z1 - 0.48) < 0.02, { z1, z2 });
    await fixed("mouse wheel in");
    await page.waitForTimeout(400);
    await page.evaluate((ev) => window.__drive.stream(1000, 300, ev), mouseNotches(5, 100, 60));
    await fixed("mouse wheel out");
    const kindsSeen = await kinds(page);
    expect("street: the classifier ran (swipe, pinch and wheel all seen)", ["swipe", "pinch", "wheel"].every((k) => kindsSeen.includes(k)), [...new Set(kindsSeen)]);
    const prevented = await page.evaluate(() => window.__drive.stream(720, 450, [{ dy: 2.5, wy: -7, wait: 1 }]));
    expect("street: wheel over the map is default-prevented", prevented === 1, prevented);
    noErrors("street", logs);
    await page.context().close();
  }
} finally {
  await browser.close();
  await tiles.stop();
}

console.log(JSON.stringify({ passed: results.filter((r) => r.ok).length, failed: failures.length, results: results.filter((r) => !r.ok || process.env.VERBOSE) }, null, 1));
if (failures.length) {
  console.error(`\n${failures.length} failed:\n${failures.join("\n")}`);
  process.exit(1);
}
