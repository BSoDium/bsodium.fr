// The landing hero in a browser (docs/landing.md): at rest over the globe with real text (the owner's name on one line at desktop width,
// stacked on a phone), the globe still draggable beneath it, the collapse on the first gesture, the way back after the idle delay (and
// only at the world view), the header carrying no section links while the hero's rows are the sections (and taking them back when the
// rows are hidden), the icons at their scale, reduced motion, the credits line never covered, the four viewports, the keyboard path and
// the search palette, no console error and no hydration warning.
// Works against `pnpm dev` (the owner's preview data) and `pnpm dev:demo`; it asserts nothing about which places there are.
//
//   CHROME_PATH=/path/to/chrome BASE_URL=http://localhost:5451 OUT_DIR=/tmp/hero node scripts/home/hero.mjs
//
// Exit code 1 on any failed assertion. Screenshots (rest and collapsed, both schemes, the four viewports) go to OUT_DIR.
// The shortened idle (`?hero-idle=MS`) is honoured in debug mode (`?globe-debug`) only; the check of the real 8 s delay runs without it.
import { mkdirSync } from "node:fs";
import { BASE_URL, OUT_DIR, DESKTOP, MOBILE, launch } from "../globe/_lib.mjs";

mkdirSync(OUT_DIR, { recursive: true });
const failures = [];
const ok = (cond, message) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${message}`);
  if (!cond) failures.push(message);
};

const browser = await launch();
const LANDSCAPE = { ...MOBILE, viewport: { width: 844, height: 390 } };
const VIEWPORTS = [
  ["1440x900", DESKTOP],
  ["1024x700", { viewport: { width: 1024, height: 700 }, deviceScaleFactor: 2 }],
  ["390x844", MOBILE],
  ["844x390", LANDSCAPE],
];
const IDLE_QUERY = "?globe-debug&hero-idle=1500";
const PATHS = ["/projects", "/articles", "/artworks", "/poems"];

async function newPage(contextOptions, { colorScheme = "dark", reducedMotion = "no-preference" } = {}) {
  const ctx = await browser.newContext({ ...contextOptions, colorScheme, reducedMotion });
  const page = await ctx.newPage();
  const logs = [];
  page.on("console", (m) => {
    // (the motion library's own notice that reduced motion is on is information about the test's emulation, not a fault)
    if (["error", "warning"].includes(m.type()) && !/Reduced Motion enabled on your device/.test(m.text())) logs.push(`${m.type()}: ${m.text().split("\n")[0]}`);
  });
  page.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));
  return { ctx, page, logs };
}

const hero = (page) => page.locator("[data-slot=landing-hero]");
const heroState = (page) => hero(page).getAttribute("data-hero");
const waitGlobe = (page) => page.waitForSelector('[data-globe="three"][data-state="ready"]', { timeout: 30000 });
const waitDebug = (page) => page.waitForFunction(() => window.__globeDebug && window.__globeDebug.view(), null, { timeout: 30000 });
const waitState = (page, state, timeout = 5000) => page.waitForFunction((s) => document.querySelector("[data-slot=landing-hero]")?.getAttribute("data-hero") === s, state, { timeout });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const view = (page) => page.evaluate(() => window.__globeDebug.view());
const opacityOf = (page, selector) => page.evaluate((s) => Number(getComputedStyle(document.querySelector(s)).opacity), selector);

/** Where the visible hero text and controls are, in CSS px, and where the credits line, the header and the dev badge are. */
async function geometry(page) {
  return page.evaluate(() => {
    const box = (b) => ({ l: b.left, t: b.top, r: b.right, b: b.bottom });
    const el = (s) => document.querySelector(s);
    // The text's box is the font's content area (ascent to descent): the letters' ink ends higher than its bottom. Trim by the difference
    // between the font's descent and what these letters actually draw below the baseline (the "y"), so the check is about ink.
    const textBox = (node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      const b = box(range.getBoundingClientRect());
      const cs = getComputedStyle(node);
      const ctx = document.createElement("canvas").getContext("2d");
      ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const m = ctx.measureText(node.textContent);
      if (m.fontBoundingBoxDescent !== undefined && m.actualBoundingBoxDescent !== undefined) b.b -= Math.max(0, m.fontBoundingBoxDescent - m.actualBoundingBoxDescent);
      return b;
    };
    const shown = (node) => {
      const cs = getComputedStyle(node);
      // (`display: none` has no box: the how-to line is not drawn on a wide, short window)
      return cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity) > 0.01;
    };
    const root = el("[data-slot=landing-hero]");
    const state = root.getAttribute("data-hero");
    const inks = [];
    const add = (name, node, text = false) => node && shown(node) && inks.push({ name, ...(text ? textBox(node) : box(node.getBoundingClientRect())) });
    if (state === "rest") {
      add("name", el(".hero-name"), true);
      add("intro", el(".hero-intro"), true);
      add("hint", el(".hero-hint"), true);
      add("search", el(".hero-search"));
      document.querySelectorAll(".hero-row").forEach((a, i) => add(`row${i}`, a));
    } else {
      add("mini-name", el(".hero-mini-name"), true);
      add("mini-hint", el(".hero-mini-hint"), true);
    }
    const credits = el("[data-attribution]");
    const badge = el("[data-dev-content-badge]");
    return {
      state,
      inks,
      credits: credits && box(credits.getBoundingClientRect()),
      header: box(el("header").getBoundingClientRect()),
      nav: box(el("header nav").getBoundingClientRect()),
      badge: badge && box(badge.getBoundingClientRect()),
      vw: innerWidth,
      vh: innerHeight,
      overflowX: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
    };
  });
}
const hit = (a, b) => a.l < b.r - 0.5 && a.r > b.l + 0.5 && a.t < b.b - 0.5 && a.b > b.t + 0.5;

async function layoutChecks(page, label) {
  const g = await geometry(page);
  ok(g.inks.length > 0, `${label}: the hero shows something (${g.inks.map((i) => i.name).join(", ")})`);
  ok(g.credits !== null, `${label}: the credits line is there`);
  if (g.credits) ok(!g.inks.some((i) => hit(i, g.credits)), `${label}: nothing of the hero covers the credits line`);
  if (g.badge) ok(!g.inks.some((i) => hit(i, g.badge)), `${label}: nothing of the hero covers the dev badge`);
  ok(g.inks.every((i) => i.l >= -0.5 && i.r <= g.vw + 0.5 && i.b <= g.vh + 0.5), `${label}: everything is inside the viewport`);
  ok(g.inks.every((i) => i.t >= g.header.b - 0.5), `${label}: nothing is under the header row (${Math.round(Math.min(...g.inks.map((i) => i.t)))} px from the top, header ends at ${Math.round(g.header.b)})`);
  ok(g.overflowX <= 0, `${label}: no horizontal overflow (${g.overflowX})`);
  ok(g.nav.l >= -0.5 && g.nav.r <= g.vw + 0.5, `${label}: the header row fits (${Math.round(g.nav.l)} to ${Math.round(g.nav.r)} of ${g.vw})`);
  return g;
}

// --- 0. Server-rendered: the hero is in the HTML at rest, with real text (no flash of another state) ----------------------------------
{
  const html = await (await fetch(`${BASE_URL}/`)).text();
  ok(/data-slot="landing-hero"[^>]*data-hero="rest"|data-hero="rest"[^>]*data-slot="landing-hero"/.test(html), "SSR: the hero is in the page at rest");
  ok(/<h1[^>]*class="hero-name[^"]*"[^>]*><span class="hero-given type-thin">Elliot<\/span> <span class="hero-family">/.test(html), "SSR: the name is the page's h1, Elliot (thin) and Négrel-Jerzy");
  ok(/Front-end and UX software engineer based in Paris\. Data visualisation, geospatial and cartography interfaces, design systems, computer graphics\./.test(html), "SSR: who the owner is is real text");
  ok(!/catalyst/i.test(html.replace(/CATALYST_[A-Z_]+/g, "")), "SSR: the code name is nowhere in the home page");
  const header = html.slice(html.indexOf("<header"), html.indexOf("</header>"));
  ok(!/<a /.test(header), "SSR: the header carries no section link while the hero shows its rows");
  ok(/data-slot="search-trigger"/.test(header) && /<nav aria-label="Primary" class="hero-list">/.test(html), "SSR: the header keeps the search; the hero's list is the primary navigation");
  const hrefs = [...html.matchAll(/class="hero-row"[^>]*href="([^"]+)"|href="([^"]+)"[^>]*class="hero-row"/g)].map((m) => m[1] ?? m[2]);
  ok(JSON.stringify(hrefs) === JSON.stringify(PATHS), `SSR: the four lists, in order (${hrefs.join(" ")})`);
  ok((html.match(/<h1[ >]/g) ?? []).length === 1, "SSR: exactly one h1");
}

// --- 1. Desktop: rest, drag beneath the hero, collapse, return ----------------------------------------------------------------------
{
  const { ctx, page, logs } = await newPage(DESKTOP);
  await page.goto(`${BASE_URL}/${IDLE_QUERY}`);
  await waitGlobe(page);
  await waitDebug(page);
  await sleep(1200);
  ok((await heroState(page)) === "rest", "desktop: at rest on load");
  ok((await page.locator("h1").count()) === 1 && (await page.locator("h1").innerText()) === "Elliot Négrel-Jerzy", "desktop: one h1, the owner's name");
  ok(!/catalyst/i.test(await page.evaluate(() => document.title + " " + document.body.innerText)), "desktop: the code name is nowhere in the title or the text");
  const intro = await page.locator(".hero-intro").innerText();
  ok(/^Front-end and UX software engineer based in Paris\. Data visualisation, geospatial and cartography interfaces, design systems, computer graphics\.$/.test(intro), `desktop: the intro says who the owner is (${intro})`);
  const hintText = await page.locator(".hero-hint").innerText();
  ok(/^(Pick a point on the globe, or start from a list\.|No place is published yet: start from a list\.)$/.test(hintText), `desktop: then how to use the page (${hintText})`);
  // the name: one line, within the gutters, the given name thin and the family name heavy
  const nm = await page.evaluate(() => {
    const n = document.querySelector(".hero-name");
    const fs = parseFloat(getComputedStyle(n).fontSize);
    const g = document.querySelector(".hero-given"), f = document.querySelector(".hero-family");
    const r = (e) => { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; };
    const gutter = parseFloat(getComputedStyle(document.querySelector(".landing-hero")).paddingLeft);
    return { fs, given: r(g), family: r(f), gutter, vw: innerWidth, weights: [getComputedStyle(g).fontWeight, getComputedStyle(f).fontWeight], h: n.getBoundingClientRect().height };
  });
  ok(Math.abs(nm.given.t - nm.family.t) < 2 && nm.family.l > nm.given.r, `desktop: the name is on one line (given ${Math.round(nm.given.l)}-${Math.round(nm.given.r)}, family from ${Math.round(nm.family.l)})`);
  ok(nm.family.r <= nm.vw - nm.gutter + 0.5 && nm.family.r >= nm.vw - nm.gutter - 0.2 * nm.vw, `desktop: it fills the width up to the gutter (ends at ${Math.round(nm.family.r)} of ${nm.vw}, gutter ${Math.round(nm.gutter)})`);
  ok(nm.weights.join() === "200,800", `desktop: 200 against 800 (${nm.weights.join(" / ")})`);
  const icons = await page.evaluate(() => {
    const w = (s) => document.querySelector(s)?.getBoundingClientRect().width ?? 0;
    return { arrow: w(".hero-arrow"), rowFont: parseFloat(getComputedStyle(document.querySelector(".hero-row")).fontSize), search: w(".hero-search svg"), headerSearch: w("[data-slot=search-trigger] svg") };
  });
  ok(icons.arrow >= icons.rowFont && icons.arrow <= icons.rowFont * 1.25, `desktop: the row arrows are 1.1 em of the row's text (${icons.arrow.toFixed(1)} px for ${icons.rowFont} px text)`);
  ok(Math.abs(icons.search - 20) < 0.5 && Math.abs(icons.headerSearch - 20) < 0.5, `desktop: the search icons are the control size, 20 px (hero ${icons.search}, header ${icons.headerSearch})`);
  ok((await page.locator(".hero-search > svg").count()) === 1 && (await page.locator(".hero-search [class*=bullet]").count()) === 0, "desktop: the search line starts with the search icon, not a square bullet");
  // the header: the search alone while the rows are the sections
  ok((await page.locator("header a").count()) === 0 && (await page.locator("header [data-slot=search-trigger]").count()) === 1, "desktop: the header has no section link at rest, only the search");
  ok((await page.locator("nav[aria-label=Primary]:visible").count()) === 1 && (await page.locator("header nav").getAttribute("role")) === "none", "desktop: exactly one primary navigation, the hero's list; the header's row is no landmark");
  ok((await page.locator("[data-slot=hero-search]").innerText()).includes("Search places and entries"), "desktop: the search line is labelled");
  ok((await page.locator(".hero-row").evaluateAll((as) => as.map((a) => a.getAttribute("href")))).join() === PATHS.join(), "desktop: the four rows link to the lists");
  const pe = await page.evaluate(() => ({
    root: getComputedStyle(document.querySelector("[data-slot=landing-hero]")).pointerEvents,
    block: getComputedStyle(document.querySelector(".hero-block")).pointerEvents,
    search: getComputedStyle(document.querySelector(".hero-search")).pointerEvents,
    row: getComputedStyle(document.querySelector(".hero-row")).pointerEvents,
    intro: getComputedStyle(document.querySelector(".hero-intro")).pointerEvents,
    name: getComputedStyle(document.querySelector(".hero-name")).pointerEvents,
  }));
  ok(pe.root === "none" && pe.block === "none" && pe.intro === "none" && pe.name === "none" && pe.search === "auto" && pe.row === "auto", `desktop: pointer-events none except the search line and the rows (${JSON.stringify(pe)})`);
  const g = await layoutChecks(page, "desktop rest");
  await page.screenshot({ path: `${OUT_DIR}/hero-rest-1440-dark.png` });

  // a drag that starts on the wordmark (the hero is over the globe there, and ignores the pointer)
  const name = await page.locator(".hero-name").boundingBox();
  const x = name.x + name.width * 0.4;
  const y = name.y + name.height * 0.5;
  const beneath = await page.evaluate(([px, py]) => document.elementFromPoint(px, py)?.tagName, [x, y]);
  ok(beneath === "CANVAS" || beneath === "DIV", `desktop: the point under the wordmark reaches the globe's stage (${beneath})`);
  const v0 = await view(page);
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(x + i * 14, y - i * 5);
  await page.mouse.up();
  await sleep(150);
  const v1 = await view(page);
  ok(Math.abs(v1.lon - v0.lon) > 1 || Math.abs(v1.lat - v0.lat) > 1, `desktop: a drag through the hero turned the globe (lon ${v0.lon.toFixed(1)} to ${v1.lon.toFixed(1)})`);
  ok((await heroState(page)) === "collapsed", "desktop: the first gesture collapses the hero");
  await sleep(450);
  ok((await opacityOf(page, ".hero-intro")) === 0 && (await opacityOf(page, ".hero-list")) === 0 && (await opacityOf(page, ".hero-search")) === 0, "desktop: the text has faded out");
  ok((await opacityOf(page, ".hero-mini")) === 1, "desktop: the small line is shown");
  const mini = await page.locator(".hero-mini").innerText();
  ok(/Elliot/.test(mini) && /Négrel-Jerzy/.test(mini) && /Drag to explore\. Back to start after a moment\./.test(mini), `desktop: the small line is the name and the hint (${mini.replace(/\n/g, " ")})`);
  // the rows are hidden now: the header takes the sections back, so the visitor is never left without a way to the lists
  const collapsedLinks = await page.locator("header a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  ok(JSON.stringify(collapsedLinks) === JSON.stringify(["/", ...PATHS]), `desktop: collapsed, the header shows Globe and the four sections (${collapsedLinks.join(" ")})`);
  ok((await page.locator("nav[aria-label=Primary]:visible").count()) === 1, "desktop: collapsed, still exactly one primary navigation (the header's)");
  ok((await page.locator(".hero-row").first().evaluate((a) => getComputedStyle(a).visibility)) === "hidden", "desktop: the hidden rows are out of the tab order (visibility hidden)");
  ok((await page.locator("h1").count()) === 1 && (await page.locator("h1").evaluate((h) => getComputedStyle(h).visibility)) !== "hidden", "desktop: the h1 stays in the accessibility tree");
  const m = await layoutChecks(page, "desktop collapsed");
  ok(m.inks.length === 2, "desktop collapsed: the name and the hint, nothing else");
  await page.screenshot({ path: `${OUT_DIR}/hero-collapsed-1440-dark.png` });

  // the way back: not before the delay, then at rest again (1.5 s here; the real 8 s is checked below)
  await sleep(300);
  ok((await heroState(page)) === "collapsed", "desktop: still collapsed before the idle delay");
  await waitState(page, "rest", 4000);
  ok(true, "desktop: back at rest after the idle delay at the world view");
  await sleep(400);
  ok((await opacityOf(page, ".hero-intro")) === 1 && (await opacityOf(page, ".hero-mini")) === 0, "desktop: the text is back and the small line is gone");
  ok((await page.locator("header a").count()) === 0, "desktop: back at rest, the header gives the sections up again");

  // zoomed in: it collapses and does not come back; zoomed out again: it does
  await page.mouse.move(720, 300);
  for (let i = 0; i < 4; i++) await page.mouse.wheel(0, -500);
  await sleep(300);
  const vz = await view(page);
  ok(vz.zoom > 1, `desktop: the wheel zoomed in (zoom ${vz.zoom.toFixed(2)})`);
  ok((await heroState(page)) === "collapsed" && (await hero(page).getAttribute("data-world")) === "false", "desktop: zoomed in, the hero is collapsed and the world view is false");
  ok((await opacityOf(page, ".hero-mini-hint")) === 0, "desktop: zoomed in, the 'back to start' hint is not promised");
  await sleep(2600);
  ok((await heroState(page)) === "collapsed", "desktop: zoomed in, it does not come back after the idle delay");
  for (let i = 0; i < 8; i++) await page.mouse.wheel(0, 600);
  await sleep(500);
  ok((await hero(page).getAttribute("data-world")) === "true", "desktop: zoomed out to the world view again");
  await waitState(page, "rest", 4000);
  ok(true, "desktop: and it comes back after the idle delay");
  ok(logs.length === 0, `desktop: no console error or warning${logs.length ? ` (${logs.join(" | ")})` : ""}`);
  await ctx.close();
}

