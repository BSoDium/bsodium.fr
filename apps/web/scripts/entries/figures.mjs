// Figures in the flow of an article (docs/design-system.md, "Figures"), measured in a browser: each image stays right after the block that
// precedes it in the source; at a wide window it is a little wider than the text and never wider than its picture; on a phone it takes
// the width of the screen (edge to edge for a wide picture, the gutter kept for a small one); its caption is left-aligned to its edge and
// no wider than it; no horizontal scroll; the mentions "Fig. N" in the text are links that land on the figure (focus, below the sticky
// header, instantly under reduced motion; a deep link works on load); a figure wider than it is shown opens in a native dialog that
// traps the focus, closes on Escape (the panel stays), and gives the focus back; print keeps the figures in the flow and has no dialog.
// Uses the DEMO content (`demo-article` has three figures, the second 480 px wide; `demo-project` has two): run against `pnpm dev:demo`
// or a demo build, never against real content.
//
//   CHROME_PATH=/path/to/chrome BASE_URL=http://localhost:5340 OUT_DIR=/some/dir node scripts/entries/figures.mjs
//
// Exit code 1 on any failed assertion. Screenshots (light and dark; 390, 1280 and 1920 px) go to OUT_DIR.
import { readFileSync } from "node:fs";
import { BASE_URL, OUT_DIR, launch } from "../globe/_lib.mjs";

const FIXTURE = JSON.parse(readFileSync(new URL("../../../../packages/published/fixtures/demo.json", import.meta.url), "utf8"));
const ARTICLE = FIXTURE.articles.find((e) => e.slug === "demo-article");
const PATH = "/articles/demo-article";

const failures = [];
const ok = (cond, message) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${message}`);
  if (!cond) failures.push(message);
};
const near = (a, b, tol = 1.5) => Math.abs(a - b) <= tol;

const browser = await launch();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(width, height, { scheme = "light", full = true, hash = "", reducedMotion = "no-preference", touch = false } = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    colorScheme: scheme,
    reducedMotion,
    ...(touch ? { isMobile: true, hasTouch: true } : {}),
  });
  const page = await ctx.newPage();
  const logs = [];
  page.on("console", (m) => m.type() === "error" && logs.push(`console.error: ${m.text()}`));
  page.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));
  await page.goto(`${BASE_URL}${PATH}${full ? "?view=full" : ""}${hash}`);
  await page.waitForSelector("[data-panel] figure[data-flow]", { timeout: 20000 });
  await sleep(1200); // hydration, the zoom controls, the fonts
  return { ctx, page, logs };
}

const geometry = (page) =>
  page.evaluate(() => {
    const body = document.querySelector('[data-slot="entry-body"]');
    const para = [...body.querySelectorAll(":scope > p")].find((p) => p.textContent.length > 200);
    const pr = para.getBoundingClientRect();
    const figs = [...body.querySelectorAll('figure[data-slot="entry-figure"][data-flow]')].map((f) => {
      const r = f.getBoundingClientRect();
      const img = f.querySelector("img");
      const cap = f.querySelector("figcaption");
      const cr = cap?.getBoundingClientRect();
      return {
        id: f.id,
        left: r.left,
        width: r.width,
        natural: Number(img.getAttribute("width")),
        capLeft: cr?.left,
        capWidth: cr?.width,
        capPad: cap ? parseFloat(getComputedStyle(cap).paddingLeft) : 0,
        lazy: img.getAttribute("loading") === "lazy",
        aspect: getComputedStyle(img).aspectRatio,
      };
    });
    const panel = document.querySelector("[data-panel]");
    return {
      paraLeft: pr.left,
      paraWidth: pr.width,
      figs,
      hscroll: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
      panelHscroll: panel.scrollWidth - panel.clientWidth,
      innerWidth: window.innerWidth,
    };
  });

// --- 1. In the flow: each image right after the block that precedes it in the source ---------------------------------------------------
{
  const { ctx, page, logs } = await open(1280, 900);
  const order = await page.evaluate(() => {
    const body = document.querySelector('[data-slot="entry-body"]');
    return [...body.children].map((el) => ({ tag: el.tagName, fig: el.matches("figure[data-flow]"), text: el.textContent.slice(0, 40) }));
  });
  const imageBlocks = ARTICLE.body.map((b, i) => [b, i]).filter(([b]) => b.type === "image");
  ok(imageBlocks.length === 3, `the demo article has three figures (${imageBlocks.length})`);
  const isBlock = (b) => b.type !== "link"; // consecutive links are one list
  const domBlocks = order; // one DOM child per source block (links grouped into one list)
  const figDomIndexes = domBlocks.map((d, i) => (d.fig ? i : -1)).filter((i) => i >= 0);
  ok(figDomIndexes.length === 3, `three figures in the body's flow (${figDomIndexes.length})`);
  const srcBlocks = ARTICLE.body.filter(isBlock);
  imageBlocks.forEach(([block, i], k) => {
    const before = ARTICLE.body[i - 1];
    const prev = domBlocks[figDomIndexes[k] - 1];
    const snippet = (before.text ?? before.items?.[0] ?? "").slice(0, 30);
    ok(prev && !prev.fig && prev.text.startsWith(snippet.slice(0, 20)), `figure ${k + 1} comes right after the block that precedes it in the source ("${snippet.slice(0, 24)}...")`);
  });
  ok((await page.locator('[data-slot="entry-figures"]').count()) === 0, "no third column of figures");
  ok(srcBlocks.length > 0 && logs.length === 0, `no console errors${logs.length ? ` (${logs.join(" | ")})` : ""}`);
  await ctx.close();
}

