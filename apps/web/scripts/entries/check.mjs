// Entry views in a browser (docs/web-architecture.md, "Entries in the shell"): the four kinds open in the shell's side panel and in
// the full-screen container (`?view=full`), the globe stays mounted while the container toggles, Escape and the toggle behave, the
// place panel lists its entries and opens one in the same panel, headings are in order, nothing overflows at 390 px, no console errors.
// (The blurred images of a sensitive entry have their own check: `scripts/entries/sensitive.mjs`.)
// Uses the DEMO content (made-up placeholders): run against `pnpm dev:demo` or a demo build, never against real content.
//
//   CHROME_PATH=/path/to/chrome BASE_URL=http://localhost:5370 OUT_DIR=/some/dir node scripts/entries/check.mjs
//
// Exit code 1 on any failed assertion. Screenshots (dark and light, desktop and 390 px) go to OUT_DIR.
import { readFileSync } from "node:fs";
import { BASE_URL, OUT_DIR, DESKTOP, MOBILE, launch } from "../globe/_lib.mjs";

// The four legacy slugs are the first entry of their kind in the demo fixture; the whole fixture is also read, so that every entry (long
// title, long verse line, wide code, many tags, no cover) goes through the layout checks below.
const FIXTURE = JSON.parse(readFileSync(new URL("../../../../packages/published/fixtures/demo.json", import.meta.url), "utf8"));
// [kind, projection key (the fixture's), route segment]: the sections are named after their plural except two, `/software` (the project kind) and
// `/poetry` (the poems); lib/sections.ts is the table.
const COLLECTIONS = [["article", "articles", "articles"], ["project", "projects", "software"], ["artwork", "artworks", "artworks"], ["poem", "poems", "poetry"]];
// The word an entry's meta line starts with (lib/sections.ts `label`): the kind's own name, except for the project kind, which reads "Software".
const KIND_WORD = { project: "software" };
const ALL_ENTRIES = COLLECTIONS.flatMap(([kind, key, segment]) => FIXTURE[key].map((e) => ({ kind, key, slug: e.slug, title: e.title, path: `/${segment}/${e.slug}` })));
const ENTRIES = ["demo-article", "demo-poem", "demo-project", "demo-artwork"].map((slug) => ALL_ENTRIES.find((e) => e.slug === slug));

const failures = [];
const ok = (cond, message) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${message}`);
  if (!cond) failures.push(message);
};

const browser = await launch();

async function newPage(contextOptions, colorScheme = "dark") {
  const ctx = await browser.newContext({ ...contextOptions, colorScheme });
  const page = await ctx.newPage();
  const logs = [];
  page.on("console", (m) => {
    if (m.type() === "error") logs.push(`console.error: ${m.text()}`);
  });
  page.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));
  return { ctx, page, logs };
}

const waitPanel = (page) => page.waitForSelector("[data-panel]", { state: "visible", timeout: 15000 });
const waitGlobeMounted = (page) => page.waitForSelector("[data-globe]", { state: "attached", timeout: 20000 });
const panelState = (page) =>
  page.evaluate(() => {
    const p = document.querySelector("[data-panel]");
    const r = p?.getBoundingClientRect();
    return p ? { layout: p.getAttribute("data-layout"), role: p.getAttribute("role"), width: Math.round(r.width), left: Math.round(r.left), url: location.pathname + location.search } : null;
  });
const headingLevels = (page) =>
  page.evaluate(() => [...document.querySelectorAll("[data-panel] h1, [data-panel] h2, [data-panel] h3, [data-panel] h4, main h1, main h2, main h3, main h4")].filter((h) => h.getClientRects().length > 0 && !h.closest("[inert]")).map((h) => +h.tagName[1]));
const outline = (levels) => levels[0] === 1 && levels.filter((l) => l === 1).length === 1 && levels.every((l, i) => i === 0 || l - levels[i - 1] <= 1);
const overflow = (page) => page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth);

// --- 1. Desktop: each kind, panel and full screen -----------------------------------------------------------------------------------
for (const entry of ENTRIES) {
  const { ctx, page, logs } = await newPage(DESKTOP);
  const response = await page.goto(`${BASE_URL}${entry.path}`);
  ok(response?.status() === 200, `${entry.path}: 200`);
  await waitPanel(page);
  await waitGlobeMounted(page);
  await page.waitForTimeout(800);
  const t = `${entry.kind}`;

  const text = await page.locator("[data-panel] h1").innerText();
  ok(text === entry.title, `${t}: the panel's h1 is the title`);
  const metaLine = await page.locator("[data-slot=entry-meta]").innerText();
  ok(new RegExp(`^${KIND_WORD[entry.kind] ?? entry.kind}`, "i").test(metaLine) && !/\/\s*\d{4}|№/.test(metaLine), `${t}: the meta line says the kind in plain words and carries no index code (${metaLine.replace(/\n/g, " ")})`);
  const p0 = await panelState(page);
  ok(p0.layout === "panel" && p0.role === "complementary" && Math.abs(p0.left - 720) <= 2, `${t}: the panel is the right half, a complementary landmark`);
  ok(outline(await headingLevels(page)), `${t}: one h1, headings never skip a level (${(await headingLevels(page)).join("")})`);
  ok((await page.locator("main#main").count()) === 1 && (await page.locator("[data-panel] h1").evaluate((h) => document.activeElement === h).catch(() => false)) === false, `${t}: direct load keeps focus off the heading (no focus steal) and #main is the globe's main`);

  // the globe keeps its identity across the toggle
  await page.evaluate(() => {
    const g = document.querySelector("[data-globe]");
    g.__marker = "same-node";
    window.__canvasCount = document.querySelectorAll("canvas").length;
  });
  const toggle = page.getByRole("button", { name: "Full screen" });
  ok((await toggle.getAttribute("aria-pressed")) === "false", `${t}: the expand toggle is a pressed-state button, off`);
  await toggle.focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelector("[data-panel]")?.getAttribute("data-layout") === "full");
  await page.waitForTimeout(500);
  const p1 = await panelState(page);
  ok(p1.url.endsWith("?view=full"), `${t}: URL gets ?view=full (${p1.url})`);
  ok(p1.width >= 1438 && p1.role === "main", `${t}: full screen covers the viewport and is the main landmark (${p1.width}px)`);
  const kept = await page.evaluate(() => ({ same: document.querySelector("[data-globe]")?.__marker === "same-node", canvases: document.querySelectorAll("canvas").length === window.__canvasCount }));
  ok(kept.same && kept.canvases, `${t}: the globe node and its canvases are the same after expanding (not remounted)`);
  ok((await page.evaluate(() => document.activeElement?.getAttribute("aria-pressed"))) === "true", `${t}: focus stays on the toggle, now pressed`);
  ok((await page.evaluate(() => document.querySelectorAll("main#main, #main").length)) === 1, `${t}: exactly one #main in full screen`);
  ok(outline(await headingLevels(page)), `${t}: full screen: one h1, no skipped level`);
  ok((await page.evaluate(() => document.querySelector("main[inert]") !== null)), `${t}: the globe's main is inert behind the full view`);
  await page.screenshot({ path: `${OUT_DIR}/${t}-full-dark.png` });

  // skip link lands on the full view
  await page.keyboard.press("Tab");
  await page.focus("a[href='#main']");
  await page.keyboard.press("Enter");
  ok((await page.evaluate(() => document.activeElement?.id)) === "main" && (await page.evaluate(() => document.activeElement?.getAttribute("data-panel"))) !== null, `${t}: "Skip to content" focuses the full view`);

  // reload keeps the mode
  await page.reload();
  await waitPanel(page);
  ok((await panelState(page)).layout === "full", `${t}: reload keeps full screen`);
  const ssr = await page.request.get(`${BASE_URL}${entry.path}?view=full`).then((r) => r.text());
  ok(/data-layout="full"/.test(ssr) && ssr.includes(`>${entry.title}<`), `${t}: the server renders the full view (SSR)`);

  // back to the panel with the toggle; the URL loses the parameter
  await waitGlobeMounted(page);
  await page.getByRole("button", { name: "Full screen" }).click();
  await page.waitForFunction(() => document.querySelector("[data-panel]")?.getAttribute("data-layout") === "panel");
  await page.waitForTimeout(500);
  const p2 = await panelState(page);
  ok(!p2.url.includes("view=") && Math.abs(p2.left - 720) <= 2, `${t}: collapsing returns to the half panel and drops ?view (${p2.url})`);
  // Back goes to full again (the toggle is a history entry), then forward
  await page.goBack();
  await page.waitForFunction(() => document.querySelector("[data-panel]")?.getAttribute("data-layout") === "full");
  ok(true, `${t}: browser Back from the panel returns to full screen`);
  await page.goForward();
  await page.waitForFunction(() => document.querySelector("[data-panel]")?.getAttribute("data-layout") === "panel");

  // Escape closes
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => location.pathname === "/");
  await page.waitForFunction(() => !document.querySelector("[data-panel]"));
  ok(true, `${t}: Escape closes the panel and returns to /`);
  ok((await page.evaluate(() => document.querySelectorAll("h1").length)) === 1, `${t}: closed: the globe page has its own single h1`);
  ok(logs.length === 0, `${t}: no console errors${logs.length ? ` (${logs.join(" | ")})` : ""}`);
  await ctx.close();
}

