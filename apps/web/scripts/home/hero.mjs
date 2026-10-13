// The landing hero in a browser (docs/landing.md): at rest over the globe with real text (the owner's name on one line at desktop width,
// stacked on a phone), the globe still draggable beneath it, the collapse on the first gesture, the way back after the idle delay (and
// only at the world view), NO header at all while the hero's rows are the sections and its search line is the search (the header comes
// back, with an unboxed key hint, when the rows are hidden), the icons at their scale, reduced motion, the credits line never covered, the whole block
// inside the window at fifteen shapes from 320 x 480 and 568 x 320 up (light and dark), the keyboard path and the search palette, the focus held in
// the header or the palette so the way back never takes it away, the page without scripts, no console error and no hydration warning.
// Works against `pnpm dev` (the owner's preview data) and `pnpm dev:demo`; it asserts nothing about which places there are.
//
//   CHROME_PATH=/path/to/chrome BASE_URL=http://localhost:5451 OUT_DIR=/tmp/hero node scripts/home/hero.mjs
//
// Exit code 1 on any failed assertion. Screenshots (rest and collapsed, both schemes, every viewport) go to OUT_DIR.
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
/**
 * Every shape the hero must fit (the whole block inside the window: name, introduction, search and the four rows), from the smallest
 * supported phone up: the upright phones, the same on their side, a 1440 x 900 window at 200 % zoom (720 x 450), a tablet, laptops.
 * A phone or a short window gets a touch context (`hover: none`: no key hint in the search line).
 */
const FIT_SIZES = [
  [320, 480],
  [320, 568],
  [360, 640],
  [375, 667],
  [390, 844],
  [568, 320],
  [640, 360],
  [667, 375],
  [720, 450],
  [736, 414],
  [768, 1024],
  [844, 390],
  [1024, 768],
  [1440, 900],
  [1920, 1080],
];
const VIEWPORTS = FIT_SIZES.map(([width, height]) => {
  if (width === 1440 && height === 900) return ["1440x900", DESKTOP];
  if (width === 390 && height === 844) return ["390x844", MOBILE];
  const touch = width < 768 || height < 500;
  return [`${width}x${height}`, { viewport: { width, height }, deviceScaleFactor: 2, ...(touch ? { isMobile: true, hasTouch: true, userAgent: MOBILE.userAgent } : {}) }];
});
/** The name is stacked (the family name under the given name) under 48 rem, except on a phone on its side (480 px and up, 34 rem tall at most). */
const isStacked = (width, height) => width < 768 && !(width >= 480 && height <= 544);
const IDLE_QUERY = "?globe-debug&hero-idle=1500";
const PATHS = ["/software", "/articles", "/artworks", "/poetry"];
/** The rows' names: the poems' section is "Poetry". */
const LABELS = ["Software", "Articles", "Artworks", "Poetry"];

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
      // (at rest on the home page there is no header: the hero's rows are the sections and its search line is the search)
      header: el("header") ? box(el("header").getBoundingClientRect()) : null,
      nav: el("header nav") ? box(el("header nav").getBoundingClientRect()) : null,
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
  ok(
    g.inks.every((i) => i.l >= -0.5 && i.r <= g.vw + 0.5 && i.t >= -0.5 && i.b <= g.vh + 0.5),
    `${label}: everything is inside the viewport (top ${Math.round(Math.min(...g.inks.map((i) => i.t)))} px, bottom ${Math.round(Math.max(...g.inks.map((i) => i.b)))} of ${g.vh})`,
  );
  ok(g.header === null === (g.state === "rest"), `${label}: ${g.state === "rest" ? "no header at rest" : "the header is back"}`);
  if (g.header) ok(g.inks.every((i) => i.t >= g.header.b - 0.5), `${label}: nothing is under the header row (${Math.round(Math.min(...g.inks.map((i) => i.t)))} px from the top, header ends at ${Math.round(g.header.b)})`);
  ok(g.overflowX <= 0, `${label}: no horizontal overflow (${g.overflowX})`);
  if (g.nav) ok(g.nav.l >= -0.5 && g.nav.r <= g.vw + 0.5, `${label}: the header row fits (${Math.round(g.nav.l)} to ${Math.round(g.nav.r)} of ${g.vw})`);
  return g;
}