// --- 2. The real delay: 8 s (no debug, no override) --------------------------------------------------------------------------------
{
  const { ctx, page, logs } = await newPage(DESKTOP);
  await page.goto(`${BASE_URL}/`);
  await waitGlobe(page);
  await sleep(1200);
  await page.mouse.move(700, 300);
  await page.mouse.wheel(0, 120);
  await waitState(page, "collapsed", 1000);
  const t0 = Date.now();
  await sleep(6500);
  ok((await heroState(page)) === "collapsed", "real delay: still collapsed after 6.5 s");
  await waitState(page, "rest", 4000);
  const dt = (Date.now() - t0) / 1000;
  ok(dt > 7 && dt < 10, `real delay: back after about 8 s (${dt.toFixed(1)} s)`);
  ok(logs.length === 0, `real delay: no console error or warning${logs.length ? ` (${logs.join(" | ")})` : ""}`);
  await ctx.close();
}

// --- 3. The four viewports, both schemes: layout and the credits line --------------------------------------------------------------------
for (const [name, options] of VIEWPORTS) {
  for (const scheme of ["dark", "light"]) {
    const { ctx, page, logs } = await newPage(options, { colorScheme: scheme });
    await page.goto(`${BASE_URL}/${IDLE_QUERY}`);
    await waitGlobe(page);
    await waitDebug(page);
    await sleep(1000);
    const label = `${name} ${scheme}`;
    await layoutChecks(page, `${label} rest`);
    {
      // the name: stacked on a phone (given over family, the family name filling the width), one line from 48 rem; never wider than the gutters
      const n = await page.evaluate(() => {
        const r = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; };
        return { given: r(".hero-given"), family: r(".hero-family"), vw: innerWidth, gutter: parseFloat(getComputedStyle(document.querySelector(".landing-hero")).paddingLeft) };
      });
      const stacked = options.viewport.width < 768;
      ok(stacked ? n.family.t > n.given.b - 0.2 * (n.given.b - n.given.t) : Math.abs(n.family.t - n.given.t) < 2, `${label}: the name is ${stacked ? "stacked" : "on one line"}`);
      ok(n.family.r <= n.vw - n.gutter + 0.5 && n.given.l >= 0, `${label}: the name is inside the gutters (right edge ${Math.round(n.family.r)} of ${n.vw})`);
    }
    if (!(name === "1440x900" && scheme === "dark")) await page.screenshot({ path: `${OUT_DIR}/hero-rest-${name}-${scheme}.png` });
    // the first gesture: a touch tap or a drag on the globe's stage where neither the hero's text nor a place marker is (the upper right:
    // a tap on a marker would open its place, which is a different state)
    const gx = options.viewport.width * 0.92, gy = options.viewport.height * 0.25;
    if (options.hasTouch) await page.touchscreen.tap(gx, gy);
    else {
      await page.mouse.move(gx, gy);
      await page.mouse.down();
      await page.mouse.move(gx - options.viewport.width * 0.03, gy + options.viewport.height * 0.02, { steps: 5 });
      await page.mouse.up();
    }
    await waitState(page, "collapsed", 1500);
    await sleep(450);
    await layoutChecks(page, `${label} collapsed`);
    if (!(name === "1440x900" && scheme === "dark")) await page.screenshot({ path: `${OUT_DIR}/hero-collapsed-${name}-${scheme}.png` });
    ok(logs.length === 0, `${label}: no console error or warning${logs.length ? ` (${logs.join(" | ")})` : ""}`);
    await ctx.close();
  }
}