// --- 2. The place panel lists its entries; one opens in the same panel with a way back ---------------------------------------------------
{
  const { ctx, page, logs } = await newPage(DESKTOP);
  await page.goto(`${BASE_URL}/locations/lisbon`);
  await waitPanel(page);
  await waitGlobeMounted(page);
  await page.waitForTimeout(800);
  ok((await page.locator("[data-panel] h1").innerText()) === "Lisbon", "place: panel h1 is the place");
  ok(outline(await headingLevels(page)), `place: headings in order (${(await headingLevels(page)).join("")})`);
  const groups = await page.locator("[data-slot=place-entries] h2").allInnerTexts();
  ok(groups.length === 2 && /articles/i.test(groups[0]) && /software/i.test(groups[1]), `place: entries grouped by kind (${groups.join(" | ").replace(/\n/g, " ")})`);
  await page.screenshot({ path: `${OUT_DIR}/place-dark.png` });
  await page.evaluate(() => {
    document.querySelector("[data-panel]").__marker = "same-panel";
    document.querySelector("[data-globe]").__marker = "same-globe";
  });
  await page.getByRole("link", { name: "Eleven hours of Atlantic coast, by bus" }).click();
  await page.waitForURL("**/articles/morocco-coast-bus");
  await page.waitForSelector("[data-slot=entry-view]");
  const same = await page.evaluate(() => ({ panel: document.querySelector("[data-panel]")?.__marker === "same-panel", globe: document.querySelector("[data-globe]")?.__marker === "same-globe", focus: document.activeElement?.id }));
  ok(same.panel && same.globe, "place: the entry opens in the SAME panel element, the globe stays mounted");
  ok(same.focus === "panel-heading", "place: focus moves to the entry's heading after the click");
  const back = page.getByRole("link", { name: /Back to .*Lisbon/ });
  ok((await back.count()) === 1, "entry opened from a place has a way back to it");
  await back.click();
  await page.waitForURL("**/locations/lisbon");
  await page.waitForSelector("[data-slot=place-view]");
  ok((await page.locator("[data-panel] h1").innerText()) === "Lisbon", "back path returns to the place panel");
  // entry -> place by its places list
  await page.getByRole("link", { name: "Collide, a label collision engine for maps" }).click();
  await page.waitForURL("**/software/label-collision-engine");
  await page.locator('[data-slot=entry-view] section a[href="/locations/lisbon"]').click();
  await page.waitForURL("**/locations/lisbon");
  await page.waitForSelector("[data-slot=place-view]");
  ok(true, "entry: its place links to /locations/:slug");
  ok(logs.length === 0, `place: no console errors${logs.length ? ` (${logs.join(" | ")})` : ""}`);
  await ctx.close();
}

// --- 3. Unknown slugs are real 404s through the not-found page ----------------------------------------------------------------------------
for (const path of ["/articles/nope", "/software/demo-poem", "/poetry/Demo-Poem"]) {
  const { ctx, page } = await newPage(DESKTOP);
  const r = await page.goto(`${BASE_URL}${path}`);
  ok(r?.status() === 404, `${path}: 404`);
  ok(/Page not found/.test(await page.locator("h1").first().innerText()), `${path}: the not-found page`);
  await ctx.close();
}

