// The drop cap, measured in a browser (docs/design-system.md, "Entry pages", "Drop cap"; `.drop-cap` in app.css): it must span exactly N
// lines of the body: its cap-height top on the cap-height line of the first line, its baseline on the baseline of line N, nothing under it
// (line N + 1 starts where the letter's box ends), a right gap of about a tenth of the letter's em. The letter's ink is measured from the
// pixels, the lines from the DOM (a Range over each character: the line's baseline is its box top plus the face's ascent).
//
//   CHROME_PATH=/path/to/chrome BASE_URL=http://localhost:5464 OUT_DIR=/some/dir node scripts/entries/dropcap.mjs
//
// Real entries are opened by path (DROPCAP_PATHS, comma-separated; the defaults are the DEMO content's, so run it against `pnpm dev:demo`
// or give it paths of the content that is being served). `VARIANTS` re-types the opening of the first paragraph in the page, to
// try letters that no entry opens with (J, T, W, L, an accented capital); the markup, the class and the CSS are the entry's own.
// Exit code 1 on a failed assertion. Screenshots go to OUT_DIR.
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:5464";
const OUT_DIR = process.env.OUT_DIR ?? ".";
const PATHS = (process.env.DROPCAP_PATHS ?? "/articles/demo-article,/articles/rain-at-the-citadel-gate,/articles/morocco-coast-bus,/projects/weather-ledger,/projects/label-collision-engine,/projects/timetable-diff").split(",");
const WIDTHS = [390, 768, 1440];
const VARIANTS = [
  ["J", "Jamais je n'avais pris un train de nuit quatre fois en une semaine, et pourtant la nuit suivante je montais encore dans le dernier wagon du quai neuf."],
  ["T", "The ticket said eleven hours, and the bus took thirteen, which is the kind of arithmetic a coast road does to a timetable in the end of a long day."],
  ["W", "Weather Ledger began as a way to keep track of the rain, and it turned into a small archive of the days that did not go as the forecast had said."],
  ["L", "Les lignes du soir commencent toujours par une gare, un quai trop long et un horaire que personne n'a vraiment lu avant de partir ce matin-là, sous la pluie."],
  ["É", "Écrit dans le train de nuit, ce texte garde le rythme des rails et la lumière jaune des gares où personne ne descend jamais vraiment à l'heure."],
  ["A", "A localised, background-hosted digital curtain for a personal account: it links as a companion device, runs messages from chosen contacts through a classifier."],
];