// --- 4. A small phone: the header row still fits, and its one-word search works ----------------------------------------------------------
for (const width of [320, 360, 390, 430]) {
  const { ctx, page, logs } = await newPage({ ...MOBILE, viewport: { width, height: 740 } });
  await page.goto(`${BASE_URL}/`);
  await waitGlobe(page);
  const g = await geometry(page);
  ok(g.nav.l >= 0 && g.nav.r <= g.vw, `${width} px: the header row fits (${Math.round(g.nav.l)} to ${Math.round(g.nav.r)})`);
  ok(g.overflowX <= 0, `${width} px: no horizontal overflow`);
  const compact = page.locator("[data-slot=search-trigger-compact]");
  ok(await compact.isVisible(), `${width} px: the header has a text search button`);
  const box = await compact.boundingBox();
  ok(box.height >= 43.5 && box.width >= 43.5, `${width} px: the header search is a 44 px target (${Math.round(box.width)} x ${Math.round(box.height)})`);
  if (width === 390) {
    await compact.tap();
    await page.waitForSelector("[data-slot=search-palette]", { state: "visible", timeout: 3000 });
    ok(await page.locator("[data-slot=search-palette] input").evaluate((i) => document.activeElement === i), "390 px: the header search opens the palette with the input focused");
    await page.keyboard.press("Escape");
    // and the one in the hero, as a tap
    await page.locator("[data-slot=hero-search]").tap();
    await page.waitForSelector("[data-slot=search-palette]", { state: "visible", timeout: 3000 });
    ok(true, "390 px: the hero's search line opens the same palette");
    await page.keyboard.press("Escape");
  }
  ok(logs.length === 0, `${width} px: no console error or warning${logs.length ? ` (${logs.join(" | ")})` : ""}`);
  await ctx.close();
}