// --- 2. Widths: 1024, 1280, 1920 (wide), 768, 390 (phone), and the half panel --------------------------------------------------------
const SIZES = [
  { w: 1920, h: 1080, full: true, name: "1920" },
  { w: 1280, h: 800, full: true, name: "1280" },
  { w: 1024, h: 768, full: true, name: "1024" },
  { w: 768, h: 1024, full: true, name: "768" },
  { w: 390, h: 844, full: true, name: "390", touch: true },
  { w: 1440, h: 900, full: false, name: "panel-1440" },
  { w: 1024, h: 768, full: false, name: "panel-1024" },
];
for (const size of SIZES) {
  const { ctx, page } = await open(size.w, size.h, { full: size.full, touch: size.touch });
  const g = await geometry(page);
  const t = size.name;
  ok(g.hscroll <= 0 && g.panelHscroll <= 0, `${t}: no horizontal scroll (page ${g.hscroll}, panel ${g.panelHscroll})`);
  ok(g.figs.every((f) => f.lazy && /960|480/.test(f.aspect.replace(/\s/g, "")) ), `${t}: lazy images with a reserved aspect ratio (${g.figs.map((f) => f.aspect).join(", ")})`);
  const [f1, f2, f3] = g.figs;
  ok(g.figs.every((f) => f.width <= f.natural + 1), `${t}: no figure wider than its picture (${g.figs.map((f) => `${Math.round(f.width)}/${f.natural}`).join(", ")})`);
  ok(g.figs.every((f) => f.capWidth <= f.width + 1 && f.capWidth <= 60 * 7.5 + 2 * f.capPad), `${t}: a caption never wider than its figure nor about 60 characters`);
  ok(g.figs.every((f) => near(f.capLeft, f.left)), `${t}: the caption is left-aligned to the figure's edge`);
  if (size.full && size.w >= 1280) {
    ok(f1.width > g.paraWidth + 20 && f1.width <= g.paraWidth * 1.3 + 2, `${t}: a wide figure breaks out of the text measure by 20-30 % (${Math.round(f1.width)} against ${Math.round(g.paraWidth)})`);
    ok(near(f2.width, 480), `${t}: the small diagram is held to its natural 480 px (${Math.round(f2.width)})`);
    ok(near(f2.left - g.paraLeft, (f1.width - f2.width) / 2, 3), `${t}: the small diagram is centred in the wide measure`);
    ok(near(f1.left, g.paraLeft), `${t}: the wide figure starts at the text's edge, not under the marginalia`);
  }
  if (size.full && size.w === 1024) ok(f1.width <= g.paraWidth * 1.3 + 2 && f1.width >= g.paraWidth - 1, `${t}: wide figure in a narrow column is the column at most (${Math.round(f1.width)})`);
  if (size.w === 390) {
    ok(near(f1.left, 0) && near(f1.width, 390), `${t}: a wide picture goes edge to edge (${Math.round(f1.left)}, ${Math.round(f1.width)})`);
    ok(near(f1.capLeft + f1.capPad, 16, 1.5), `${t}: its caption keeps the page gutter (${Math.round(f1.capLeft + f1.capPad)})`);
    // a small picture keeps the gutter: shrink a figure's natural width in the page and measure it
    await page.evaluate(() => document.querySelectorAll("figure[data-flow]")[1].style.setProperty("--fig-natural", "220px"));
    const small = await page.evaluate(() => {
      const r = document.querySelectorAll("figure[data-flow]")[1].getBoundingClientRect();
      return { left: r.left, width: r.width };
    });
    ok(near(small.width, 220) && near(small.left, (390 - 220) / 2, 1.5), `${t}: a small picture keeps its size, centred inside the gutters (${Math.round(small.left)}, ${Math.round(small.width)})`);
  }
  if (!size.full) ok(g.figs.every((f) => f.left >= 0 && f.left + f.width <= g.innerWidth + 1), `${t}: figures inside the panel`);
  await ctx.close();
}