const failures = [];
const ok = (cond, message) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${message}`);
  if (!cond) failures.push(message);
};

mkdirSync(OUT_DIR, { recursive: true });
const executablePath = process.env.CHROME_PATH;
if (!executablePath) throw new Error("Set CHROME_PATH to a Chrome/Chromium executable");
const browser = await chromium.launch({ executablePath, headless: true });

/** Runs in the page: the lines of the first paragraph (by character boxes) and the letter's box. */
function measureInPage() {
  const p = document.querySelector("p.drop-cap");
  if (!p) return null;
  const text = p.firstChild;
  const data = text.data;
  const style = getComputedStyle(p);
  const body = parseFloat(style.fontSize);
  const lineHeight = parseFloat(style.lineHeight);
  const letterStyle = getComputedStyle(p, "::first-letter");
  const s = parseFloat(letterStyle.fontSize);
  // The font's ascent as the layout rounds it (a canvas reports the same rounded value).
  const ascentOf = (font) => {
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.font = font;
    return ctx.measureText("H").fontBoundingBoxAscent;
  };
  const chars = [];
  const r = document.createRange();
  for (let i = 0; i < data.length; i++) {
    if (/\s/.test(data[i])) continue;
    r.setStart(text, i);
    r.setEnd(text, i + 1);
    const b = r.getBoundingClientRect();
    chars.push({ i, c: data[i], top: b.top, bottom: b.bottom, left: b.left, right: b.right });
  }
  // The letter is the characters whose box is the letter's (the float's line box is the tall one).
  const letterChars = chars.filter((c) => Math.abs(c.bottom - c.top - s) < 2 || c.bottom - c.top > body * 1.6);
  const letterEnd = letterChars.length ? letterChars[letterChars.length - 1].i : 0;
  const rest = chars.filter((c) => c.i > letterEnd);
  const lines = [];
  for (const c of rest) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.top - c.top) < 2) {
      last.right = Math.max(last.right, c.right);
    } else lines.push({ top: c.top, bottom: c.bottom, left: c.left, right: c.right, first: c.c });
  }
  const bodyAscent = ascentOf(`${style.fontWeight} ${body}px "Newsreader Variable"`);
  const first = letterChars[0];
  const pr = p.getBoundingClientRect();
  return {
    body,
    lineHeight,
    letterSize: s,
    letterText: data.slice(0, letterEnd + 1),
    letterBox: first ? { top: first.top, bottom: letterChars[letterChars.length - 1].bottom, left: first.left, right: letterChars[letterChars.length - 1].right } : null,
    lines: lines.map((l) => ({ ...l, baseline: l.top + bodyAscent })),
    bodyAscent,
    paragraph: { top: pr.top, left: pr.left, bottom: pr.bottom, width: pr.width },
    float: letterStyle.float,
    lineHeightLetter: letterStyle.lineHeight,
  };
}

/** Runs in the page, with a PNG data URL: the ink rows and columns of the letter inside `box` (dark on the paper, or light on night). */
async function inkBox({ dataUrl, box, scale }) {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const x0 = Math.max(0, Math.floor(box.left * scale)), x1 = Math.min(img.width, Math.ceil(box.right * scale));
  const y0 = Math.max(0, Math.floor(box.top * scale)), y1 = Math.min(img.height, Math.ceil(box.bottom * scale));
  const d = ctx.getImageData(x0, y0, x1 - x0, y1 - y0);
  // Background = the top-left pixel of the page region; ink = a pixel far from it.
  const bg = [d.data[0], d.data[1], d.data[2]];
  let top = Infinity, bottom = -Infinity, left = Infinity, right = -Infinity;
  for (let y = 0; y < d.height; y++)
    for (let x = 0; x < d.width; x++) {
      const k = (y * d.width + x) * 4;
      const diff = Math.abs(d.data[k] - bg[0]) + Math.abs(d.data[k + 1] - bg[1]) + Math.abs(d.data[k + 2] - bg[2]);
      if (diff > 240) {
        top = Math.min(top, y); bottom = Math.max(bottom, y); left = Math.min(left, x); right = Math.max(right, x);
      }
    }
  return { top: (y0 + top) / scale, bottom: (y0 + bottom + 1) / scale, left: (x0 + left) / scale, right: (x0 + right + 1) / scale };
}

async function run(label, page, width) {
  // The paragraph is brought to the middle of the viewport (a screenshot clip is in viewport coordinates; the entry may scroll in a panel).
  await page.evaluate(() => document.querySelector("p.drop-cap").scrollIntoView({ block: "center", behavior: "instant" }));
  await page.waitForTimeout(150);
  const m = await page.evaluate(measureInPage);
  if (!m || !m.letterBox) return ok(false, `${label} @${width}: a .drop-cap paragraph with a measurable letter`);
  const n = m.letterSize / m.body > 4 ? 3 : 2;
  const accent = /^[ÀÂÉÈÊËÎÏÔÙÛ]/.test(m.letterText);
  const lines = m.lines;
  // Screenshot at 4x, clipped around the paragraph's top; the letter's ink from the pixels.
  const clip = { x: Math.max(0, m.paragraph.left - 8), y: Math.max(0, m.letterBox.top - 60), width: Math.min(width, m.paragraph.width + 16), height: m.lineHeight * (n + 3) + 80 };
  const scale = 4;
  const shot = await page.screenshot({ clip, type: "png" });
  writeFileSync(`${OUT_DIR}/dropcap-${label.replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_|_$/g, "")}-${width}.png`, shot);
  const dataUrl = `data:image/png;base64,${shot.toString("base64")}`;
  // The letter's own box (its content area) and a little above it, for a mark over a capital; down to the end of the N lines it spans (the line under it is not in it).
  const box = { left: m.letterBox.left - clip.x - 1, right: m.letterBox.right - clip.x + 3, top: m.letterBox.top - clip.y - (accent ? 0.3 : 0.04) * m.letterSize, bottom: Math.min(m.letterBox.bottom, m.paragraph.top + n * m.lineHeight) - clip.y };
  const ink = await page.evaluate(inkBox, { dataUrl, box, scale });
  const abs = (v, axis) => v + (axis === "y" ? clip.y : clip.x);
  const inkTop = abs(ink.top, "y"), inkBottom = abs(ink.bottom, "y"), inkRight = abs(ink.right, "x"), inkLeft = abs(ink.left, "x");
  const lineN = lines[n - 1], line1 = lines[0], lineAfter = lines[n];
  const capLine1 = line1.baseline - 0.672 * m.body; // the body's cap height line, from the font's metrics (Newsreader 400, opsz 18 to 21)
  const rows = {
    n,
    letter: m.letterText,
    letterSize: +m.letterSize.toFixed(1),
    capTopDelta: +(inkTop - capLine1).toFixed(2),
    baselineDelta: +(inkBottom - lineN.baseline).toFixed(2),
    gapRight: +(line1.left - inkRight).toFixed(1),
    gapRightEm: +((line1.left - inkRight) / m.letterSize).toFixed(3),
    // The pitch between line N and line N + 1 is the line height: nothing opens between them under the letter.
    pitch: lineAfter ? +(lineAfter.top - lineN.top - m.lineHeight).toFixed(2) : null,
  };
  console.log(`      ${label} @${width}`, JSON.stringify(rows));
  // Round capitals overshoot the baseline by ~1% of their size (O, C, G, S, U, J): the ink may sit that far under it.
  const overshoot = 0.012 * m.letterSize;
  // Capitals with a flat top (H, L, J, W, A, R) land on the cap height; round ones and a few with a raised serif (C, G, O, T, E) rise a little
  // above it by design (up to 4.5 % of the letter's size in this face), as every round letter overshoots.
  if (accent) ok(inkTop >= m.paragraph.top - 0.5, `${label} @${width}: the mark over the capital stays inside the paragraph (${(inkTop - m.paragraph.top).toFixed(1)} px under its top)`);
  else ok(rows.capTopDelta <= 1.6 && rows.capTopDelta >= -1.6 - (/[CGOSTEU]/.test(m.letterText[0]) ? 0.045 * m.letterSize : 0), `${label} @${width}: the cap top is on the first line's cap height (${rows.capTopDelta} px)`);
  if (!accent) ok(rows.baselineDelta >= -1.2 && rows.baselineDelta <= 1.2 + 1.3 * overshoot + (/[LEJ]/.test(m.letterText[0]) ? 0.04 * m.letterSize : 0), `${label} @${width}: the baseline is on line ${n}'s baseline (${rows.baselineDelta} px)`);
  ok(rows.pitch !== null && Math.abs(rows.pitch) <= 1, `${label} @${width}: line ${n + 1} follows line ${n} at the line height, no air under the letter (${rows.pitch} px off)`);
  ok(rows.gapRightEm >= 0.04 && rows.gapRightEm <= 0.2, `${label} @${width}: the ink's right gap is about a tenth of an em (${rows.gapRightEm} em)`);
  // Lines 1..n sit right of the letter, line n + 1 is flush left (under the letter).
  ok(lines.slice(0, n).every((l) => l.left >= inkRight - 1) && lineAfter && Math.abs(lineAfter.left - m.paragraph.left) < 2, `${label} @${width}: ${n} lines beside the letter, the next one flush left`);
}