// --- 5. Keyboard: the search and the four links, in order; Cmd/Ctrl-K; the hidden controls are not stops ------------------------------
{
  const { ctx, page, logs } = await newPage(DESKTOP);
  await page.goto(`${BASE_URL}/`);
  await waitGlobe(page);
  await sleep(800);
  const stops = [];
  for (let i = 0; i < 24; i++) {
    await page.keyboard.press("Tab");
    stops.push(await page.evaluate(() => {
      const a = document.activeElement;
      return a ? `${a.tagName.toLowerCase()}${a.getAttribute("data-slot") ? `[${a.getAttribute("data-slot")}]` : ""}${a.getAttribute("href") ? ` ${a.getAttribute("href")}` : ""}` : "none";
    }));
  }
  const at = stops.indexOf("button[hero-search]");
  ok(at > 0, `keyboard: Tab reaches the hero's search line (${stops.slice(0, 12).join(" > ")})`);
  ok(JSON.stringify(stops.slice(at + 1, at + 5)) === JSON.stringify(PATHS.map((p) => `a ${p}`)), `keyboard: then the four lists, in order (${stops.slice(at + 1, at + 5).join(", ")})`);
  ok(stops.indexOf("button[search-trigger]") >= 0 && stops.indexOf("button[search-trigger]") < at, "keyboard: the header's own search comes first, the hero follows (never a trap: focus moves on)");
  ok(stops.slice(at + 5).some((s) => s !== "none"), "keyboard: focus moves on past the hero");

  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press("Control+k");
  await page.waitForSelector("[data-slot=search-palette]", { state: "visible", timeout: 3000 });
  ok(true, "keyboard: Ctrl-K opens the palette");
  await page.keyboard.press("Escape");
  await sleep(250);
  await page.keyboard.press("Meta+k");
  await page.waitForSelector("[data-slot=search-palette]", { state: "visible", timeout: 3000 });
  ok(true, "keyboard: Cmd-K opens the palette");
  await page.keyboard.press("Escape");
  await sleep(250);
  await page.locator("[data-slot=hero-search]").focus();
  await page.keyboard.press("Enter");
  await page.waitForSelector("[data-slot=search-palette]", { state: "visible", timeout: 3000 });
  await page.keyboard.press("Escape");
  await sleep(200);
  ok(await page.locator("[data-slot=hero-search]").evaluate((b) => document.activeElement === b), "keyboard: Enter on the search line opens the palette, Escape gives the focus back to it");
  const kbd = (await page.locator(".hero-kbd").innerText()).replace(/\s+/g, " ").trim();
  const kbdIcon = await page.locator(".hero-kbd svg").count();
  ok(/^(K|Ctrl K)$/.test(kbd) && (kbd === "K" ? kbdIcon === 1 : kbdIcon === 0), `keyboard: the hint is filled in after hydration, the command icon then K or Ctrl K (${kbd}, ${kbdIcon} icon)`);
  // the palette's icons at the scale: the field's and each result's kind
  await page.keyboard.press("Control+k");
  await page.waitForSelector("[data-slot=search-palette]", { state: "visible", timeout: 3000 });
  await page.keyboard.type("a");
  await sleep(250);
  const pal = await page.evaluate(() => {
    const w = (el) => el?.getBoundingClientRect().width ?? 0;
    const d = document.querySelector("[data-slot=search-palette]");
    return { field: w(d.querySelector("svg")), kinds: [...d.querySelectorAll("[data-slot=kind-tag] svg")].map(w), options: d.querySelectorAll("[role=option]").length };
  });
  ok(Math.abs(pal.field - 20) < 0.5, `palette: the field's search icon is 20 px (${pal.field})`);
  ok(pal.kinds.length > 0 && pal.kinds.every((s) => Math.abs(s - 20) < 0.5), `palette: all ${pal.kinds.length} result icons are 20 px, one size`);
  await page.screenshot({ path: `${OUT_DIR}/palette-1440-dark.png` });
  await page.keyboard.press("Escape");
  await sleep(250);

  // collapsed: the hidden controls are not tab stops
  await page.mouse.move(700, 300);
  await page.mouse.wheel(0, 120);
  await waitState(page, "collapsed", 1000);
  await sleep(450);
  await page.evaluate(() => document.activeElement?.blur());
  let heroStops = 0;
  for (let i = 0; i < 24; i++) {
    await page.keyboard.press("Tab");
    heroStops += await page.evaluate(() => (document.activeElement?.closest("[data-slot=landing-hero]") ? 1 : 0));
  }
  ok(heroStops === 0, `keyboard: collapsed, the hidden search line and rows are not tab stops (${heroStops} of 24 stops were in the hero)`);
  ok(logs.length === 0, `keyboard: no console error or warning${logs.length ? ` (${logs.join(" | ")})` : ""}`);
  await ctx.close();
}