// --- 0. Server-rendered: the hero is in the HTML at rest, with real text (no flash of another state) ----------------------------------
{
  const html = await (await fetch(`${BASE_URL}/`)).text();
  ok(/data-slot="landing-hero"[^>]*data-hero="rest"|data-hero="rest"[^>]*data-slot="landing-hero"/.test(html), "SSR: the hero is in the page at rest");
  ok(/<h1[^>]*class="hero-name[^"]*"[^>]*><span class="hero-given">Elliot<\/span> <span class="hero-family type-thin">/.test(html), "SSR: the name is the page's h1, Elliot (heavy) and Négrel-Jerzy (thin)");
  ok(
    /Front-end and UX software engineer based in Warsaw\.<span class="hero-intro-more"> Data visualisation, geospatial and cartography interfaces, design systems, computer graphics\.<\/span><\/p>/.test(html),
    "SSR: who the owner is is real text (the second sentence is its own span: a very short window drops it)",
  );
  ok(!/catalyst/i.test(html.replace(/CATALYST_[A-Z_]+/g, "")), "SSR: the code name is nowhere in the home page");
  ok(!/<header/.test(html) && !/data-slot="search-trigger/.test(html), "SSR: there is no header at rest on the home page");
  ok((html.match(/<nav aria-label="Primary"/g) ?? []).length === 1 && /<nav aria-label="Primary" class="hero-list">/.test(html), "SSR: the hero's list is the page's one Primary navigation (the places list is the other landmark)");
  const hrefs = [...html.matchAll(/class="hero-row"[^>]*href="([^"]+)"|href="([^"]+)"[^>]*class="hero-row"/g)].map((m) => m[1] ?? m[2]);
  ok(JSON.stringify(hrefs) === JSON.stringify(PATHS), `SSR: the four lists, in order (${hrefs.join(" ")})`);
  const labels = [...html.matchAll(/class="hero-row"[^>]*href="[^"]+"[^>]*><span>([^<]+)<|href="[^"]+"[^>]*class="hero-row"[^>]*><span>([^<]+)</g)].map((m) => m[1] ?? m[2]);
  ok(JSON.stringify(labels) === JSON.stringify(LABELS), `SSR: the four rows are named ${LABELS.join(", ")} (${labels.join(", ")})`);
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
  ok(/^Front-end and UX software engineer based in Warsaw\. Data visualisation, geospatial and cartography interfaces, design systems, computer graphics\.$/.test(intro), `desktop: the intro says who the owner is (${intro})`);
  const hintText = await page.locator(".hero-hint").innerText();
  ok(/^(Pick a point on the globe, or start from a list\.|No place is published yet: start from a list\.)$/.test(hintText), `desktop: then how to use the page (${hintText})`);
  // the name: one line, a share of the width (not the full width), the given name heavy and the family name thin
  const nm = await page.evaluate(() => {
    const n = document.querySelector(".hero-name");
    const fs = parseFloat(getComputedStyle(n).fontSize);
    const g = document.querySelector(".hero-given"), f = document.querySelector(".hero-family");
    const r = (e) => { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; };
    const gutter = parseFloat(getComputedStyle(document.querySelector(".landing-hero")).paddingLeft);
    return { fs, given: r(g), family: r(f), gutter, vw: innerWidth, weights: [getComputedStyle(g).fontWeight, getComputedStyle(f).fontWeight], h: n.getBoundingClientRect().height };
  });
  ok(Math.abs(nm.given.t - nm.family.t) < 2 && nm.family.l > nm.given.r, `desktop: the name is on one line (given ${Math.round(nm.given.l)}-${Math.round(nm.given.r)}, family from ${Math.round(nm.family.l)})`);
  const share = (nm.family.r - nm.given.l) / nm.vw;
  ok(share >= 0.68 && share <= 0.76, `desktop: the name takes about 72 % of the width, not all of it (${(share * 100).toFixed(1)} %, from ${Math.round(nm.given.l)} to ${Math.round(nm.family.r)} of ${nm.vw})`);
  ok(nm.family.r <= nm.vw - nm.gutter - 0.15 * nm.vw, `desktop: it ends well short of the right gutter (${Math.round(nm.family.r)} of ${nm.vw})`);
  ok(nm.weights.join() === "800,200", `desktop: the given name at 800, the family name at 200 (${nm.weights.join(" / ")})`);
  const icons = await page.evaluate(() => {
    const w = (s) => document.querySelector(s)?.getBoundingClientRect().width ?? 0;
    return { arrow: w(".hero-arrow"), rowFont: parseFloat(getComputedStyle(document.querySelector(".hero-row")).fontSize), search: w(".hero-search svg") };
  });
  ok(icons.arrow >= icons.rowFont && icons.arrow <= icons.rowFont * 1.25, `desktop: the row arrows are 1.1 em of the row's text (${icons.arrow.toFixed(1)} px for ${icons.rowFont} px text)`);
  ok(Math.abs(icons.search - 20) < 0.5, `desktop: the hero's search icon is the control size, 20 px (${icons.search})`);
  const plain = await page.evaluate(() => {
    const cs = getComputedStyle(document.querySelector(".hero-kbd"));
    return { border: cs.borderTopWidth, bg: cs.backgroundColor, outline: cs.outlineStyle, text: document.querySelector(".hero-kbd").textContent };
  });
  ok(plain.border === "0px" && plain.outline === "none" && /rgba\(0, 0, 0, 0\)|transparent/.test(plain.bg), `desktop: the hero's key hint is plain text, no border, background or outline (${JSON.stringify(plain)})`);
  ok((await page.locator(".hero-search > svg").count()) === 1 && (await page.locator(".hero-search [class*=bullet]").count()) === 0, "desktop: the search line starts with the search icon, not a square bullet");
  // no header at all while the rows are the sections and the search line is the search
  ok((await page.locator("header").count()) === 0, "desktop: no header element at rest");
  ok((await page.locator("nav[aria-label=Primary]").count()) === 1 && (await page.locator("nav[aria-label=Primary]").getAttribute("class")) === "hero-list", "desktop: exactly one Primary navigation, the hero's list");
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
  const hdr = await page.evaluate(() => {
    const k = document.querySelector("header [data-slot=search-trigger] kbd");
    const cs = k && getComputedStyle(k);
    const t = document.querySelector("header [data-slot=search-trigger]");
    const r = t.getBoundingClientRect();
    return { icon: t.querySelector(":scope > svg")?.getBoundingClientRect().width, command: k?.querySelector("svg")?.getBoundingClientRect().width ?? null, font: parseFloat(getComputedStyle(t).fontSize), word: t.querySelector(":scope > span")?.textContent, h: r.height, linkH: document.querySelector("header a").getBoundingClientRect().height, kbd: k ? { border: cs.borderTopWidth, bg: cs.backgroundColor, text: k.textContent.replace(/\s+/g, " ").trim() } : null };
  });
  // [icon] Search [command K]: the two glyphs are one size (1.1 em of the nav type), the word is there, the row is as tall as the links
  ok(Math.abs(hdr.icon - hdr.font * 1.1) < 0.5 && hdr.icon < 20, `desktop: collapsed, the header's search icon is 1.1 em of the nav type, not the 20 px control size (${hdr.icon} px for ${hdr.font} px type)`);
  ok(hdr.command === null || Math.abs(hdr.command - hdr.icon) < 0.5, `desktop: collapsed, the command key is the same size as the search icon (${hdr.command} against ${hdr.icon})`);
  ok(hdr.word === "Search" && Math.abs(hdr.h - hdr.linkH) < 0.5, `desktop: collapsed, the trigger says "Search" and is as tall as the links (${hdr.h} / ${hdr.linkH})`);
  ok(hdr.kbd && hdr.kbd.border === "0px" && /rgba\(0, 0, 0, 0\)|transparent/.test(hdr.kbd.bg) && /^(Ctrl K|K)$/.test(hdr.kbd.text), `desktop: collapsed, the header's key hint is plain text, unboxed (${JSON.stringify(hdr.kbd)})`);
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
  ok((await page.locator("header").count()) === 0, "desktop: back at rest, the header is gone again");

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

// --- 3. Every shape (FIT_SIZES), both schemes: the whole block inside the window, the name's shape, the credits line, the first gesture --------------------------------------------------------------------
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
      // the name: stacked on a phone (given over family, the family name filling the width), one line from 48 rem and on a phone on its side
      // taking about 72 % of the width
      const n = await page.evaluate(() => {
        const r = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; };
        return { given: r(".hero-given"), family: r(".hero-family"), block: r(".hero-block"), vw: innerWidth, vh: innerHeight, gutter: parseFloat(getComputedStyle(document.querySelector(".landing-hero")).paddingLeft) };
      });
      ok(n.block.t >= 0 && n.block.b <= n.vh && n.block.l >= 0 && n.block.r <= n.vw + 0.5, `${label}: the hero block's box is inside the window (top ${Math.round(n.block.t)}, bottom ${Math.round(n.block.b)} of ${n.vh})`);
      const stacked = isStacked(options.viewport.width, options.viewport.height);
      ok(stacked ? n.family.t > n.given.b - 0.2 * (n.given.b - n.given.t) : Math.abs(n.family.t - n.given.t) < 2, `${label}: the name is ${stacked ? "stacked" : "on one line"}`);
      ok(n.family.r <= n.vw - n.gutter + 0.5 && n.given.l >= 0, `${label}: the name is inside the gutters (right edge ${Math.round(n.family.r)} of ${n.vw})`);
      if (stacked) ok(n.family.r >= n.vw - n.gutter - 0.1 * n.vw, `${label}: the stacked family name fills the width (${Math.round(n.family.r)} of ${n.vw})`);
      else {
        const share = (n.family.r - n.given.l) / n.vw;
        ok(share >= 0.66 && share <= 0.78, `${label}: the name takes about 72 % of the width (${(share * 100).toFixed(1)} %)`);
      }
    }
    if (!(name === "1440x900" && scheme === "dark")) await page.screenshot({ path: `${OUT_DIR}/hero-rest-${name}-${scheme}.png` });
    // the first gesture: a touch tap or a drag on the globe's stage where neither the hero's text nor a place marker is (the upper right:
    // a tap on a marker would open its place, which is a different state)
    const blockTop = await page.evaluate(() => document.querySelector(".hero-block").getBoundingClientRect().top);
    const gx = options.viewport.width * 0.92, gy = Math.max(8, Math.min(options.viewport.height * 0.25, blockTop - 8));
    ok(
      await page.evaluate(([x, y]) => !document.elementFromPoint(x, y)?.closest(".landing-hero a, .landing-hero button"), [gx, gy]),
      `${label}: the globe is reachable above the block (no hero control at ${Math.round(gx)}, ${Math.round(gy)})`,
    );
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