// The poems' section is "Poetry" at /poetry; /poems (and every entry under it) is a permanent redirect that keeps the query.
for (const [from, to] of [["/poems", "/poetry"], ["/poems?tag=night", "/poetry?tag=night"], ["/poems/demo-poem", "/poetry/demo-poem"], ["/poems/demo-poem?view=full", "/poetry/demo-poem?view=full"]]) {
  const { ctx, page, logs } = await newPage(DESKTOP);
  const first = await page.request.get(`${BASE_URL}${from}`, { maxRedirects: 0 });
  ok(first.status() === 301 && first.headers().location === to, `${from}: 301 to ${to} (${first.status()} ${first.headers().location})`);
  const r = await page.goto(`${BASE_URL}${from}`);
  const url = new URL(page.url());
  ok(r?.status() === 200 && url.pathname + url.search === to, `${from}: the browser lands on ${to} (${url.pathname}${url.search})`);
  if (to.startsWith("/poetry/")) await waitPanel(page);
  ok(logs.length === 0, `${from}: no console errors${logs.length ? ` (${logs.join(" | ")})` : ""}`);
  await ctx.close();
}
// The projects' section is "Software" at /software; /projects (and every entry under it) is a permanent redirect that keeps the query.
for (const [from, to] of [["/projects", "/software"], ["/projects?tag=rail", "/software?tag=rail"], ["/projects/demo-project", "/software/demo-project"], ["/projects/demo-project?view=full", "/software/demo-project?view=full"]]) {
  const { ctx, page, logs } = await newPage(DESKTOP);
  const first = await page.request.get(`${BASE_URL}${from}`, { maxRedirects: 0 });
  ok(first.status() === 301 && first.headers().location === to, `${from}: 301 to ${to} (${first.status()} ${first.headers().location})`);
  const r = await page.goto(`${BASE_URL}${from}`);
  const url = new URL(page.url());
  ok(r?.status() === 200 && url.pathname + url.search === to, `${from}: the browser lands on ${to} (${url.pathname}${url.search})`);
  if (to.startsWith("/software/")) await waitPanel(page);
  ok(logs.length === 0, `${from}: no console errors${logs.length ? ` (${logs.join(" | ")})` : ""}`);
  await ctx.close();
}
{
  const { ctx, page } = await newPage(DESKTOP);
  await page.goto(`${BASE_URL}/software`);
  ok((await page.locator("h1").first().innerText()) === "Software", "/software: the page is called Software");
  const count = await page.locator("[data-slot=list-count]").innerText();
  ok(/^\d+ software$/i.test(count.trim()), `/software: the count says software (${count.trim()})`);
  const nav = await page.locator('nav[aria-label="Primary"] a').allInnerTexts();
  ok(nav.some((t) => /^software$/i.test(t.trim())) && !nav.some((t) => /^projects$/i.test(t.trim())), `/software: the header's section is Software (${nav.join(", ")})`);
  ok((await page.title()).startsWith("Software"), `/software: the title starts with Software (${await page.title()})`);
  await ctx.close();
}
{
  const { ctx, page } = await newPage(DESKTOP);
  await page.goto(`${BASE_URL}/poetry`);
  ok((await page.locator("h1").first().innerText()) === "Poetry", "/poetry: the page is called Poetry");
  const count = await page.locator("[data-slot=list-count]").innerText();
  ok(/^\d+ poems$/i.test(count.trim()), `/poetry: the count says poems (${count.trim()})`);
  const nav = await page.locator('nav[aria-label="Primary"] a').allInnerTexts();
  ok(nav.some((t) => /^poetry$/i.test(t.trim())) && !nav.some((t) => /^poems$/i.test(t.trim())), `/poetry: the header's section is Poetry (${nav.join(", ")})`);
  await ctx.close();
}

// --- 4. Lists ----------------------------------------------------------------------------------------------------------------------------
for (const [kind, key, segment] of COLLECTIONS) {
  const path = `/${segment}`;
  const { ctx, page, logs } = await newPage(DESKTOP);
  await page.goto(`${BASE_URL}${path}`);
  const slugs = FIXTURE[key].map((e) => e.slug);
  const found = await Promise.all(slugs.map((slug) => page.locator(`#${slug}`).count()));
  ok(found.every((n) => n === 1), `${path}: one card per demo ${kind} (${slugs.length}), each anchored by its slug`);
  ok(outline(await headingLevels(page)), `${path}: one h1, cards at level 2`);
  const slug = slugs[0];
  const href = await page.locator(`#${slug} a`).first().getAttribute("href");
  ok(href === `${path}/${slug}`, `${path}: the card links to ${href}`);
  const covers = await page.evaluate(() => [...document.querySelectorAll("main img")].filter((i) => i.getClientRects().length).map((i) => i.complete && i.naturalWidth > 0));
  ok(covers.every(Boolean), `${path}: every authored cover in the list loaded (${covers.length} images)`);
  const wide = await overflow(page);
  ok(wide <= 0, `${path}: no horizontal overflow on desktop (${wide})`);
  await page.screenshot({ path: `${OUT_DIR}/list-${segment}-desktop-dark.png`, fullPage: true });
  await page.locator(`#${slug} a`).first().click();
  await page.waitForURL(`**${path}/${slug}`);
  await waitPanel(page);
  ok(true, `${path}: the card opens the entry in the panel`);
  ok(logs.length === 0, `${path}: no console errors${logs.length ? ` (${logs.join(" | ")})` : ""}`);
  await ctx.close();
}
if (process.env.BASE_URL_EMPTY) {
  const { ctx, page } = await newPage(DESKTOP);
  await page.goto(`${process.env.BASE_URL_EMPTY}/articles`);
  ok(/Nothing here yet/.test(await page.locator("main").innerText()), "empty collection: the StatePanel says nothing here yet");
  await page.screenshot({ path: `${OUT_DIR}/list-empty-dark.png` });
  await ctx.close();
}

