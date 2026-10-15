import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio, over, parseColor, type Rgba } from "./contrast";

/**
 * The contrast audit of the tokens (docs/design-tokens.md, "Contrast audit"): every foreground / background pair the interface draws,
 * in both schemes and in each of the contexts that rebind the tokens (the page, the reading surface of an entry and the lists, an inverted
 * frame, paper). 4.5:1 for text under 24 px (WCAG 2 AA), 3:1 for large text, for an icon that is a control's whole label, for a focus ring
 * and for the edge of a control. The same pairs, measured on the rendered pages with their real backgrounds (scrims, plates, the globe),
 * are `scripts/contrast/audit.mjs`. Tokens are read from app.css the way `design-system.test.ts` reads them.
 */
const css = readFileSync(new URL("../app.css", import.meta.url), "utf8");

function declarations(block: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of block.matchAll(/^\s*(--[a-z0-9-]+):\s*(.+);$/gm)) out.set(m[1]!, m[2]!.trim());
  return out;
}

function ruleBody(source: string, from: number): string {
  const open = source.indexOf("{", from);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}" && --depth === 0) return source.slice(open + 1, i);
  }
  throw new Error("unbalanced css");
}

const rootLight = declarations(ruleBody(css, css.indexOf(":root {")));
const rootDark = declarations(ruleBody(css, css.indexOf("@media (prefers-color-scheme: dark)")).replace(/^\s*:root\s*\{/, ""));
/** The reading surface's rebinding (an unlayered rule after the tokens): `--background: var(--paper)` and so on. */
const reading = declarations(ruleBody(css, css.indexOf('[data-panel]:has([data-surface="reading"])')));
/** An inverted frame's rebinding (`.ds-frame[data-variant="inverted"]`). */
const inverted = declarations(ruleBody(css, css.indexOf('.ds-frame[data-variant="inverted"] {')));
const printRoot = declarations(ruleBody(css, css.indexOf(":root {", css.indexOf("@media print {"))));

type Scheme = "light" | "dark";
const ROOT = { light: rootLight, dark: rootDark } as const;

/** A context's token table: the scheme's own tokens with a rebinding rule applied on top (`var(--x)` read from the scheme's tokens). */
function context(scheme: Scheme, rebinding: Map<string, string> | null): Map<string, string> {
  const base = new Map(ROOT[scheme]);
  // dark rule only lists what changes: the rest is the root rule's
  if (scheme === "dark") for (const [k, v] of rootLight) if (!base.has(k)) base.set(k, v);
  if (!rebinding) return base;
  const out = new Map(base);
  for (const [k, v] of rebinding) {
    if (!k.startsWith("--") || !/^--(background|foreground|muted-foreground|subtle-foreground|accent|accent-foreground|border|border-strong|ring|signal|signal-text|surface|primary|primary-foreground)$/.test(k)) continue;
    out.set(k, v);
  }
  return out;
}

/** A token's colour in a context: `var()` followed, `color-mix(in srgb, A n%, B | transparent)` computed, over `under` when translucent. */
function colour(tokens: Map<string, string>, name: string, under?: Rgba): Rgba {
  const resolve = (raw: string, depth = 0): Rgba => {
    if (depth > 6) throw new Error(`cycle at ${name}`);
    const v = raw.trim();
    const ref = /^var\((--[a-z0-9-]+)\)$/.exec(v);
    if (ref) {
      const next = tokens.get(ref[1]!);
      if (next === undefined) throw new Error(`${ref[1]} is not defined (from ${name})`);
      return resolve(next, depth + 1);
    }
    const mix = /^color-mix\(in srgb,\s*(.+?)\s+(\d+(?:\.\d+)?)%,\s*(.+)\)$/.exec(v);
    if (mix) {
      const p = Number(mix[2]) / 100;
      const a = resolve(mix[1]!, depth + 1);
      const bRaw = mix[3]!.trim();
      if (bRaw === "transparent") return [a[0], a[1], a[2], a[3] * p];
      const b = resolve(bRaw, depth + 1);
      return [a[0] * p + b[0] * (1 - p), a[1] * p + b[1] * (1 - p), a[2] * p + b[2] * (1 - p), 1];
    }
    const c = parseColor(v);
    if (!c) throw new Error(`${name} is not a colour: ${raw}`);
    return c;
  };
  const raw = tokens.get(name);
  if (raw === undefined) throw new Error(`${name} is not defined`);
  const c = resolve(raw);
  return c[3] < 1 && under ? over(c, under) : c;
}

interface Pair {
  use: string;
  fg: string;
  bg: string | string[];
  min: number;
}

const TEXT = 4.5;
const BODY = 7;
const LARGE = 3;

/** The page (and the map's own chrome, the panel, the home page): the neutral tokens. */
const PAGE: Pair[] = [
  { use: "body text", fg: "--foreground", bg: ["--background", "--surface", "--accent"], min: BODY },
  { use: "secondary text and mono metadata", fg: "--muted-foreground", bg: ["--background", "--surface", "--accent"], min: TEXT },
  { use: "the map credits line, and the info icon of its phone button, a 3:1 mark held to the same 4.5:1 (page and surface only)", fg: "--subtle-foreground", bg: ["--background", "--surface"], min: TEXT },
  { use: "a link in running text, a hovered tag, a hovered nav item, a key hint on hover", fg: "--signal-text", bg: ["--background", "--surface", "--accent"], min: TEXT },
  { use: "a link button's label (variant link)", fg: "--signal-text", bg: ["--background", "--surface"], min: TEXT },
  { use: "primary button label on its fill, at rest, hovered and pressed", fg: "--primary-foreground", bg: ["--primary", "--signal-hover", "--signal-active"], min: TEXT },
  { use: "signal fill label (status tag, pressed toggle, selection)", fg: "--signal-foreground", bg: ["--signal", "--signal-hover", "--signal-active"], min: TEXT },
  { use: "large display text and marks in the accent (24 px and up, an underline, a tick)", fg: "--signal", bg: ["--background", "--surface"], min: LARGE },
  { use: "the primary fill and its hover are a visible shape against the page", fg: "--primary", bg: ["--background", "--surface"], min: LARGE },
  { use: "the hovered and pressed primary fills against the page (a state keeps the control's shape)", fg: "--signal-hover", bg: ["--background", "--surface"], min: LARGE },
  { use: "the pressed primary fill against the page", fg: "--signal-active", bg: ["--background", "--surface"], min: LARGE },
  { use: "the focus ring, against what it is drawn on", fg: "--ring", bg: ["--background", "--surface", "--accent"], min: LARGE },
  { use: "the edge of an outlined control", fg: "--border-strong", bg: ["--background"], min: LARGE },
  { use: "a secondary or ghost button label, rest and hover (the hover grey)", fg: "--foreground", bg: ["--background", "--accent"], min: BODY },
  { use: "a disabled control's label (exempt from WCAG, kept AA)", fg: "--muted-foreground", bg: ["--background"], min: TEXT },
  { use: "a solid status tag", fg: "--background", bg: ["--foreground"], min: BODY },
  { use: "the selected map label's name", fg: "--background", bg: ["--foreground"], min: BODY },
];

describe.each(["light", "dark"] as const)("contrast audit of the tokens (%s)", (scheme) => {
  const check = (tokens: Map<string, string>, pairs: Pair[], where: string) => {
    for (const pair of pairs) {
      for (const bgName of Array.isArray(pair.bg) ? pair.bg : [pair.bg]) {
        const bg = colour(tokens, bgName);
        const fg = colour(tokens, pair.fg, bg);
        const ratio = contrastRatio(fg, bg);
        expect(ratio, `${scheme} ${where}: ${pair.use} (${pair.fg} on ${bgName}) is ${ratio.toFixed(2)}:1, needs ${pair.min}`).toBeGreaterThanOrEqual(pair.min);
      }
    }
  };

  it("the page's pairs", () => {
    check(context(scheme, null), PAGE, "page");
  });

  it("the reading surface's pairs (an entry, a list): the paper tokens bound to the page tokens", () => {
    const tokens = context(scheme, reading);
    check(tokens, PAGE, "reading surface");
  });

  it("the copyright notice (an entry's last line) is the muted tone, a solid token on the page, AA in the reading surface and printed in ink", () => {
    const rule = ruleBody(css, css.indexOf("  .entry-copyright {"));
    expect(rule).toMatch(/color:\s*var\(--muted-foreground\);/);
    // tones are solid colours: no opacity, no translucent mix on the notice
    expect(rule).not.toMatch(/opacity|rgb\(|rgba\(|color-mix|transparent/);
    expect(rule).toMatch(/font-size:\s*0\.75rem/);
    const tokens = context(scheme, reading);
    const page = colour(tokens, "--background");
    const ratio = contrastRatio(colour(tokens, "--muted-foreground", page), page);
    expect(ratio, `${scheme}: the notice is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(TEXT);
    // print: ink on white, pinned by an explicit rule (the notice is not hidden by the print block's `hidden` rules)
    const print = ruleBody(css, css.indexOf('[data-slot="entry-copyright"] {', css.indexOf("@media print {")));
    expect(print).toMatch(/color:\s*#000/);
    expect(print).toMatch(/display:\s*block/);
    const white = parseColor("#fff")!;
    expect(contrastRatio(parseColor("#000")!, white)).toBeGreaterThanOrEqual(BODY);
  });

  it("an inverted frame's pairs: its own page, ink, muted text, accent text, ring and fill", () => {
    const tokens = context(scheme, inverted);
    // (a link in an inverted frame has no hover fill: the accent's text is not drawn on the hover grey there)
    check(
      tokens,
      PAGE.filter((p) => !/disabled|map credits|solid status|selected map label|outlined control/.test(p.use)).map((p) =>
        p.fg === "--signal-text" && Array.isArray(p.bg) ? { ...p, bg: p.bg.filter((b) => b !== "--accent") } : p,
      ),
      "inverted frame",
    );
    // the inverse set itself, outside the rebinding
    const own = context(scheme, null);
    const frame = colour(own, "--inverse-background");
    expect(contrastRatio(colour(own, "--inverse-foreground"), frame)).toBeGreaterThanOrEqual(BODY);
    expect(contrastRatio(colour(own, "--inverse-muted"), frame)).toBeGreaterThanOrEqual(TEXT);
    expect(contrastRatio(colour(own, "--inverse-signal-text"), frame)).toBeGreaterThanOrEqual(TEXT);
    expect(contrastRatio(colour(own, "--inverse-signal"), frame)).toBeGreaterThanOrEqual(LARGE);
  });

  it("the signal wash (the active frame's plate) keeps text AA", () => {
    const tokens = context(scheme, null);
    const surface = colour(tokens, "--surface");
    const plate = over(colour(tokens, "--signal-wash"), surface);
    expect(contrastRatio(colour(tokens, "--foreground"), plate)).toBeGreaterThanOrEqual(BODY);
    expect(contrastRatio(colour(tokens, "--muted-foreground"), plate)).toBeGreaterThanOrEqual(TEXT);
    expect(contrastRatio(colour(tokens, "--signal-text"), plate)).toBeGreaterThanOrEqual(TEXT);
  });

  it("the selected map label's second line (the page colour mixed 28 % toward the ink) is AA on the ink plate", () => {
    const tokens = context(scheme, null);
    const bg = colour(tokens, "--foreground");
    const sub = parseMix(colour(tokens, "--background"), bg, 0.72);
    expect(contrastRatio(sub, bg)).toBeGreaterThanOrEqual(TEXT);
  });
});

function parseMix(a: Rgba, b: Rgba, share: number): Rgba {
  return [a[0] * share + b[0] * (1 - share), a[1] * share + b[1] * (1 - share), a[2] * share + b[2] * (1 - share), 1];
}

describe("neutral palette (owner, 2026-10-14: black and white, no cream)", () => {
  /** Warmth: how far red is above blue (a cream or a sepia has red well above blue; a cool near-black has blue above red). */
  const warmth = (c: Rgba) => c[0] - c[2];
  const chroma = (c: Rgba) => Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]);

  describe.each(["light", "dark"] as const)("%s", (scheme) => {
    const tokens = context(scheme, null);
    const NEUTRAL = ["--background", "--foreground", "--muted-foreground", "--subtle-foreground", "--surface", "--accent", "--paper", "--paper-foreground", "--paper-muted", "--paper-hover", "--inverse-background", "--inverse-foreground", "--inverse-muted"];

    it.each(NEUTRAL)("%s is a grey: no warm cast and no more than a breath of cool", (name) => {
      const c = colour(tokens, name);
      expect(warmth(c), `${scheme} ${name} is warm`).toBeLessThanOrEqual(0);
      expect(chroma(c), `${scheme} ${name} has colour`).toBeLessThanOrEqual(4);
    });

    it("the reading surface is the page's own colour (nothing to tell the globe's page from an entry's)", () => {
      expect(colour(tokens, "--paper")).toEqual(colour(tokens, "--background"));
      expect(colour(tokens, "--paper-foreground")).toEqual(colour(tokens, "--foreground"));
    });
  });

  it("the page is near-white in the light scheme and near-black in the dark one", () => {
    const light = colour(context("light", null), "--background");
    const dark = colour(context("dark", null), "--background");
    expect(Math.min(...light.slice(0, 3))).toBeGreaterThanOrEqual(245);
    expect(Math.max(...dark.slice(0, 3))).toBeLessThanOrEqual(16);
  });
});

describe("print", () => {
  it("is ink on white for every pair, whatever the scheme", () => {
    const white = parseColor("#fff")!;
    for (const name of ["--foreground", "--muted-foreground", "--signal-text", "--paper-foreground", "--paper-muted", "--paper-signal-text"]) {
      const c = parseColor(printRoot.get(name)!);
      expect(c, name).not.toBeNull();
      expect(contrastRatio(c!, white), name).toBeGreaterThanOrEqual(BODY);
    }
    // the primary fill prints as black on white, never the blue (a button is not printed, but the skip link may be)
    expect(printRoot.get("--primary")).toBe("#000");
    expect(printRoot.get("--primary-foreground")).toBe("#fff");
  });
});

describe("rules that put the accent where the owner asked for it (2026-10-14)", () => {
  it("a button in the entry's marginalia keeps its own colours: the marginalia's link rule leaves `.ds-button` alone (the 'Open host' bar was muted text, 3.2:1, on the black fill)", () => {
    expect(css).toContain(".entry-margin a:not(.ds-button),");
    expect(css).not.toMatch(/\.entry-margin a,/);
    expect(css).not.toMatch(/\.entry-margin a:hover/);
  });

  it("the primary button is the accent's fill; its hover and pressed fills are the deeper steps, never the page colour mixed in (white text would lose contrast)", () => {
    const hover = ruleBody(css, css.indexOf('.ds-button[data-variant="primary"]:hover {'));
    expect(hover).toContain("var(--signal-hover)");
    expect(ruleBody(css, css.indexOf('.ds-button[data-variant="primary"]:active {'))).toContain("var(--signal-active)");
    expect(ruleBody(css, css.indexOf('.ds-button[data-variant="primary"] {'))).toContain("var(--primary-foreground)");
  });

  it("the header's items turn to the accent (an unlayered rule: a utility's `text-muted-foreground` is in a later layer than the component's own :hover), the current one is underlined in it", () => {
    expect(css).toMatch(/^\.nav-link:hover,\n\.nav-link:focus-visible,/m);
    expect(ruleBody(css, css.search(/^\.nav-link\[aria-current="page"\] \{/m))).toContain("text-decoration-color: var(--signal);");
  });

  it("the selection is the accent's fill with its white text", () => {
    const body = ruleBody(css, css.indexOf("  ::selection {"));
    expect(body).toContain("background: var(--signal);");
    expect(body).toContain("color: var(--signal-foreground);");
  });

  it("a link in running text is the accent's text tone, in the prose and in `.type-link`", () => {
    expect(ruleBody(css, css.indexOf("  .ds-prose p a,"))).toContain("color: var(--signal-text);");
    expect(ruleBody(css, css.indexOf("  .type-link {"))).toContain("color: var(--signal-text);");
  });

  it("a focus ring sits on a moat of the page colour, so it is measured against that and not against a picture or a map line under it", () => {
    const at = css.indexOf("  a:focus-visible,\n  button:focus-visible,");
    expect(at).toBeGreaterThan(css.indexOf("  :focus-visible {"));
    expect(ruleBody(css, at)).toContain("box-shadow: 0 0 0 5px var(--background);");
  });

  it("the hero's hovered row has a plate of the page colour (the accent's large text is 3:1 on a plate, not on a line of the map)", () => {
    expect(ruleBody(css, css.indexOf(".hero-row:hover,\n.hero-row:focus-visible {"))).toContain("background: color-mix(in srgb, var(--background) 90%, transparent);");
  });

  it("the nav scrim holds 92 % of the page colour or more where the header's text sits (the top third), so accent text stays AA over a dark picture", () => {
    const body = ruleBody(css, css.indexOf("  .nav-scrim {"));
    const stops = [...body.matchAll(/var\(--background\) (\d+)%, transparent\) (\d+)%/g)].map((m) => [Number(m[1]), Number(m[2])] as const);
    expect(stops.length).toBeGreaterThanOrEqual(12);
    for (const [alpha, at] of stops) if (at <= 32) expect(alpha, `stop at ${at}%`).toBeGreaterThanOrEqual(92);
  });

  it("the chosen filter and the active frame carry the accent's rule", () => {
    expect(ruleBody(css, css.indexOf('  .ds-filter[aria-current="true"] > span {'))).toContain("border-bottom-color: var(--signal);");
    expect(ruleBody(css, css.indexOf('  .ds-frame[data-variant="active"] {'))).toContain("border-color: var(--signal);");
  });
});