// --- 4. A small phone: at rest there is no header; once the hero has stepped back the header row fits and its one-word search works ----
for (const width of [320, 360, 390, 430]) {
  const { ctx, page, logs } = await newPage({ ...MOBILE, viewport: { width, height: 740 } });
  await page.goto(`${BASE_URL}/`);
  await waitGlobe(page);
  await sleep(600);
  const g0 = await geometry(page);
  ok(g0.header === null, `${width} px: no header at rest`);
  ok(g0.overflowX <= 0, `${width} px: no horizontal overflow`);
  ok(g0.inks.every((i) => i.r <= g0.vw - 0.5 && i.l >= 0), `${width} px: the hero (name included) is inside the viewport`);
  if (width === 390) {
    await page.locator("[data-slot=hero-search]").tap();
    await page.waitForSelector("[data-slot=search-palette]", { state: "visible", timeout: 3000 });
    ok(await page.locator("[data-slot=search-palette] input").evaluate((i) => document.activeElement === i), "390 px: the hero's search line opens the palette with the input focused");
    await page.keyboard.press("Escape");
    await sleep(200);
  }
  // step the hero back with a tap on the globe's stage, where no text or marker is
  await page.touchscreen.tap(width * 0.9, 740 * 0.12);
  await waitState(page, "collapsed", 2000).catch(() => {});
  await sleep(450);
  const g = await geometry(page);
  ok(g.header !== null && g.nav.l >= 0 && g.nav.r <= g.vw, `${width} px: collapsed, the header row fits (${g.nav ? `${Math.round(g.nav.l)} to ${Math.round(g.nav.r)}` : "missing"})`);
  ok(g.overflowX <= 0, `${width} px: collapsed, no horizontal overflow`);
  const compact = page.locator("[data-slot=search-trigger]");
  ok(await compact.isVisible() && /^search/i.test((await compact.innerText()).trim()), `${width} px: the header has a search button with the word "Search"`);
  const box = await compact.boundingBox();
  ok(box.height >= 43.5 && box.width >= 43.5, `${width} px: the header search is a 44 px target (${Math.round(box.width)} x ${Math.round(box.height)})`);
  if (width === 390) {
    await compact.tap();
    await page.waitForSelector("[data-slot=search-palette]", { state: "visible", timeout: 3000 });
    ok(await page.locator("[data-slot=search-palette] input").evaluate((i) => document.activeElement === i), "390 px: the header search opens the palette with the input focused");
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
  ok(!stops.includes("button[search-trigger]"), "keyboard: at rest there is no header search in the order: the hero's search line is the first control after the skip links");
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
  const boxes = await page.evaluate(() => {
    const d = document.querySelector("[data-slot=search-palette]");
    const close = d.querySelector("[aria-label='Close search']");
    // the dialog's own frame and its two dividing hairlines are the only borders: no control, key or text inside has one
    const bordered = [...d.querySelectorAll("button, kbd, span, input")].filter((e) => parseFloat(getComputedStyle(e).borderTopWidth) > 0 || parseFloat(getComputedStyle(e).borderBottomWidth) > 0);
    return { closeIcon: !!close.querySelector("svg"), closeText: close.textContent.trim(), bordered: bordered.map((e) => e.tagName + "." + e.className).slice(0, 4), footer: d.textContent.includes("Esc") };
  });
  ok(boxes.closeIcon && boxes.closeText === "" && boxes.bordered.length === 0, `palette: no boxed key or button inside it, the way out is a plain icon (${JSON.stringify(boxes)})`);
  ok(boxes.footer, "palette: the footer says the key as plain text (Esc close)");
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

// --- 8. The focus is never lost to the hero's way back: held while it is in the header or in a dialog ----------------------------------
{
  const { ctx, page, logs } = await newPage(DESKTOP);
  await page.goto(`${BASE_URL}/${IDLE_QUERY}`);
  await waitGlobe(page);
  await waitDebug(page);
  await sleep(800);
  const collapse = async () => {
    await page.mouse.move(700, 300);
    await page.mouse.wheel(0, 120);
    await waitState(page, "collapsed", 1500);
    await sleep(350);
  };
  await collapse();
  // a header link has the focus: the idle delay (1.5 s here) passes twice and the hero stays collapsed, the header and the focus stay
  await page.locator("header a[href='/software']").focus();
  await sleep(3200);
  ok((await heroState(page)) === "collapsed", "focus hold: with the focus on a header link the hero does not come back after the idle delay");
  ok(await page.evaluate(() => document.activeElement?.getAttribute("href") === "/software" && !!document.activeElement.closest("header")), "focus hold: the focus is still on the header link (the header was not unmounted under it)");
  // leaving the header releases the hold: a whole idle period later, the hero is back
  await page.evaluate(() => document.activeElement?.blur());
  await sleep(500);
  ok((await heroState(page)) === "collapsed", "focus hold: released, the hero still waits a whole idle period (it does not jump back)");
  await waitState(page, "rest", 4000);
  ok((await page.locator("header").count()) === 0, "focus hold: after the release the hero comes back at the delay, and the header goes with nothing focused in it");

  // the palette is open (opened from the header's trigger): the same
  await collapse();
  await page.locator("[data-slot=search-trigger]").click();
  await page.waitForSelector("[data-slot=search-palette]", { state: "visible", timeout: 3000 });
  await sleep(3200);
  ok((await heroState(page)) === "collapsed" && (await page.locator("header").count()) === 1, "focus hold: with the palette open the hero stays collapsed and the header (its opener) stays");
  await page.keyboard.press("Escape");
  await sleep(300);
  ok(await page.evaluate(() => document.activeElement?.getAttribute("data-slot") === "search-trigger"), "focus hold: Escape closes the palette and gives the focus back to the header's trigger (still there)");
  ok((await heroState(page)) === "collapsed", "focus hold: and the hero is still collapsed, with the focus on the trigger");
  await page.evaluate(() => document.activeElement?.blur());
  await waitState(page, "rest", 4500);
  ok(true, "focus hold: with the focus gone the hero comes back");
  ok(logs.length === 0, `focus hold: no console error or warning${logs.length ? ` (${logs.join(" | ")})` : ""}`);
  await ctx.close();
}

// --- 9. Without scripts: the server's page, no dead control, no line about the globe ----------------------------------------------------
{
  const ctx = await browser.newContext({ ...DESKTOP, javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(`${BASE_URL}/`);
  await sleep(500);
  const state = await page.evaluate(() => {
    const vis = (e) => !!e && getComputedStyle(e).display !== "none" && e.getClientRects().length > 0;
    return {
      hint: document.querySelector(".hero-hint")?.innerText,
      search: vis(document.querySelector(".hero-search")),
      rows: [...document.querySelectorAll(".hero-row")].filter(vis).length,
      text: document.body.innerText,
    };
  });
  ok(state.hint === "Start from a list.", `no scripts: the how-to line only says to start from a list (${JSON.stringify(state.hint)})`);
  ok(!/Pick a point/.test(state.text), "no scripts: nothing on the page tells the visitor to pick a point on the globe");
  ok(!state.search, "no scripts: the search line (a script) is not drawn");
  ok(state.rows === 4, `no scripts: the four lists are links that work (${state.rows})`);
  await page.screenshot({ path: `${OUT_DIR}/hero-no-script-1440.png` });
  await page.goto(`${BASE_URL}/articles`);
  const triggers = await page.evaluate(() => ["search-trigger"].map((s) => { const e = document.querySelector(`[data-slot=${s}]`); return !!e && getComputedStyle(e).display !== "none"; }));
  ok(triggers.every((v) => v === false), "no scripts: the header's search triggers are not drawn either");
  await ctx.close();
}

// --- 10. Round 3: the showcase (the orbiting type in, the boxes out, the planet lifted), the name's travel -----------------------------------------
// Pages in debug mode have the type off unless `?ring`; `window.__globeDebug.ring()` is its introspection.
const RING_QUERY = "?globe-debug&ring&no-street&hero-idle=2500";
const ringOf = (page) => page.evaluate(() => window.__globeDebug.ring());
const planetOf = (page) =>
  page.evaluate(() => {
    const r = window.__globeDebug.ring();
    const i = window.__globeDebug.inset();
    const h = innerHeight;
    return { r: r.silhouettePx, lift: i.lift, cover: i.cover, cy: h / 2 - i.lift, h, w: innerWidth, shown: r.shown, showcase: r.showcase, labels: window.__globeDebug.labelsShown().length };
  });
/** Freeze every running animation (the CSS transitions and the name's) at `t` ms and read the two halves' widths. */
const widthsAt = (page, t) =>
  page.evaluate((t) => {
    for (const a of document.getAnimations()) {
      a.pause();
      a.currentTime = t;
    }
    const w = (s) => document.querySelector(s).getBoundingClientRect().width;
    const box = (s) => {
      const b = document.querySelector(s).getBoundingClientRect();
      return { l: b.left, t: b.top, r: b.right, b: b.bottom };
    };
    return { given: w(".hero-given"), family: w(".hero-family"), givenBox: box(".hero-given"), familyBox: box(".hero-family"), vw: innerWidth, vh: innerHeight };
  }, t);
const resume = (page) => page.evaluate(() => document.getAnimations().forEach((a) => a.play()));

{
  const { ctx, page, logs } = await newPage(DESKTOP);
  await page.goto(`${BASE_URL}/${RING_QUERY}`);
  await waitGlobe(page);
  await waitDebug(page);
  await sleep(1500);
  const p = await planetOf(page);
  const r = await ringOf(page);
  const v = await view(page);
  const nums = await page.evaluate(() => ({ fit: window.__globeDebug.fitZoom(), floor: window.__globeDebug.floorZoom() }));
  ok(Math.abs(v.zoom - nums.floor) < 1e-6 && nums.floor < nums.fit - 0.3, `showcase: the page opens fully zoomed out (zoom ${v.zoom.toFixed(2)}, the fit is ${nums.fit.toFixed(2)})`);
  ok(r.shown && r.showcase && r.alpha === 1 && r.fonts, "showcase: the orbiting type is shown from the first frame, in the real faces");
  ok(r.overlayHidden && p.labels === 0, "showcase: every box and label is out");
  ok(p.lift > 20 && p.cy - p.r >= 0, `showcase: the planet is lifted by ${p.lift.toFixed(0)} px (cover ${p.cover}) and its top is inside the window (${Math.round(p.cy - p.r)} px)`);
  const nameTop = await page.evaluate(() => document.querySelector(".hero-name").getBoundingClientRect().top);
  ok(p.cy + p.r <= nameTop + 1, `showcase: the planet clears the name (its lowest point ${Math.round(p.cy + p.r)}, the name's top ${Math.round(nameTop)})`);
  ok((await page.locator(".hero-hint").count()) === 1 && /Pick a point on the globe/.test(await page.locator(".hero-hint").textContent()), "showcase: the how-to line is still in the page's text");
  ok((await hero(page).getAttribute("data-orbit")) === "true", "showcase: the hero knows the globe has the type");
  const hint = await page.locator(".hero-hint").boundingBox();
  ok(hint !== null && hint.width <= 1.5 && hint.height <= 1.5, `showcase: the line is visually hidden, not removed (${hint ? `${hint.width} x ${hint.height}` : "none"})`);
  ok((await page.evaluate(() => document.querySelector("[data-orbit-layer]").getAttribute("aria-hidden"))) === "true", "showcase: the type is aria-hidden");
  const picked = await page.evaluate(() => window.__globeDebug.pick(720, 330));
  ok(picked === null, "showcase: a hidden box takes no pick");
  await page.screenshot({ path: `${OUT_DIR}/hero-showcase-1440-dark.png` });

  // The first press ends it: boxes back, the type fading, and the press selects nothing.
  const path0 = new URL(page.url()).pathname;
  await page.mouse.move(720, 120);
  await page.mouse.down();
  await waitState(page, "collapsed", 1500);
  // the name's travel, sampled on the compositor's animations at 0, 120, 240 and 360 ms
  const w0 = await widthsAt(page, 0);
  const w1 = await widthsAt(page, 120);
  const w2 = await widthsAt(page, 240);
  const w3 = await widthsAt(page, 360);
  const miniW = await page.evaluate(() => ({ given: document.querySelector(".hero-mini-given").getBoundingClientRect().width, family: document.querySelector(".hero-mini-family").getBoundingClientRect().width }));
  ok(w0.given > 300 && w0.family > 600, `name travel: it starts at full size (${Math.round(w0.given)} + ${Math.round(w0.family)} px)`);
  ok(w1.given < w0.given * 0.75 && w2.given < w1.given && w3.given <= w2.given, `name travel: it shrinks (${[w0, w1, w2, w3].map((w) => Math.round(w.given)).join(" > ")} px)`);
  ok(Math.abs(w3.given - miniW.given) < 2 && Math.abs(w3.family - miniW.family) < 2, `name travel: it ends at the small line's size (${w3.given.toFixed(1)} / ${w3.family.toFixed(1)} against ${miniW.given.toFixed(1)} / ${miniW.family.toFixed(1)})`);
  ok(Math.abs(w3.given / w0.given - w3.family / w0.family) < 0.02, `name travel: one uniform scale for the two halves (${(w3.given / w0.given).toFixed(3)} and ${(w3.family / w0.family).toFixed(3)})`);
  ok([w0, w1, w2, w3].every((w) => w.givenBox.l >= -1 && w.familyBox.r <= w.vw + 1 && w.givenBox.b <= w.vh + 1 && w.familyBox.b <= w.vh + 1), "name travel: both halves stay inside the window the whole way");
  ok((await page.evaluate(() => document.querySelector(".hero-name").style.fontSize)) === "", "name travel: no font size is written (a transform only)");
  const kinds = await page.evaluate(() => document.querySelector(".hero-given").getAnimations().map((a) => Object.keys(a.effect.getKeyframes()[0]).filter((k) => !["offset", "computedOffset", "easing", "composite"].includes(k)).join("+")));
  ok(kinds.length === 1 && kinds[0] === "transform", `name travel: one animation per half, of transform only (${kinds.join(", ")})`);
  await resume(page);
  await page.mouse.up();
  await sleep(500);
  const after = await planetOf(page);
  const ar = await ringOf(page);
  ok(!after.showcase && after.lift === 0 && !ar.shown, `showcase: the press ended it (type out, the planet back down, lift ${after.lift})`);
  ok(after.labels > 0 && !ar.overlayHidden, `showcase: the boxes and labels are back (${after.labels} labels)`);
  ok(new URL(page.url()).pathname === path0, "showcase: the press that ended it selected nothing");
  ok((await page.locator(".hero-given").evaluate((e) => e.getAnimations().length === 0 && getComputedStyle(e).willChange === "auto")), "name travel: nothing is left running or promoted afterwards (no will-change)");
  await page.screenshot({ path: `${OUT_DIR}/hero-collapsed-showcase-1440-dark.png` });

  // The way back is the same motion reversed.
  await waitState(page, "rest", 6000);
  const b0 = await widthsAt(page, 0);
  const b1 = await widthsAt(page, 120);
  const b3 = await widthsAt(page, 360);
  ok(Math.abs(b0.given - miniW.given) < 2 && b1.given > b0.given && b3.given > w0.given * 0.97, `name travel, back: it grows out of the small line (${[b0, b1, b3].map((w) => Math.round(w.given)).join(" < ")} px)`);
  await resume(page);
  await sleep(500);
  const again = await ringOf(page);
  ok(again.showcase && again.shown && again.overlayHidden, "showcase: back at rest, the type is in and the boxes are out again");
  ok(logs.length === 0, `showcase: no console error or warning${logs.length ? ` (${logs.join(" | ")})` : ""}`);
  await ctx.close();
}

// The planet's top is inside the window and clear of the name, at every shape (from 320 x 480), dark.
for (const [name, options] of VIEWPORTS) {
  const { ctx, page, logs } = await newPage(options);
  await page.goto(`${BASE_URL}/${RING_QUERY}`);
  await waitGlobe(page);
  await waitDebug(page);
  await sleep(900);
  const p = await planetOf(page);
  ok(p.shown && p.showcase && p.labels === 0, `${name}: the type is in and the boxes are out`);
  ok(p.cy - p.r >= -0.5, `${name}: the lifted planet's top is inside the window (${Math.round(p.cy - p.r)} px, lift ${p.lift.toFixed(0)}, cover ${p.cover})`);
  ok(p.cy + p.r <= p.h - p.cover + 1 || p.cy - p.r <= 20, `${name}: it clears what covers the bottom, or the room above is used up`);
  ok(logs.length === 0, `${name}: no console error or warning${logs.length ? ` (${logs.join(" | ")})` : ""}`);
  await ctx.close();
}

// Reduced motion: the showcase is there at once and the name does not travel.
{
  const { ctx, page, logs } = await newPage(DESKTOP, { reducedMotion: "reduce" });
  await page.goto(`${BASE_URL}/${RING_QUERY}`);
  await waitGlobe(page);
  await waitDebug(page);
  await sleep(800);
  const r = await ringOf(page);
  const i = await page.evaluate(() => window.__globeDebug.inset());
  ok(r.shown && r.showcase && i.lift > 20 && i.lift === i.liftTarget, "reduced motion: the type is in and the planet lifted at once");
  await page.mouse.move(720, 120);
  await page.mouse.down();
  await page.mouse.up();
  await sleep(60);
  ok((await heroState(page)) === "collapsed" && (await page.locator(".hero-given").evaluate((e) => e.getAnimations().length)) === 0, "reduced motion: the name does not travel (no animation), the hero is collapsed within 60 ms");
  const r2 = await ringOf(page);
  ok(!r2.showcase && r2.showcaseFade === 0 && (await page.evaluate(() => window.__globeDebug.inset().lift)) === 0, "reduced motion: the type is out and the planet down at once");
  ok(logs.length === 0, `reduced motion (type): no console error or warning${logs.length ? ` (${logs.join(" | ")})` : ""}`);
  await ctx.close();
}

// ?no-ring: the previous home page (boxes, hint visible, no type, the world view is the fit).
{
  const { ctx, page, logs } = await newPage(DESKTOP);
  await page.goto(`${BASE_URL}/?no-ring`);
  await waitGlobe(page);
  await sleep(1200);
  ok((await page.locator("[data-orbit-layer]").count()) === 0, "no-ring: no orbiting type is mounted");
  ok((await hero(page).getAttribute("data-orbit")) === "false", "no-ring: the hero is told there is none");
  const hint = await page.locator(".hero-hint").boundingBox();
  ok(hint !== null && hint.width > 100, "no-ring: the how-to line is visible");
  ok(logs.length === 0, `no-ring: no console error or warning${logs.length ? ` (${logs.join(" | ")})` : ""}`);
  await ctx.close();
}

// --- 11. A header that appears because of a gesture does not receive that gesture's click ------------------------------------------------
// On a phone a tap on the globe collapses the hero in the same task as the press and the header row appears; the browser then fires the
// tap's click at what is under the finger NOW. A tap near the top used to land on a header link ("Articles") and navigate. The header's
// controls ignore the pointer until the pointer sequence has ended plus a short guard (keyboard, focus and assistive technology unaffected).
{
  const TOUCH = { ...MOBILE, viewport: { width: 390, height: 844 } };
  // Where the "Articles" link is once the header is there (two steps: collapse, read the box).
  const probe = await newPage(TOUCH);
  await probe.page.goto(`${BASE_URL}/${IDLE_QUERY}`);
  await waitGlobe(probe.page);
  await waitDebug(probe.page);
  await sleep(800);
  await probe.page.touchscreen.tap(380, 400);
  await waitState(probe.page, "collapsed", 1500);
  await sleep(500);
  const box = await probe.page.locator("header a[href='/articles']").boundingBox();
  await probe.ctx.close();
  ok(box !== null && box.y + box.height / 2 < 60, `tap-through: the header's Articles link is in the top strip (${box ? Math.round(box.y + box.height / 2) : "none"} px)`);
  const tx = box.x + box.width / 2;
  const ty = box.y + box.height / 2;

  const { ctx, page, logs } = await newPage(TOUCH);
  await page.goto(`${BASE_URL}/${IDLE_QUERY.replace("hero-idle=1500", "hero-idle=20000")}`);
  await waitGlobe(page);
  await waitDebug(page);
  await sleep(800);
  ok((await page.locator("header").count()) === 0, "tap-through: no header before the tap");
  await page.touchscreen.tap(tx, ty);
  await sleep(700);
  ok(new URL(page.url()).pathname === "/", `tap-through: the tap's click did not reach the header link that appeared under it (${new URL(page.url()).pathname})`);
  if (new URL(page.url()).pathname === "/") ok((await heroState(page)) === "collapsed", "tap-through: the tap on the globe collapsed the hero");
  ok((await page.locator("header a[href='/articles']").count()) === 1 && (await page.locator("header a[href='/articles']").isVisible()), "tap-through: the header is there and visible");
  ok((await page.locator("header").getAttribute("data-guard")) === null, "tap-through: the guard is off a moment after the tap");
  // after the guard the link works with a real tap, and keyboard focus was never blocked
  await page.locator("header a[href='/projects']").focus();
  ok(await page.evaluate(() => document.activeElement?.getAttribute("href") === "/projects"), "tap-through: the header's links can be focused at once (keyboard and assistive technology are not guarded)");
  await page.evaluate(() => document.activeElement?.blur());
  await page.touchscreen.tap(tx, ty);
  await page.waitForURL("**/articles", { timeout: 4000 }).catch(() => {});
  ok(new URL(page.url()).pathname === "/articles", `tap-through: after the guard a tap on the link navigates (${new URL(page.url()).pathname})`);
  ok(logs.length === 0, `tap-through: no console error or warning${logs.length ? ` (${logs.join(" | ")})` : ""}`);
  await ctx.close();
}

await browser.close();
if (failures.length) {
  console.error(`\n${failures.length} check(s) failed:`);
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log("\nAll hero checks passed.");