// --- 5. 390 px: no horizontal overflow, slide-over, no expand toggle ----------------------------------------------------------------------
for (const scheme of ["dark", "light"]) {
  for (const path of [...ALL_ENTRIES.map((e) => e.path), "/locations/lisbon", "/locations/cusco", "/locations/zagreb", "/articles", "/poetry", "/software", "/artworks"]) {
    const { ctx, page, logs } = await newPage(MOBILE, scheme);
    await page.goto(`${BASE_URL}${path}`);
    await page.waitForTimeout(700);
    const o = await overflow(page);
    ok(o <= 0, `390px ${scheme} ${path}: no horizontal overflow (${o})`);
    if (/\/(articles|software|artworks|poetry|locations)\/./.test(path)) {
      await page.waitForSelector("[role=dialog]");
      ok((await page.getByRole("button", { name: "Full screen" }).count()) === 0 || !(await page.getByRole("button", { name: "Full screen" }).isVisible()), `390px ${path}: no expand toggle (the slide-over is full screen)`);
      ok(await page.evaluate(() => document.activeElement?.id === "panel-heading"), `390px ${path}: focus moves to the heading`);
      if (/^\/(articles|software|artworks|poetry)\//.test(path) || path.startsWith("/locations/")) await page.screenshot({ path: `${OUT_DIR}/${path.slice(1).replace(/\//g, "-")}-${scheme}-390.png` });
    } else if (path === "/poetry" || path === "/articles" || path === "/software" || path === "/artworks") await page.screenshot({ path: `${OUT_DIR}/list${path.replace("/", "-")}-${scheme}-390.png` });
    // 44 px targets
    const small = await page.evaluate(() => [...document.querySelectorAll("a, button")].filter((e) => e.getClientRects().length && !e.closest("[inert]") && !e.classList.contains("sr-only")).map((e) => {
      // A control may reach 44 px with a ::before hit area (tag links, heading anchors): count the larger of the two boxes.
      const pseudo = getComputedStyle(e, "::before");
      const grown = pseudo.position === "absolute" ? { h: parseFloat(pseudo.height) || 0, w: parseFloat(pseudo.width) || 0 } : { h: 0, w: 0 };
      const box = e.getBoundingClientRect();
      return { t: (e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 24), h: Math.max(box.height, grown.h), w: Math.max(box.width, grown.w) };
    }).filter((r) => r.h < 43.5 && r.w < 43.5 && r.t));
    ok(small.length === 0, `390px ${scheme} ${path}: targets are 44 px (${small.map((s) => `${s.t}:${Math.round(s.w)}x${Math.round(s.h)}`).join(", ")})`);
    ok(logs.length === 0, `390px ${scheme} ${path}: no console errors${logs.length ? ` (${logs.join(" | ")})` : ""}`);
    await ctx.close();
  }
}

// --- 6. Desktop screenshots in both schemes, and reduced motion ---------------------------------------------------------------------------
for (const scheme of ["dark", "light"]) {
  for (const [name, path] of [["article", "/articles/demo-article"], ["poem", "/poetry/demo-poem"], ["project", "/software/demo-project"], ["artwork", "/artworks/demo-artwork"], ["article-full", "/articles/demo-article?view=full"], ["poem-full", "/poetry/demo-poem?view=full"], ["list-articles", "/articles"]]) {
    const { ctx, page } = await newPage(DESKTOP, scheme);
    await page.goto(`${BASE_URL}${path}`);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT_DIR}/${name}-${scheme}.png` });
    await ctx.close();
  }
}
{
  const ctx = await browser.newContext({ ...DESKTOP, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(`${BASE_URL}/articles/demo-article`);
  await waitPanel(page);
  await page.getByRole("button", { name: "Full screen" }).click();
  await page.waitForTimeout(60);
  const w = await page.evaluate(() => Math.round(document.querySelector("[data-panel]").getBoundingClientRect().width));
  ok(w >= 1438, `reduced motion: the container switches at once (${w}px after 60 ms)`);
  await ctx.close();
}

// --- 7. Every demo entry, in the panel and in full screen: its title, nothing wider than its container, every image loaded ------------------------------
// (what the richer content can break: a very long title, long verse lines, wide code, many tags, a cover or no cover, many images).
for (const entry of ALL_ENTRIES) {
  for (const layout of ["panel", "full"]) {
    const { ctx, page, logs } = await newPage(DESKTOP);
    await page.goto(`${BASE_URL}${entry.path}${layout === "full" ? "?view=full" : ""}`);
    await waitPanel(page);
    await page.waitForTimeout(500);
    // let every lazy image load before measuring
    await page.evaluate(async () => {
      const panel = document.querySelector("[data-panel]");
      for (const img of panel.querySelectorAll("img")) img.loading = "eager";
      for (let y = 0; y < panel.scrollHeight; y += 600) { panel.scrollTo?.(0, y); window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
      await Promise.all([...panel.querySelectorAll("img")].map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))));
      panel.scrollTo?.(0, 0);
      window.scrollTo(0, 0);
    });
    const t = `${entry.path}${layout === "full" ? " (full)" : ""}`;
    ok((await page.locator("[data-panel] h1").innerText()) === entry.title, `${t}: the h1 is the title`);
    ok(outline(await headingLevels(page)), `${t}: one h1, no skipped heading level`);
    const m = await page.evaluate(() => {
      const panel = document.querySelector("[data-panel]");
      const box = panel.getBoundingClientRect();
      const wide = [...panel.querySelectorAll("*")]
        // a blurred picture is enlarged inside its clipping frame (`.sensitive-media`): it is not wider than the panel, it is clipped
        .filter((e) => !e.closest("pre") && !e.closest(".sensitive-media-content") && e.getClientRects().length && e.getBoundingClientRect().right > box.right + 1)
        .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 30)}`);
      const images = [...panel.querySelectorAll("img")].map((i) => i.complete && i.naturalWidth > 0);
      const pre = [...panel.querySelectorAll("pre")].map((p) => ({ scrolls: p.scrollWidth > p.clientWidth, focusable: p.tabIndex >= 0 }));
      return { wide: wide.slice(0, 4), images, pre, overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth };
    });
    ok(m.wide.length === 0 && m.overflow <= 0, `${t}: nothing wider than the panel (${m.wide.join(", ") || "ok"}, page overflow ${m.overflow})`);
    ok(m.images.every(Boolean), `${t}: every image loaded (${m.images.length})`);
    ok(m.pre.every((p) => !p.scrolls || p.focusable), `${t}: a code block that scrolls is focusable (${m.pre.length} blocks)`);
    ok(logs.length === 0, `${t}: no console errors${logs.length ? ` (${logs.join(" | ")})` : ""}`);
    if (layout === "full" || ["demo-poem", "vietnam-by-rail", "timetable-diff", "altiplano-sediment", "citadel-rain", "cuesta-arriba", "quai-de-nuit", "rain-at-the-citadel-gate"].includes(entry.slug)) {
      await page.screenshot({ path: `${OUT_DIR}/entry-${entry.slug}-${layout}.png`, fullPage: false });
    }
    await ctx.close();
  }
}