// --- 6. Reduced motion: instant -----------------------------------------------------------------------------------------------------
{
  const { ctx, page, logs } = await newPage(DESKTOP, { reducedMotion: "reduce" });
  await page.goto(`${BASE_URL}/${IDLE_QUERY}`);
  await waitGlobe(page);
  await sleep(1000);
  const durations = await page.evaluate(() => [".hero-name", ".hero-intro", ".hero-hint", ".hero-list", ".hero-mini"].map((s) => getComputedStyle(document.querySelector(s)).transitionDuration));
  ok(durations.every((d) => /^0(\.0*1?)?m?s/.test(d) || d === "0s"), `reduced motion: no transition on the hero's parts (${durations.join(" ")})`);
  await page.mouse.move(700, 300);
  await page.mouse.wheel(0, 100);
  await sleep(60);
  ok((await heroState(page)) === "collapsed" && (await opacityOf(page, ".hero-intro")) === 0 && (await opacityOf(page, ".hero-mini")) === 1, "reduced motion: collapsed within 60 ms, text gone and small line there");
  ok(logs.length === 0, `reduced motion: no console error or warning${logs.length ? ` (${logs.join(" | ")})` : ""}`);
  await ctx.close();
}
{
  // and with motion: the fade is 200 to 300 ms and only opacity and transform move
  const { ctx, page } = await newPage(DESKTOP);
  await page.goto(`${BASE_URL}/`);
  await waitGlobe(page);
  const t = await page.evaluate(() => {
    const cs = getComputedStyle(document.querySelector(".hero-intro"));
    return { props: cs.transitionProperty, dur: cs.transitionDuration };
  });
  const first = parseFloat(t.dur.split(",")[0]) * 1000;
  ok(first >= 200 && first <= 300, `motion: the fade is ${first} ms`);
  ok(!/width|height|top|left|margin|padding|font|all/.test(t.props), `motion: only opacity, transform and visibility transition (${t.props})`);
  await ctx.close();
}