for (const width of WIDTHS) {
  // 4x, so that the ink is measured to a quarter of a pixel.
  const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 4, colorScheme: "light" });
  const page = await context.newPage();
  for (const path of PATHS) {
    await page.goto(`${BASE_URL}${path}?view=full`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForSelector("p.drop-cap");
    await page.waitForTimeout(300);
    await run(path, page, width);
  }
  // Letters that no entry opens with: the first paragraph's text is re-typed in the page.
  await page.goto(`${BASE_URL}${PATHS[0]}?view=full`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  for (const [name, text] of VARIANTS) {
    await page.evaluate((t) => {
      const p = document.querySelector("p.drop-cap");
      p.firstChild.data = `${t} ${t}`.slice(0, 520);
      for (const n of [...p.childNodes].slice(1)) n.remove();
      p.dataset.dropCap = /^[ÀÉÈÊÎÔ]/.test(t) ? "accent" : "plain";
    }, text);
    await page.waitForTimeout(120);
    await run(`variant ${name}`, page, width);
  }
  await context.close();
  // The night scheme: the same boxes (only the colours change), one shot.
  const dark = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, colorScheme: "dark" });
  const dpage = await dark.newPage();
  await dpage.goto(`${BASE_URL}${PATHS[0]}?view=full`, { waitUntil: "networkidle" });
  await dpage.evaluate(() => document.fonts.ready);
  await dpage.waitForSelector("p.drop-cap");
  await dpage.evaluate(() => document.querySelector("p.drop-cap").scrollIntoView({ block: "center", behavior: "instant" }));
  await dpage.waitForTimeout(150);
  const b = await dpage.evaluate(() => { const r = document.querySelector("p.drop-cap").getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
  await dpage.screenshot({ path: `${OUT_DIR}/dropcap-dark-${width}.png`, clip: { x: Math.max(0, b.x - 8), y: b.y - 40, width: Math.min(width, b.width + 16), height: b.height + 60 } });
  await dark.close();
}
await browser.close();
if (failures.length) {
  console.log(`\n${failures.length} failure(s)`);
  process.exit(1);
}
console.log("\nall drop cap checks passed");