// --- 8. Polish: reading aids, filters, related entries, the empty home, print ------------------------------------------------------------------
{
  const { ctx, page, logs } = await newPage({ ...DESKTOP, permissions: ["clipboard-read", "clipboard-write"] });
  // reading time (computed when no authored fact), contents (full only), copy link, anchors
  // (every demo article authors a `Reading time` fact, so the computed "N min read" is covered by lib/reading.test.ts and only its absence is checked here)
  await page.goto(`${BASE_URL}/articles/rain-at-the-citadel-gate`);
  await waitPanel(page);
  await page.goto(`${BASE_URL}/articles/demo-article?view=full`);
  await waitPanel(page);
  ok((await page.locator("[data-slot=entry-reading]").count()) === 0, "an authored Reading time fact is not repeated by the computed one");
  ok((await page.locator("[data-slot=entry-toc] a").count()) === 3, "full screen: the contents list the three sections");
  await page.locator("[data-slot=entry-toc] a").nth(2).click();
  await page.waitForFunction(() => location.hash === "#body-belgrade-06-12");
  ok((await page.locator("[data-slot=entry-toc] a[aria-current=location]").innerText()).includes("Belgrade"), "the contents mark the section being read (scroll-spy)");
  ok((await page.locator("#body-belgrade-06-12 a[aria-label^='Link to section']").getAttribute("href")) === "#body-belgrade-06-12", "a heading has an accessible anchor link");
  await page.locator("button", { hasText: "Copy link" }).click();
  await page.waitForSelector("button[data-state=copied]");
  ok((await page.evaluate(() => navigator.clipboard.readText())).endsWith("/articles/demo-article"), "copy link: the clipboard holds the entry's address, without ?view");
  // related by shared places and tags, and the neighbours, at the end
  const related = await page.locator("[data-slot=entry-more] section a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  ok(related.length >= 2 && related.every((h) => h.startsWith("/")), `related entries are cards at the end of the entry (${related.join(", ")})`);
  ok((await page.locator("[data-slot=entry-neighbours] a[rel=next]").count()) === 1, "the next article of the kind is linked");
  ok(logs.length === 0, `polish: no console errors${logs.length ? ` (${logs.join(" | ")})` : ""}`);
  // panel: no contents, but the same entry
  await page.goto(`${BASE_URL}/articles/demo-article`);
  await waitPanel(page);
  ok(!(await page.locator("[data-slot=entry-toc]").isVisible()), "the contents are not shown in the side panel");
  await ctx.close();
}
{
  const { ctx, page } = await newPage(DESKTOP);
  // list filter: URL addressable, server rendered, one h1, the chips come first in the tab order
  await page.goto(`${BASE_URL}/articles`);
  await page.locator("[data-slot=tag-filter] a", { hasText: /^rail/i }).first().click();
  await page.waitForURL("**/articles?tag=rail");
  await page.waitForFunction(() => document.querySelectorAll("main article").length === 2);
  ok((await page.locator("main article").count()) === 2, "list: ?tag=rail keeps the two articles tagged rail");
  ok((await page.locator("[data-slot=tag-filter] a[aria-current=true]").count()) === 1, "list: the selected tag is aria-current");
  const ssr = await page.request.get(`${BASE_URL}/articles?tag=rail`).then((r) => r.text());
  ok((ssr.match(/<article/g) ?? []).length === 2, "list: the filter is server rendered (works without scripts)");
  ok(outline(await headingLevels(page)), "list: one h1 and no skipped heading level while filtered");
  await page.goto(`${BASE_URL}/articles?tag=unknown-tag`);
  ok((await page.locator("main article").count()) === 5, "list: an unknown tag shows everything");
  await ctx.close();
}
if (process.env.BASE_URL_EMPTY) {
  const { ctx, page, logs } = await newPage(DESKTOP);
  await page.goto(process.env.BASE_URL_EMPTY);
  await waitGlobeMounted(page);
  await page.waitForTimeout(800);
  // The landing hero is the empty home too (docs/landing.md): the globe stays, the intro says no place is published, the four lists are its rows.
  ok((await page.locator("[data-slot=landing-hero]").count()) === 1 && (await page.locator("[data-globe]").count()) === 1, "empty home: the globe stays and the landing hero is there");
  ok(/No place is published yet/.test(await page.locator("[data-slot=landing-hero]").innerText()), "empty home: the hero says no place is published yet");
  ok((await page.locator("[data-slot=landing-hero] a").count()) === 4, "empty home: the hero opens the four lists");
  ok((await page.locator("h1").count()) === 1, "empty home: one h1");
  await page.screenshot({ path: `${OUT_DIR}/home-empty-dark.png` });
  ok(logs.length === 0, `empty home: no console errors${logs.length ? ` (${logs.join(" | ")})` : ""}`);
  await ctx.close();
}
{
  // a place with no entry says so
  const { ctx, page } = await newPage(DESKTOP);
  await page.goto(`${BASE_URL}/locations/bangkok`);
  await waitPanel(page);
  ok((await page.locator("[data-slot=place-entries]").count()) === 0 && (await page.locator("[data-panel] h2").count()) === 0, "a place without entries has no entries section and no empty box at all");
  // print: the chrome goes, the entry stays
  await page.goto(`${BASE_URL}/poetry/cuesta-arriba?view=full`);
  await waitPanel(page);
  await waitGlobeMounted(page);
  await page.emulateMedia({ media: "print" });
  const printed = await page.evaluate(() => ({ nav: getComputedStyle(document.querySelector("#app > header")).display, globe: getComputedStyle(document.querySelector("main")).display, panel: getComputedStyle(document.querySelector("[data-panel]")).position }));
  ok(printed.nav === "none" && printed.globe === "none" && printed.panel === "static", `print: navigation and globe hidden, the entry flows as a page (${JSON.stringify(printed)})`);
  await ctx.close();
}

// --- 9. Quick search (Cmd/Ctrl + K): an accessible combobox over the places and entries ---------------------------------------------------------
{
  const { ctx, page, logs } = await newPage(DESKTOP);
  await page.goto(`${BASE_URL}/articles`);
  await page.waitForTimeout(600);
  await page.keyboard.press("Control+k");
  await page.waitForSelector("dialog[open]");
  ok(await page.evaluate(() => document.activeElement?.getAttribute("role") === "combobox"), "search: Ctrl+K opens a modal dialog with the combobox focused");
  await page.keyboard.type("hue");
  await page.waitForFunction(() => document.querySelectorAll("[role=option]").length > 0);
  ok((await page.locator("[role=option]").first().innerText()).includes("Huế"), "search: accents are folded (hue finds Huế)");
  ok((await page.locator("input[role=combobox]").getAttribute("aria-activedescendant")) === (await page.locator("[role=option][aria-selected=true]").getAttribute("id")), "search: aria-activedescendant follows the highlighted option");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/locations/hue");
  ok((await page.locator("dialog").count()) === 0, "search: Enter opens the result and closes the palette");
  await page.keyboard.press("Control+k");
  await page.waitForSelector("dialog[open]");
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector("dialog"));
  ok(true, "search: Escape closes it");
  ok(logs.length === 0, `search: no console errors${logs.length ? ` (${logs.join(" | ")})` : ""}`);
  await ctx.close();
}

// --- 10. Review fixes: print in the dark scheme, the palette's Escape, long titles, small screens, forced colours, artwork covers -----------------------

// 10a. Print is ink on white whatever the scheme: the list pages (their root is rebound to the paper tokens) and an entry, emulated dark.
for (const path of ["/articles", "/poetry", "/articles/demo-article?view=full", "/poetry/demo-poem?view=full"]) {
  const { ctx, page } = await newPage(DESKTOP, "dark");
  await page.goto(`${BASE_URL}${path}`);
  await page.waitForTimeout(700);
  await page.emulateMedia({ media: "print", colorScheme: "dark" });
  await page.waitForTimeout(50);
  const ink = await page.evaluate(() => {
    const channels = (c) => (c.match(/[\d.]+/g) ?? []).map(Number);
    const lum = (c) => { const [r, g, b] = channels(c).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const h1 = document.querySelector("h1");
    const root = document.documentElement;
    const bg = getComputedStyle(document.body).backgroundColor;
    const fg = getComputedStyle(h1).color;
    const muted = [...document.querySelectorAll("main p, [data-panel] p")].filter((p) => p.getClientRects().length > 0 && p.textContent.trim()).slice(0, 6).map((p) => getComputedStyle(p).color);
    const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
    const panel = document.querySelector("[data-panel]");
    const panelBg = panel ? getComputedStyle(panel).backgroundColor : bg;
    return { bg: panelBg === bg ? bg : `${bg} / panel ${panelBg}`, panelBg, fg, rootBg: getComputedStyle(root).backgroundColor, ratio: contrast(fg, bg), muted: muted.map((m) => contrast(m, bg)) };
  });
  ok(ink.ratio >= 15 && ink.muted.every((r) => r >= 7) && ink.panelBg === "rgb(255, 255, 255)", `print + dark ${path}: ink on white (heading ${ink.fg} on ${ink.bg} = ${ink.ratio.toFixed(1)}:1, text ${ink.muted.map((r) => r.toFixed(1)).join(", ")}:1)`);
  await page.screenshot({ path: `${OUT_DIR}/print-dark-${path.replace(/[/?=]/g, "-")}.png`, fullPage: false });
  await ctx.close();
}

// 10b. The palette's Escape closes the palette only: the open panel stays (desktop), and the next Escape closes the panel.
{
  const { ctx, page, logs } = await newPage(DESKTOP);
  await page.goto(`${BASE_URL}/articles/demo-article`);
  await waitPanel(page);
  await page.waitForTimeout(600);
  await page.keyboard.press("Control+k");
  await page.waitForSelector("dialog[open]");
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector("dialog"));
  await page.waitForTimeout(300);
  ok(new URL(page.url()).pathname === "/articles/demo-article" && (await page.locator("[data-panel]").count()) === 1, "palette Escape: the palette closes and the open entry stays");
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => location.pathname === "/");
  ok(true, "palette Escape: a second Escape (no dialog) closes the panel");
  ok(logs.length === 0, `palette Escape: no console errors${logs.length ? ` (${logs.join(" | ")})` : ""}`);
  await ctx.close();
}

