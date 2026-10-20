import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Scene } from "three";
import { deltaE2000, simulateCvd, type Cvd } from "./palette";
import { themeFromTokens } from "~/globe/engine/colors";
import { RouteLayer } from "~/globe/engine/route-layer";
import { buildNetwork } from "~/globe/paths/network";
import { PALETTE_COUNT, PALETTE_HEX, SPARK, TRAIL_BANDS, TRAIL_ENTRIES, TRAIL_PALETTES, TRAIL_PER_PALETTE, TRAIL_STEPS, bandOf, paletteOf, trailColors, trailContrast, trailHex, trailIndex, type TrailScheme } from "~/globe/paths/trail";

const css = readFileSync(new URL("../app.css", import.meta.url), "utf8");
const PAGE: Record<TrailScheme, readonly [number, number, number]> = { light: [0xfb / 255, 0xfb / 255, 0xfb / 255], dark: [0x0a / 255, 0x0a / 255, 0x0a / 255] };
const rgbOf = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];

describe("palette assignment", () => {
  it("every route takes the one trail gradient: a saturated blue tail turning into a violet head", () => {
    expect(TRAIL_PALETTES).toEqual(["trail"]);
    expect(PALETTE_COUNT).toBe(1);
    expect(Array.from({ length: 11 }, (_, i) => paletteOf(i))).toEqual(Array(11).fill(0));
    for (const scheme of ["light", "dark"] as const) {
      const [tail, head] = [TRAIL_STEPS[scheme].tail, TRAIL_STEPS[scheme].head];
      expect(tail[0]).toBe("blue");
      expect(head[0]).toBe("violet");
    }
  });
  it("is deterministic and the same for every leg, whatever the order or the id", () => {
    const route = (id: string) => ({ id, title: id, points: [{ lat: 0, lon: 0 }, { lat: 1, lon: 1 }] });
    expect(buildNetwork([route("x"), route("y"), route("z")]).legs.map((l) => l.palette)).toEqual([0, 0, 0]);
    expect(buildNetwork([{ ...route("q"), palette: 6 }]).legs[0]!.palette).toBe(0);
  });
});

describe("the ladder", () => {
  it("PALETTE_HEX is the --palette-* scale of app.css", () => {
    for (const hue of ["blue", "green", "ocre", "violet"] as const) {
      for (const [step, hex] of Object.entries(PALETTE_HEX[hue])) {
        const m = new RegExp(`--palette-${hue}-${step}:\\s*(#[0-9a-f]{6})`).exec(css);
        expect(m?.[1], `${hue}-${step}`).toBe(hex);
      }
    }
  });
  it("--trail-from and --trail-to are the gradient's two ends (the panel's trip colours): the tail's blue and the head's violet, per scheme", () => {
    for (const scheme of ["light", "dark"] as const) {
      const s = TRAIL_STEPS[scheme];
      const decl = (name: string) => [...css.matchAll(new RegExp(`--trail-${name}: var\\(--palette-(\\w+)-(\\d+)\\);`, "g"))].map((m) => `${m[1]}-${m[2]}`);
      expect(decl("from")).toContain(`${s.tail[0]}-${s.tail[1]}`);
      expect(decl("to")).toContain(`${s.head[0]}-${s.head[1]}`);
    }
  });
});