// --- 3. Cross references and deep links -------------------------------------------------------------------------------------------------
for (const [name, opts] of [["full", { full: true }], ["panel", { full: false }]]) {
  const { ctx, page } = await open(1280, 800, opts);
  const links = await page.evaluate(() => [...document.querySelectorAll("a[data-slot=figure-mention]")].map((a) => ({ text: a.textContent, href: a.getAttribute("href") })));
  ok(links.length === 3 && links.every((l) => l.href === `#fig-${l.text.match(/\d/)[0]}`), `${name}: three in-page links, text unchanged (${links.map((l) => `${l.text} -> ${l.href}`).join(", ")})`);
  await page.locator("a[data-slot=figure-mention]", { hasText: "Fig. 3" }).first().click();
  await sleep(600);
  const landed = await page.evaluate(() => {
    const f = document.getElementById("fig-3");
    const r = f.getBoundingClientRect();
    return { active: document.activeElement === f, top: r.top, inView: r.top >= 0 && r.top < window.innerHeight * 0.6, hash: location.hash, search: location.search };
  });
  ok(landed.hash === "#fig-3" && landed.active, `${name}: following the link focuses the figure (${landed.hash}, active ${landed.active})`);
  ok(landed.inView && (name === "panel" || landed.top >= 56), `${name}: the figure lands in view${name === "full" ? " below the sticky header" : ""} (top ${Math.round(landed.top)})`);
  ok(name === "panel" ? !landed.search.includes("view") : landed.search.includes("view=full"), `${name}: the view is kept (${landed.search})`);
  await ctx.close();
}
{
  const { ctx, page } = await open(1280, 800, { full: true, hash: "#fig-3" });
  const r = await page.evaluate(() => ({ top: document.getElementById("fig-3").getBoundingClientRect().top, hash: location.hash }));
  ok(r.hash === "#fig-3" && r.top > 0 && r.top < 800 * 0.6 && r.top >= 56, `deep link: #fig-3 is in view on load (top ${Math.round(r.top)})`);
  await ctx.close();
}
{
  const { ctx, page } = await open(1280, 800, { full: true, reducedMotion: "reduce" });
  ok((await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)) === "auto", "reduced motion: scroll behaviour is instant");
  await page.locator("a[data-slot=figure-mention]", { hasText: "Fig. 1" }).first().click();
  await sleep(80);
  const top = await page.evaluate(() => document.getElementById("fig-1").getBoundingClientRect().top);
  ok(top >= 56 && top < 400, `reduced motion: the figure is in place right away (top ${Math.round(top)})`);
  await ctx.close();
}