// 10c. A long title is scaled down, not squeezed: its column is the role's, whatever the scale (320 px phone slide-over, a 512 px panel, full screen).
for (const [label, options, path] of [
  ["320px", { ...MOBILE, viewport: { width: 320, height: 640 } }, "/articles/vietnam-by-rail"],
  ["512px panel", { viewport: { width: 1024, height: 800 }, deviceScaleFactor: 1 }, "/articles/vietnam-by-rail"],
  ["full", DESKTOP, "/articles/vietnam-by-rail?view=full"],
]) {
  const { ctx, page } = await newPage(options);
  await page.goto(`${BASE_URL}${path}`);
  await page.waitForSelector("h1.entry-title", { timeout: 15000 });
  await page.waitForTimeout(500);
  const t = await page.evaluate(() => {
    const h = document.querySelector("h1.entry-title");
    const cs = getComputedStyle(h);
    const entry = h.closest(".entry") ?? h.parentElement;
    const role = parseFloat(getComputedStyle(entry).getPropertyValue("--entry-title")) || null;
    const scale = parseFloat(h.style.getPropertyValue("--title-scale")) || 1;
    return { font: parseFloat(cs.fontSize), max: parseFloat(cs.maxWidth), width: h.getBoundingClientRect().width, scale, role, col: h.parentElement.getBoundingClientRect().width };
  });
  const expected = (t.font / t.scale) * 8.95;
  ok(Math.abs(t.max - expected) < 1.5, `long title ${label}: its measure is 8.95 of the role's size, not of the scaled size (max-width ${t.max.toFixed(0)} px, role size ${(t.font / t.scale).toFixed(1)} px, scale ${t.scale})`);
  ok(t.width <= t.col + 1, `long title ${label}: it fits its column (${t.width.toFixed(0)} of ${t.col.toFixed(0)} px)`);
  await ctx.close();
}

// 10d. Small screens: the filter's "All" and the header's "Globe" are 44 px wide targets, tags never start a line with a dot, no keyboard legend on touch.
{
  const { ctx, page } = await newPage({ ...MOBILE, viewport: { width: 320, height: 700 } });
  await page.goto(`${BASE_URL}/articles`);
  await page.waitForTimeout(600);
  const boxes = await page.evaluate(() => {
    const b = (e) => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 }; };
    const filters = [...document.querySelectorAll("[data-slot=tag-filter] a")].map((a) => ({ t: a.textContent.trim(), ...b(a) }));
    const globe = document.querySelector("header nav a[href='/']");
    return { filters, globe: globe ? b(globe) : null };
  });
  ok(boxes.filters.length > 0 && boxes.filters.every((f) => f.w >= 43.5 && f.h >= 43.5), `320px: every filter toggle is 44 x 44 or more (${boxes.filters.map((f) => `${f.t}:${f.w}x${f.h}`).join(", ")})`);
  ok(boxes.globe && boxes.globe.w >= 43.5 && boxes.globe.h >= 43.5, `320px: the header's Globe link is 44 x 44 or more (${boxes.globe?.w}x${boxes.globe?.h})`);
  const navFits = await page.evaluate(() => { const n = document.querySelector("header nav").getBoundingClientRect(); return { l: n.left, r: n.right, vw: innerWidth }; });
  ok(navFits.l >= -0.5 && navFits.r <= navFits.vw + 0.5, `320px: the header row still fits (${Math.round(navFits.l)} to ${Math.round(navFits.r)} of ${navFits.vw})`);
  // (a touch browser widens its layout viewport to fit what overflows: innerWidth is the proof that nothing does)
  ok(navFits.vw === 320, `320px: the list page is not wider than the phone (layout viewport ${navFits.vw})`);
  await page.goto(`${BASE_URL}/articles/vietnam-by-rail`);
  await page.waitForSelector("[data-slot=tag-list]");
  await page.waitForTimeout(500);
  const tags = await page.evaluate(() => [...document.querySelectorAll("[data-slot=tag-list]")].map((ul) => {
    const lis = [...ul.children];
    const before = lis.map((li) => getComputedStyle(li, "::before").content);
    const after = lis.map((li) => getComputedStyle(li, "::after").content);
    // first item of each wrapped line: the dot belongs to the item before it, so the item that starts a line has no dot in front
    const tops = [...new Set(lis.map((li) => Math.round(li.getBoundingClientRect().top)))];
    return { n: lis.length, lines: tops.length, noBefore: before.every((c) => c === "none" || c === "normal"), dots: after.slice(0, -1).every((c) => c.includes("·")), lastClean: after.at(-1) === "none" || after.at(-1) === "normal" };
  }));
  ok(tags.length > 0 && tags.every((t) => t.noBefore && t.dots && t.lastClean), `tags: the dot ends the item before it, none starts a line, none ends the list (${JSON.stringify(tags)})`);
  await ctx.close();
}
{
  // a touch screen (a coarse pointer) has no key legend in the palette; the real count is said when the list is capped
  const { ctx, page } = await newPage({ ...MOBILE });
  await page.goto(`${BASE_URL}/articles`);
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "Search" }).first().tap();
  await page.waitForSelector("dialog[open]");
  const legend = await page.evaluate(() => {
    const el = [...document.querySelectorAll("dialog [aria-hidden=true]")].find((e) => /move/.test(e.textContent ?? "") && /close/.test(e.textContent ?? ""));
    return { shown: el ? getComputedStyle(el).display !== "none" : null, coarse: matchMedia("(pointer: coarse)").matches };
  });
  ok(legend.coarse ? legend.shown === false : true, `palette on touch: the keyboard legend is not drawn (coarse pointer ${legend.coarse}, shown ${legend.shown})`);
  await ctx.close();
}
{
  const { ctx, page } = await newPage(DESKTOP);
  await page.goto(`${BASE_URL}/articles`);
  await page.waitForTimeout(500);
  await page.keyboard.press("Control+k");
  await page.waitForSelector("dialog[open]");
  const legend = await page.evaluate(() => {
    const el = [...document.querySelectorAll("dialog [aria-hidden=true]")].find((e) => /move/.test(e.textContent ?? "") && /close/.test(e.textContent ?? ""));
    return el ? getComputedStyle(el).display : null;
  });
  ok(legend !== null && legend !== "none", `palette on a mouse and keyboard: the legend is there (${legend})`);
  await page.keyboard.type("a");
  await page.waitForFunction(() => document.querySelectorAll("[role=option]").length > 0);
  const shown = await page.locator("[role=option]").count();
  const status = (await page.locator("dialog [role=status]").innerText()).trim();
  const total = await page.evaluate(async () => (await (await fetch("/search-index.json")).json()).length);
  ok(shown <= 24 && (shown < 24 ? /^\d+ results?$/.test(status) : /^(Showing 24 of \d+|24 results)$/.test(status)), `palette: the count is honest (${shown} rows of an index of ${total}: "${status}")`);
  await ctx.close();
}

