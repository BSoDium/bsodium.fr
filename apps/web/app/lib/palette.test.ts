import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio, parseColor } from "./contrast";
import { COVER_PALETTES } from "./cover-art";
import { deltaE2000, hexToOklch, mixHex, PALETTE_NAMES, PALETTE_STEPS, simulateCvd, type Cvd, type PaletteName } from "./palette";

/**
 * The four palettes (docs/design-tokens.md, "Palettes"): BSoD blue, rainforest green, desert ocre, violet. The scale is read from app.css
 * the way the other token tests read it. Contrast pairs are in `contrast-audit.test.ts`; this file checks the scale itself (one lightness
 * ladder, the blue anchor, solid tints) and the colour-vision-deficiency separation of the four 600 steps.
 */
const css = readFileSync(new URL("../app.css", import.meta.url), "utf8");
const root = css.slice(css.indexOf(":root {"), css.indexOf("@media (min-width: 768px)"));
const dark = css.slice(css.indexOf("@media (prefers-color-scheme: dark)"), css.indexOf("@theme inline"));
const token = (src: string, name: string) => new RegExp(`^\\s*${name}:\\s*(.+);$`, "m").exec(src)?.[1]?.trim();
const scale = (n: PaletteName, s: number) => token(root, `--palette-${n}-${s}`)!;

/** The ladder: OKLCH lightness of each step (the anchor's own 600 is .563). */
const LADDER = { 50: 0.975, 100: 0.95, 200: 0.905, 300: 0.84, 400: 0.755, 500: 0.656, 600: 0.563, 700: 0.51, 800: 0.43, 900: 0.35 } as const;