// --- 4. The lightbox --------------------------------------------------------------------------------------------------------------------
{
  const { ctx, page, logs } = await open(1440, 900, { full: false });
  const buttons = await page.evaluate(() => [...document.querySelectorAll(".entry-fig-zoom")].map((b) => ({ label: b.getAttribute("aria-label"), cursor: getComputedStyle(b).cursor, fig: b.closest("figure").id })));
  ok(buttons.length === 2 && buttons.map((b) => b.fig).join() === "fig-1,fig-3", `a zoom control on the wide figures only (${buttons.map((b) => b.fig).join(", ")}); the 480 px diagram has none`);
  ok(buttons[0].label === "View figure 1 larger" && buttons[0].cursor === "zoom-in", `the control is named "${buttons[0].label}" and shows zoom-in`);
  const trigger = page.getByRole("button", { name: "View figure 1 larger" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await page.waitForSelector("dialog[open]");
  const open1 = await page.evaluate(() => {
    const d = document.querySelector("dialog[open]");
    const img = d.querySelector("img");
    const cap = d.querySelector("figcaption");
    return {
      modal: d.matches(":modal"),
      active: d.contains(document.activeElement) ? document.activeElement.getAttribute("aria-label") : null,
      imgWidth: img.getBoundingClientRect().width,
      capText: cap.textContent,
      capBelow: cap.getBoundingClientRect().top >= img.getBoundingClientRect().bottom - 1,
      name: d.getAttribute("aria-label"),
    };
  });
  ok(open1.modal && open1.active === "Close", `the dialog is modal and focus starts on its Close button (${open1.active})`);
  ok(near(open1.imgWidth, 960, 1), `the picture is shown at its natural 960 px (${Math.round(open1.imgWidth)})`);
  ok(open1.capBelow && open1.capText.startsWith("Fig. 1 "), `the caption is under the picture ("${open1.capText.slice(0, 30)}...")`);
  await page.screenshot({ path: `${OUT_DIR}/lightbox-1440-light.png` });
  const trapped = [];
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Tab");
    // inside the dialog, or (the last control's next stop) out of the page altogether (the browser's own interface): never in the page behind
    trapped.push(await page.evaluate(() => !!document.activeElement?.closest("dialog") || document.activeElement === document.body));
  }
  ok(trapped.every(Boolean), "Tab never reaches the page behind the dialog (focus trap)");
  const before = await page.evaluate(() => location.pathname + location.search);
  await page.keyboard.press("Escape");
  await sleep(200);
  const closed = await page.evaluate(() => ({ open: !!document.querySelector("dialog[open]"), panel: !!document.querySelector("[data-panel]"), url: location.pathname + location.search, active: document.activeElement?.getAttribute("aria-label") }));
  ok(!closed.open && closed.panel && closed.url === before, `Escape closes the dialog only: the panel stays (${closed.url})`);
  ok(closed.active === "View figure 1 larger", `focus returns to the figure's control (${closed.active})`);
  // a click on the backdrop closes it; so does the Close button
  await trigger.click();
  await page.waitForSelector("dialog[open]");
  await page.mouse.click(8, 8);
  await sleep(200);
  ok(!(await page.evaluate(() => !!document.querySelector("dialog[open]"))), "a click on the backdrop closes the dialog");
  await trigger.click();
  await page.locator("dialog[open]").getByRole("button", { name: "Close" }).click();
  await sleep(200);
  ok(!(await page.evaluate(() => !!document.querySelector("dialog[open]"))) && (await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))) === "View figure 1 larger", "the Close button closes it and the focus comes back");
  ok(logs.length === 0, `no console errors${logs.length ? ` (${logs.join(" | ")})` : ""}`);
  await ctx.close();
}
{
  const { ctx, page } = await open(390, 844, { touch: true });
  await page.locator(".entry-fig-zoom").first().tap();
  await page.waitForSelector("dialog[open]");
  const w = await page.evaluate(() => {
    const d = document.querySelector("dialog[open]");
    return { img: d.querySelector("img").getBoundingClientRect().width, dialog: d.getBoundingClientRect().width, hs: document.documentElement.scrollWidth - innerWidth };
  });
  ok(w.img <= 390 - 40 && w.dialog <= 390 && w.hs <= 0, `390: the picture shrinks to the window (${Math.round(w.img)} in a ${Math.round(w.dialog)} px dialog)`);
  await page.screenshot({ path: `${OUT_DIR}/lightbox-390-light.png` });
  await ctx.close();
}

// --- 5. Print ---------------------------------------------------------------------------------------------------------------------------
{
  const { ctx, page } = await open(1280, 900, { full: false });
  await page.emulateMedia({ media: "print" });
  const p = await page.evaluate(() => ({
    figs: [...document.querySelectorAll("figure[data-flow]")].map((f) => ({ visible: f.getClientRects().length > 0, w: f.getBoundingClientRect().width })),
    zoom: [...document.querySelectorAll(".entry-fig-zoom")].every((b) => getComputedStyle(b).display === "none"),
  }));
  ok(p.figs.length === 3 && p.figs.every((f) => f.visible && f.w > 0) && p.zoom, "print: the figures are in the flow and the zoom controls are gone");
  await ctx.close();
}

// --- 6. Screenshots: light and dark; 390, 1280, 1920 ------------------------------------------------------------------------------------
for (const scheme of ["light", "dark"]) {
  for (const [w, h, touch] of [[390, 844, true], [1280, 800, false], [1920, 1080, false]]) {
    const { ctx, page } = await open(w, h, { scheme, touch });
    // the page from the first figure's paragraph to the end of the second figure
    await page.evaluate(() => document.getElementById("fig-1").scrollIntoView({ block: "start" }));
    await sleep(300);
    await page.screenshot({ path: `${OUT_DIR}/figures-${w}-${scheme}-fig1.png` });
    await page.evaluate(() => document.getElementById("fig-2")?.scrollIntoView({ block: "center" }) ?? document.querySelectorAll("figure[data-flow]")[1].scrollIntoView({ block: "center" }));
    await sleep(300);
    await page.screenshot({ path: `${OUT_DIR}/figures-${w}-${scheme}-fig2.png` });
    await ctx.close();
  }
}

await browser.close();
console.log(failures.length === 0 ? "\nALL PASS" : `\n${failures.length} FAILED`);
process.exit(failures.length === 0 ? 0 : 1);