// 10e. Forced colours: the header's backdrop is a solid canvas-colour band and the hero's plate a solid block (gradients are dropped there).
for (const path of ["/", "/software"]) {
  const ctx = await browser.newContext({ ...DESKTOP, forcedColors: "active", colorScheme: "light" });
  const page = await ctx.newPage();
  await page.goto(`${BASE_URL}${path}`);
  await page.waitForTimeout(1200);
  if (path === "/") {
    const plate = await page.evaluate(() => { const c = getComputedStyle(document.querySelector("[data-slot=landing-hero]"), "::before"); return { image: c.backgroundImage, color: c.backgroundColor, mask: c.maskImage }; });
    ok(plate.image === "none" && /rgb\(255, 255, 255\)/.test(plate.color), `forced colours: the hero's plate is solid Canvas (${plate.color}, image ${plate.image})`);
    await page.screenshot({ path: `${OUT_DIR}/forced-home.png` });
  } else {
    // the shell's header carries the fade: collapse the home hero's way, a list has the scrim; check the shell's `.nav-fade` on a place page
    await page.goto(`${BASE_URL}/locations/lisbon`);
    await page.waitForSelector(".nav-fade", { state: "attached", timeout: 10000 });
    const fade = await page.evaluate(() => { const c = getComputedStyle(document.querySelector(".nav-fade")); return { image: c.backgroundImage, color: c.backgroundColor, mask: c.maskImage, h: c.height }; });
    ok(fade.image === "none" && fade.mask === "none" && /rgb\(255, 255, 255\)/.test(fade.color) && parseFloat(fade.h) === 56, `forced colours: the header's backdrop is a solid Canvas band (${JSON.stringify(fade)})`);
    await page.screenshot({ path: `${OUT_DIR}/forced-place.png` });
  }
  await ctx.close();
}

// 10f. An artwork's cover keeps its own proportions (never cropped to 1.91:1), at most 80 % of the window tall; a banner kind is cropped.
{
  const { ctx, page } = await newPage(DESKTOP);
  await page.goto(`${BASE_URL}/artworks/demo-artwork`);
  await waitPanel(page);
  await page.waitForSelector("[data-slot=entry-cover] img", { timeout: 10000 });
  await page.waitForTimeout(500);
  const art = await page.evaluate(() => { const i = document.querySelector("[data-slot=entry-cover] img"); const r = i.getBoundingClientRect(); const cs = getComputedStyle(i); return { fit: cs.objectFit, maxH: cs.maxHeight, w: r.width, h: r.height, natural: i.naturalWidth / i.naturalHeight, attr: i.width / i.height || null, vh: innerHeight }; });
  ok(art.fit === "contain" && art.h <= art.vh * 0.8 + 1, `artwork cover: object-fit contain, at most 80 % of the window (${art.fit}, ${Math.round(art.h)} of ${art.vh})`);
  ok(Math.abs(art.w / art.h - art.natural) / art.natural < 0.02 || art.h >= art.vh * 0.8 - 1, `artwork cover: drawn in its own proportions (${(art.w / art.h).toFixed(2)} for ${art.natural.toFixed(2)})`);
  await page.goto(`${BASE_URL}/articles/demo-article`);
  await waitPanel(page);
  await page.waitForSelector("[data-slot=entry-cover] img");
  const banner = await page.evaluate(() => { const i = document.querySelector("[data-slot=entry-cover] img"); const r = i.getBoundingClientRect(); return { fit: getComputedStyle(i).objectFit, ratio: r.width / r.height }; });
  ok(banner.fit === "cover" && Math.abs(banner.ratio - 1.91) < 0.03, `article cover: still the 1.91:1 banner (${banner.fit}, ${banner.ratio.toFixed(2)})`);
  await ctx.close();
}