describe("the scale", () => {
  it("has ten steps in each of the four hues, as plain hex", () => {
    for (const n of PALETTE_NAMES) for (const s of PALETTE_STEPS) expect(scale(n, s), `--palette-${n}-${s}`).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("every hue sits on the same OKLCH lightness ladder (within 0.01; green's 600 is 0.015 lower so that white text on it is AA)", () => {
    for (const n of PALETTE_NAMES) {
      for (const s of PALETTE_STEPS) {
        const tolerance = n === "green" && s === 600 ? 0.02 : 0.01;
        expect(Math.abs(hexToOklch(scale(n, s)).L - LADDER[s]), `${n} ${s}`).toBeLessThanOrEqual(tolerance);
      }
    }
  });

  it("lightness falls monotonically from 50 to 900 in every hue", () => {
    for (const n of PALETTE_NAMES) {
      const ls = PALETTE_STEPS.map((s) => hexToOklch(scale(n, s)).L);
      for (let i = 1; i < ls.length; i++) expect(ls[i]!, `${n} ${PALETTE_STEPS[i]}`).toBeLessThan(ls[i - 1]!);
    }
  });

  it("each hue keeps its own hue angle along the ladder (chromatic steps within 12 degrees)", () => {
    const anchor = { blue: 252, green: 150, ocre: 78, violet: 312 } as const;
    for (const n of PALETTE_NAMES) {
      for (const s of PALETTE_STEPS) {
        if (s <= 100) continue; // the lightest steps are nearly grey: their hue is quantised by 8-bit channels
        const { H } = hexToOklch(scale(n, s));
        const d = Math.abs(((H - anchor[n] + 540) % 360) - 180);
        expect(d, `${n} ${s} hue ${H.toFixed(0)}`).toBeLessThanOrEqual(12);
      }
    }
  });

  it("BSoD blue is the accent's own family: 600 is the primary fill, 500 and 700 its dark and light text tones", () => {
    expect(scale("blue", 600)).toBe(token(root, "--signal"));
    expect(scale("blue", 600)).toBe(token(root, "--primary"));
    expect(scale("blue", 700)).toBe(token(root, "--signal-text"));
    expect(scale("blue", 500)).toBe(token(dark, "--signal-text"));
    expect(token(root, "--palette-blue")).toBe("var(--palette-blue-600)");
  });
});

describe("the roles", () => {
  const solid = (src: string, name: string) => {
    const v = token(src, name);
    const m = v && /^var\((--[a-z0-9-]+)\)$/.exec(v);
    return parseColor(m ? token(root, m[1]!)! : v!);
  };

  it("a tint is a SOLID mix of the 600 fill with the page colour (10 % light, 16 % dark), never an alpha", () => {
    for (const n of PALETTE_NAMES) {
      const lightTint = token(root, `--palette-${n}-tint`)!;
      const darkTint = token(dark, `--palette-${n}-tint`)!;
      expect(lightTint).toBe(mixHex(scale(n, 600), token(root, "--background")!, 0.1));
      expect(darkTint).toBe(mixHex(scale(n, 600), token(dark, "--background")!, 0.16));
      expect(parseColor(lightTint)![3]).toBe(1);
      expect(parseColor(darkTint)![3]).toBe(1);
    }
  });

  it("the text tone is the 700 step in the light scheme and the 500 step in the dark one (not an inversion: the fill stays the 600)", () => {
    for (const n of PALETTE_NAMES) {
      expect(token(root, `--palette-${n}-text`)).toBe(`var(--palette-${n}-700)`);
      expect(token(dark, `--palette-${n}-text`)).toBe(`var(--palette-${n}-500)`);
      expect(solid(root, `--palette-${n}-text`)).toEqual(parseColor(scale(n, 700)));
    }
  });

  it("the white on-colour is AA on every 600 fill, and the near-black is AA on every step from 50 to 500", () => {
    const white = parseColor("#ffffff")!;
    const black = parseColor(token(root, "--palette-black")!)!;
    for (const n of PALETTE_NAMES) {
      expect(contrastRatio(white, parseColor(scale(n, 600))!), `${n} 600`).toBeGreaterThanOrEqual(4.5);
      for (const s of [50, 100, 200, 300, 400, 500] as const) expect(contrastRatio(black, parseColor(scale(n, s))!), `${n} ${s}`).toBeGreaterThanOrEqual(4.5);
      for (const s of [700, 800, 900] as const) expect(contrastRatio(white, parseColor(scale(n, s))!), `${n} ${s}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("colour-vision deficiency", () => {
  const fills = Object.fromEntries(PALETTE_NAMES.map((n) => [n, scale(n, 600)])) as Record<PaletteName, string>;
  const pairs = PALETTE_NAMES.flatMap((a, i) => PALETTE_NAMES.slice(i + 1).map((b) => [a, b] as const));
  const seen = (hex: string, kind: Cvd | null) => (kind ? simulateCvd(hex, kind) : hex);

  it("the four 600 fills are clearly different colours (CIEDE2000 of 15 or more) for normal vision", () => {
    for (const [a, b] of pairs) expect(deltaE2000(fills[a], fills[b]), `${a}/${b}`).toBeGreaterThanOrEqual(15);
  });

  it.each(["protanopia", "deuteranopia", "tritanopia"] as const)("under %s the four are still not identical (CIEDE2000 above 2.3, a just-noticeable difference; the weakest pair is reported in the docs)", (kind) => {
    for (const [a, b] of pairs) expect(deltaE2000(seen(fills[a], kind), seen(fills[b], kind)), `${a}/${b}`).toBeGreaterThan(2.3);
  });

  it("the pairing rule holds: the weak pairs under protanopia and deuteranopia (blue/violet, green/ocre) are 10 or more apart once two or more steps of lightness apart", () => {
    const at = (n: PaletteName, step: number) => scale(n, step as 600);
    for (const kind of ["protanopia", "deuteranopia"] as const) {
      // the 600/600 pairs are the reason for the rule
      expect(deltaE2000(simulateCvd(fills.blue, kind), simulateCvd(fills.violet, kind)), `blue/violet ${kind}`).toBeLessThan(10);
      expect(deltaE2000(simulateCvd(fills.green, kind), simulateCvd(fills.ocre, kind)), `green/ocre ${kind}`).toBeLessThan(15);
      // the rule: keep them apart on the ladder (700 against 300 or 400)
      expect(deltaE2000(simulateCvd(at("blue", 700), kind), simulateCvd(at("violet", 400), kind)), `blue 700 / violet 400 ${kind}`).toBeGreaterThanOrEqual(15);
      expect(deltaE2000(simulateCvd(at("green", 700), kind), simulateCvd(at("ocre", 300), kind)), `green 700 / ocre 300 ${kind}`).toBeGreaterThanOrEqual(15);
    }
  });

  it("the simulation leaves a grey grey", () => {
    for (const kind of ["protanopia", "deuteranopia", "tritanopia"] as const) {
      const [r, g, b] = parseColor(simulateCvd("#808080", kind))!;
      expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThanOrEqual(2);
    }
  });
});

describe("the cover art's palettes are the four", () => {
  it("names match", () => {
    expect([...COVER_PALETTES]).toEqual([...PALETTE_NAMES]);
  });
});