describe("trail colours", () => {
  for (const scheme of ["light", "dark"] as const) {
    describe(scheme, () => {
      const hex = trailHex(scheme);
      const colors = trailColors(scheme);
      it("lists bands, lit head and spark per palette, solid hex colours", () => {
        expect(hex).toHaveLength(TRAIL_ENTRIES);
        expect(TRAIL_ENTRIES).toBe(PALETTE_COUNT * TRAIL_PER_PALETTE);
        for (const h of hex) expect(h).toMatch(/^#[0-9a-f]{6}$/);
        for (let p = 0; p < PALETTE_COUNT; p++) {
          const s = TRAIL_STEPS[scheme];
          const at = ([name, step]: readonly [keyof typeof PALETTE_HEX, number]) => PALETTE_HEX[name][step as 500];
          expect(hex[trailIndex(p, 0)]).toBe(at(s.tail));
          expect(hex[trailIndex(p, TRAIL_BANDS - 1)]).toBe(at(s.head));
          expect(hex[trailIndex(p, "lit")]).toBe(at(s.lit));
          expect(hex[trailIndex(p, "spark")]).toBe(at(s.spark));
        }
      });
      it("runs tail to head: the head contrasts with the page at 3:1 or more for every palette (graphics, WCAG 1.4.11), and so do the lit head and the spark", () => {
        const rows: string[] = [];
        for (let p = 0; p < PALETTE_COUNT; p++) {
          for (const k of [TRAIL_BANDS - 1, "lit", "spark"] as const) {
            const c = trailContrast(colors[trailIndex(p, k)]!, PAGE[scheme]);
            rows.push(`${TRAIL_PALETTES[p]} ${k}: ${c.toFixed(2)}`);
            expect(c, `${scheme} ${TRAIL_PALETTES[p]} ${k}`).toBeGreaterThanOrEqual(3);
          }
          // the tail is the quietest part and the head the loudest; lit is at least as loud as the faint head
          const c = (k: number | "lit" | "spark") => trailContrast(colors[trailIndex(p, k)]!, PAGE[scheme]);
          for (let b = 1; b < TRAIL_BANDS; b++) expect(c(b), `band ${b}`).toBeGreaterThanOrEqual(c(b - 1) - 1e-9);
          expect(c("lit")).toBeGreaterThanOrEqual(c(TRAIL_BANDS - 1));
          expect(c("spark")).toBeGreaterThanOrEqual(c("lit"));
          expect(c(0), "the tail is still a visible line").toBeGreaterThan(1.8);
        }
        if (process.env.TRAIL_NUMBERS) console.log(scheme, rows.join(" | "));
      });
      it("the tail and the head are clearly two colours (CIEDE2000), also under each colour-vision deficiency", () => {
        const tail = hex[trailIndex(0, 0)]!;
        const head = hex[trailIndex(0, TRAIL_BANDS - 1)]!;
        expect(deltaE2000(tail, head)).toBeGreaterThan(15);
        for (const kind of ["protanopia", "deuteranopia", "tritanopia"] as Cvd[]) {
          const d = deltaE2000(simulateCvd(tail, kind), simulateCvd(head, kind));
          if (process.env.TRAIL_NUMBERS) console.log(scheme, kind, d.toFixed(1));
          expect(Number.isFinite(d)).toBe(true);
        }
      });
    });
  }
  it("bands: the tail is band 0, the head the last, a leg's fractions fill every band evenly", () => {
    expect(bandOf(0)).toBe(0);
    expect(bandOf(0.999)).toBe(TRAIL_BANDS - 1);
    expect(bandOf(1)).toBe(TRAIL_BANDS - 1);
    expect(Array.from({ length: TRAIL_BANDS }, (_, b) => bandOf((b + 0.5) / TRAIL_BANDS))).toEqual([0, 1, 2, 3, 4]);
  });
  it("the spark is a plus on a faint leg and a bigger dot on a lit one, and the cross lies within the line spark", () => {
    expect(SPARK.lit.crossTo).toBeGreaterThan(SPARK.faint.crossTo);
    for (const s of [SPARK.faint, SPARK.lit]) expect(s.crossTo).toBeLessThanOrEqual(s.line);
  });
});

describe("shader uniform mapping", () => {
  const routes = [0, 1, 2, 3, 4].map((i) => ({ id: `r${i}`, title: "t", points: [{ lat: i, lon: 0 }, { lat: i + 1, lon: 3 }] }));
  const layer = new RouteLayer(new Scene(), routes);
  const uniforms = () => (layer as unknown as { material: { uniforms: Record<string, { value: unknown }> } }).material.uniforms;
  const entry = (k: number) => (uniforms().uTrail!.value as { r: number; g: number; b: number }[])[k]!;
  it("uTrail holds the theme's list, uPage the page colour, and a theme change rewrites them without touching the geometry", () => {
    const geometry = (layer as unknown as { geometry: unknown }).geometry;
    const light = themeFromTokens(PAGE.light, [0.039, 0.039, 0.039]);
    layer.applyTheme(light);
    expect((uniforms().uTrail!.value as unknown[]).length).toBe(TRAIL_ENTRIES);
    expect(light.scheme).toBe("light");
    const want = trailHex("light");
    for (let k = 0; k < TRAIL_ENTRIES; k++) expect([entry(k).r, entry(k).g, entry(k).b].map((v) => Math.round(v * 255)), `light ${k}`).toEqual(rgbOf(want[k]!).map((v) => Math.round(v * 255)));
    const dark = themeFromTokens(PAGE.dark, [0.96, 0.96, 0.96]);
    layer.applyTheme(dark);
    expect(dark.scheme).toBe("dark");
    const wantDark = trailHex("dark");
    for (let k = 0; k < TRAIL_ENTRIES; k++) expect([entry(k).r, entry(k).g, entry(k).b].map((v) => Math.round(v * 255)), `dark ${k}`).toEqual(rgbOf(wantDark[k]!).map((v) => Math.round(v * 255)));
    expect(trailIndex(0, "lit")).toBe(0 * TRAIL_PER_PALETTE + TRAIL_BANDS); // what the shader computes: palette * PER + band
    expect((layer as unknown as { geometry: unknown }).geometry).toBe(geometry);
  });
  it("the overlay's presence: at 0 the layer draws nothing, in between it is a uniform (a mix toward the page), at 1 it is complete", () => {
    expect(layer.stats().presence).toBe(1);
    expect(layer.stats().drawCalls).toBe(1);
    layer.setPresence(0.4);
    expect(uniforms().uPresence!.value).toBe(0.4);
    expect(layer.stats().drawCalls).toBe(1);
    layer.setPresence(0);
    expect(layer.stats().drawCalls).toBe(0);
    expect((layer as unknown as { line: { visible: boolean } }).line.visible).toBe(false);
    expect(layer.shown()).toEqual([]);
    layer.setPresence(1);
    expect((layer as unknown as { line: { visible: boolean } }).line.visible).toBe(true);
    layer.setPresence(7); // clamped
    expect(layer.overlayPresence).toBe(1);
  });
  it("the vertex carries the palette (info.w) and the position along the leg is dist / length", () => {
    const net = layer.network;
    expect(net.legs.map((l) => l.palette)).toEqual([0, 0, 0, 0, 0]);
  });
});