// 11. The artwork wall, the poems' grid and the scroll rows of the lists (docs/design-system.md, "Artwork wall", "Poetry list", "Scroll row").
{
  // 11a. The wall: 1 column on a phone, 2 at 768, 3 at 1280, 4 at 1920; no two pictures overlap; the order of the tab stops is the DOM order;
  // every picture is drawn in its contract proportions (within 3 %); a sensitive one is blurred; no overflow.
  for (const [width, columns] of [[390, 1], [768, 2], [1280, 3], [1920, 4]]) {
    const touch = width < 768;
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: touch, isMobile: touch, colorScheme: "light" });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/artworks`);
    await page.waitForSelector("[data-slot=artwork-wall] .wall-item");
    await page.waitForTimeout(600);
    const wall = await page.evaluate(() => {
      const items = [...document.querySelectorAll(".wall-item")].map((li) => {
        const r = li.getBoundingClientRect();
        const m = li.querySelector(".wall-media").getBoundingClientRect();
        return { l: Math.round(r.left), t: r.top + scrollY, r: r.right, b: r.bottom + scrollY, w: m.width, h: m.height, ratio: parseFloat(li.style.getPropertyValue("--ratio")) };
      });
      const list = document.querySelector(".wall-list").getBoundingClientRect();
      return { items, listBottom: list.bottom + scrollY, cols: new Set(items.map((i) => i.l)).size, overflow: document.documentElement.scrollWidth - innerWidth };
    });
    const overlap = wall.items.some((a, i) => wall.items.some((b, j) => j > i && a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5));
    ok(wall.cols === Math.min(columns, wall.items.length), `${width}px /artworks: ${columns} column(s) (${wall.cols})`);
    ok(!overlap, `${width}px /artworks: no two pictures overlap`);
    ok(wall.items.every((i) => Math.abs(i.h / i.w - i.ratio) / i.ratio < 0.03), `${width}px /artworks: every picture keeps its contract proportions`);
    ok(wall.items.every((i) => i.b <= wall.listBottom + 1), `${width}px /artworks: the wall's reserved height holds every picture`);
    ok(wall.overflow <= 0, `${width}px /artworks: no horizontal overflow (${wall.overflow})`);
    const gaps = await page.evaluate(() => { const it = [...document.querySelectorAll(".wall-item")].map((li) => li.getBoundingClientRect()); const xs = [...new Set(it.map((r) => Math.round(r.left)))].sort((a, b) => a - b); return xs.length > 1 ? Math.round(it.find((r) => Math.round(r.left) === xs[1]).left - it.find((r) => Math.round(r.left) === xs[0]).right) : null; });
    ok(gaps === null || (gaps >= 8 && gaps <= 12), `${width}px /artworks: the column gap is 8 to 12 px (${gaps})`);
    const order = [];
    for (let i = 0; i < wall.items.length + 20; i++) { await page.keyboard.press("Tab"); const id = await page.evaluate(() => document.activeElement?.closest(".wall-card")?.id); if (id) order.push(id); }
    const dom = await page.evaluate(() => [...document.querySelectorAll(".wall-card")].map((a) => a.id));
    ok(order.length === dom.length && order.every((id, i) => id === dom[i]), `${width}px /artworks: the tab stops follow the DOM (reading) order (${order.length} of ${dom.length})`);
    const hover = await page.evaluate(() => matchMedia("(hover: hover) and (pointer: fine)").matches);
    const cap = await page.evaluate(() => { const c = document.querySelector(".wall-caption"); const cs = getComputedStyle(c); return { opacity: cs.opacity, position: cs.position, h: c.getBoundingClientRect().height }; });
    ok(hover ? cap.opacity === "0" || cap.opacity === "1" : cap.opacity === "1" && cap.h > 40, `${width}px /artworks: the caption is ${hover ? "an overlay (shown on hover and focus)" : "always visible under the picture"}`);
    ok((await page.locator("[data-slot=sensitive-media][data-state=hidden]").count()) === 1, `${width}px /artworks: the sensitive artwork stays blurred`);
    if (hover) {
      // The plate is PAINTED over the picture (the picture's box is positioned: a static plate would sit under it): a pixel inside the plate is the page's colour.
      const link = page.locator(".wall-card a").first();
      await link.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" }));
      const box = await link.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(150);
      const spot = await page.evaluate(() => { const r = document.querySelector(".wall-card .wall-caption").getBoundingClientRect(); return { x: Math.round(r.left + 4), y: Math.round(r.top + r.height / 2), bg: getComputedStyle(document.querySelector(".wall-card .wall-caption")).backgroundColor }; });
      const png = await page.screenshot({ clip: { x: spot.x, y: spot.y, width: 1, height: 1 }, type: "png" });
      const px = await page.evaluate(async (b64) => { const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode(); const c = document.createElement("canvas"); c.width = c.height = 1; const g = c.getContext("2d"); g.drawImage(img, 0, 0); return [...g.getImageData(0, 0, 1, 1).data].slice(0, 3); }, png.toString("base64"));
      const want = spot.bg.match(/\d+/g).slice(0, 3).map(Number);
      ok(px.every((v, i) => Math.abs(v - want[i]) <= 2), `${width}px /artworks: on hover the caption plate is painted over the picture in its solid page colour (${px} vs ${want})`);
      await page.mouse.move(0, 0);
    }
    await ctx.close();
  }
  // 11b. Poems: wider page, two columns from 44 rem; the summary is 20 px or more in the reading face.
  for (const [width, columns] of [[390, 1], [768, 1], [1280, 2], [1920, 2], [2560, 2]]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/poetry`);
    await page.waitForSelector(".poem-grid");
    const poems = await page.evaluate(() => {
      const grid = getComputedStyle(document.querySelector(".poem-grid"));
      const sum = getComputedStyle(document.querySelector(".poem-summary"));
      return { cols: grid.gridTemplateColumns.split(" ").length, size: parseFloat(sum.fontSize), font: sum.fontFamily, overflow: document.documentElement.scrollWidth - innerWidth, main: document.querySelector("main").getBoundingClientRect().width };
    });
    ok(poems.cols === columns, `${width}px /poetry: ${columns} column(s) (${poems.cols})`);
    ok(poems.size >= 20 && /Newsreader|serif/i.test(poems.font), `${width}px /poetry: the summary is the reading serif at ${poems.size.toFixed(1)} px`);
    ok(poems.overflow <= 0, `${width}px /poetry: no horizontal overflow`);
    await ctx.close();
  }
  // 11c. Scroll rows: no native scrollbar on a phone; the right arrow at the start, both in the middle, the left at the end; 44 px; named.
  {
    const ctx = await browser.newContext({ ...MOBILE });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/software`);
    await page.waitForSelector("[data-slot=scroll-row-arrow]", { timeout: 10000 });
    const state = () => page.evaluate(() => { const v = document.querySelector("[data-slot=scroll-row-viewport]"); return { sl: v.scrollLeft, overflowing: v.scrollWidth > v.clientWidth, sbw: getComputedStyle(v).scrollbarWidth, bar: v.offsetHeight - v.clientHeight, arrows: [...document.querySelectorAll("[data-slot=scroll-row-arrow]")].map((a) => ({ label: a.getAttribute("aria-label"), w: a.getBoundingClientRect().width, h: a.getBoundingClientRect().height, bg: getComputedStyle(a).backgroundColor, tab: a.tabIndex })) }; });
    let st = await state();
    ok(st.overflowing && st.sbw === "none" && st.bar === 0, `scroll row: overflows with no native scrollbar (${st.sbw}, ${st.bar})`);
    ok(st.sl === 0 && st.arrows.length === 1 && st.arrows[0].label === "Scroll tags right", `scroll row: only the right arrow at the start (${st.arrows.map((a) => a.label)})`);
    ok(st.arrows.every((a) => a.w >= 44 && a.h >= 44 && /^rgb\(/.test(a.bg)), "scroll row: 44 px arrows on a solid plate");
    ok(st.arrows.every((a) => a.tab === -1), "scroll row: the arrows are not tab stops (the row's links are)");
    await page.getByRole("button", { name: "Scroll tags right" }).tap();
    await page.waitForFunction(() => document.querySelector("[data-slot=scroll-row-viewport]").scrollLeft > 100);
    st = await state();
    ok(st.arrows.length === 2, `scroll row: both arrows in the middle (${st.arrows.map((a) => a.label)})`);
    for (let i = 0; i < 8 && (await page.getByRole("button", { name: "Scroll tags right" }).count()); i++) { await page.getByRole("button", { name: "Scroll tags right" }).tap(); await page.waitForTimeout(500); }
    st = await state();
    ok(st.arrows.length === 1 && st.arrows[0].label === "Scroll tags left", `scroll row: only the left arrow at the end (${st.arrows.map((a) => a.label)})`);
    await page.getByRole("button", { name: "Scroll tags left" }).tap();
    await page.waitForTimeout(600);
    ok((await state()).sl < st.sl, "scroll row: the left arrow scrolls back");
    await ctx.close();
    // reduced motion: the press scrolls at once
    const rm = await browser.newContext({ ...MOBILE, reducedMotion: "reduce" });
    const rp = await rm.newPage();
    await rp.goto(`${BASE_URL}/software`);
    await rp.waitForSelector("[data-slot=scroll-row-arrow]");
    await rp.getByRole("button", { name: "Scroll tags right" }).tap();
    ok((await rp.evaluate(() => document.querySelector("[data-slot=scroll-row-viewport]").scrollLeft)) > 100, "scroll row: reduced motion scrolls at once");
    await rm.close();
    // desktop: the row wraps, no arrows
    const dk = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const dp = await dk.newPage();
    await dp.goto(`${BASE_URL}/software`);
    await dp.waitForTimeout(800);
    ok((await dp.locator("[data-slot=scroll-row-arrow]").count()) === 0, "scroll row: no arrows when the row wraps (desktop)");
    await dk.close();
  }
}

await browser.close();
console.log(failures.length ? `\n${failures.length} FAILED` : "\nall checks passed");
process.exit(failures.length ? 1 : 0);