// --- 7. A place open: the hero is away, not a second heading ------------------------------------------------------------------------
{
  const { ctx, page, logs } = await newPage(DESKTOP);
  await page.goto(`${BASE_URL}/`);
  await waitGlobe(page);
  const slug = await page.locator("[data-place-link]").first().getAttribute("data-place-link").catch(() => null);
  if (!slug) console.log("SKIP  place open: no published place on this content");
  else {
    await page.goto(`${BASE_URL}/locations/${slug}`);
    await page.waitForSelector("[data-panel]", { state: "visible", timeout: 15000 });
    await sleep(500);
    ok((await heroState(page)) === "away" && (await hero(page).getAttribute("aria-hidden")) === "true", "place open: the hero is away and hidden from assistive technology");
    ok((await page.locator("h1:visible").count()) === 1, "place open: one visible h1 (the panel's)");
    ok((await page.locator("[data-slot=landing-hero]").evaluate((h) => getComputedStyle(h).visibility)) === "hidden", "place open: nothing of the hero is shown");
    await page.keyboard.press("Escape");
  }
  ok(logs.length === 0, `place open: no console error or warning${logs.length ? ` (${logs.join(" | ")})` : ""}`);
  await ctx.close();
}

await browser.close();
if (failures.length) {
  console.error(`\n${failures.length} check(s) failed:`);
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log("\nAll hero checks passed.");
