import { describe, expect, it } from "vitest";
import { cameraDistance, DEG, fitZoom, focalPx, silhouetteRadiusPx, silhouetteZoom } from "./geo";
import { GlyphBuffer, isMirrored, placeGlyphs, ringAlpha, ringFloorZoom, ringHalfExtents, ringPhase, ringRepeats, ringText, ringTone } from "./ring";
import { activeLevels, roleLevel } from "./palette";
import { RING } from "./tuning";
import { RING_PHRASES } from "../ring-text";

const sinE = Math.sin(RING.elevationDeg * DEG);
const cosE = Math.cos(RING.elevationDeg * DEG);

describe("silhouette zoom", () => {
  it("is the inverse of the silhouette radius, and `fitZoom` is built on it", () => {
    for (const h of [600, 900, 1200]) {
      for (const r of [80, 200, 396]) {
        expect(silhouetteRadiusPx(silhouetteZoom(r, h), h)).toBeCloseTo(r, 6);
      }
    }
    expect(fitZoom(1440, 900, 0.12)).toBeCloseTo(silhouetteZoom(450 * 0.88, 900), 12);
  });
});

describe("the ring's text", () => {
  it("is the phrases in capitals, a middle dot between them and one more to close the loop", () => {
    expect(ringText(["a b", "c"])).toBe("A B · C · ");
    expect(ringText([])).toBe("");
    expect(ringText(["  ", ""])).toBe("");
  });

  it("is the site identity, nothing else", () => {
    const line = ringText(RING_PHRASES);
    expect(line).toBe(
      "ELLIOT NÉGREL-JERZY · FRONT-END ENGINEER · DATA VISUALISATION · CARTOGRAPHY · DESIGN SYSTEMS · PARIS · ",
    );
    expect(line).toBe(line.toLocaleUpperCase("en"));
  });

  it("goes round a whole number of times, landing the glyphs nearest the target size", () => {
    const len = ringText(RING_PHRASES).length;
    const f = 1350;
    for (const d of [2.2, 3.0, 3.6, 5, 9]) {
      const n = ringRepeats(len, f, d);
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(1);
      // The em it gives is what placeGlyphs reports, and no other count is nearer the target in ratio.
      const g = new GlyphBuffer();
      placeGlyphs(g, { text: "A".repeat(len), repeats: n, phase: 0, f, d, cx: 0, cy: 0 });
      const off = (k: number) => {
        const h = new GlyphBuffer();
        placeGlyphs(h, { text: "A".repeat(len), repeats: k, phase: 0, f, d, cx: 0, cy: 0 });
        return Math.abs(Math.log(h.em / RING.type.targetEmPx));
      };
      for (const k of [Math.max(1, n - 1), n + 1]) expect(off(n)).toBeLessThanOrEqual(off(k) + 1e-9);
    }
    expect(ringRepeats(0, 1350, 3)).toBe(1);
  });
});

describe("placement of the glyphs on the projected ellipse", () => {
  const text = "ABC DEF · ";
  const f = 1350;
  const base = { text, repeats: 3, phase: 0.3, f, d: 3.5, cx: 700, cy: 450 };

  it("puts every glyph exactly where the globe's own perspective puts the point of the ring", () => {
    const g = new GlyphBuffer();
    const n = placeGlyphs(g, base);
    const M = text.length * 3;
    const step = (2 * Math.PI) / M;
    // The non-space characters of 3 repeats, each at angle phase + k * step.
    let seen = 0;
    for (let k = 0; k < M; k++) {
      if (text.charCodeAt(k % text.length) === 32) continue;
      const t = base.phase + k * step;
      const X = RING.radiusRatio * Math.cos(t);
      const Y = RING.radiusRatio * Math.sin(t) * sinE;
      const Z = -RING.radiusRatio * Math.sin(t) * cosE;
      const sx = base.cx + (f * X) / (base.d - Z);
      const sy = base.cy - (f * Y) / (base.d - Z);
      // Find it by code and position (edge-on glyphs may be culled: none are at this elevation for the flat lettering).
      const i = [...Array(n).keys()].find((j) => Math.abs(g.x[j]! - sx) < 1e-3 && Math.abs(g.y[j]! - sy) < 1e-3);
      expect(i, `glyph ${k}`).toBeDefined();
      expect(g.code[i!]).toBe(text.charCodeAt(k % text.length));
      expect(g.front[i!]).toBe(Z >= 0 ? 1 : 0);
      seen++;
    }
    expect(n).toBe(seen);
  });

  it("lies on an ellipse of semi-axes rho*s and rho*s*sin(e) in the orthographic limit (a far camera)", () => {
    const g = new GlyphBuffer();
    const S = 400; // px per earth radius at any depth
    const d = 1e7;
    placeGlyphs(g, { ...base, d, f: S * d, cx: 0, cy: 0 });
    const a = RING.radiusRatio * S;
    const b = a * sinE;
    for (let i = 0; i < g.count; i++) {
      const v = (g.x[i]! / a) ** 2 + (g.y[i]! / b) ** 2;
      expect(v).toBeCloseTo(1, 3);
    }
  });

  it("spaces the glyphs by equal angles and closes the loop", () => {
    const g = new GlyphBuffer();
    const S = 400;
    const d = 1e7;
    // No spaces: every index is a glyph, in angle order.
    placeGlyphs(g, { text: "ABCDEFGH", repeats: 2, phase: 0, f: S * d, d, cx: 0, cy: 0 });
    expect(g.count).toBe(16);
    const a = RING.radiusRatio * S;
    const ang = (i: number) => Math.atan2(-g.y[i]! / (a * sinE), g.x[i]! / a); // the screen's y is down
    for (let i = 0; i < 16; i++) {
      const next = (i + 1) % 16;
      let da = ang(next) - ang(i);
      if (da < 0) da += 2 * Math.PI;
      expect(da).toBeCloseTo((2 * Math.PI) / 16, 6);
    }
  });

  it("reads left to right on the near arc, which is the lower one, and is larger there than on the far arc", () => {
    const g = new GlyphBuffer();
    placeGlyphs(g, { ...base, text: "ABCDEFGHIJKLMNOP", repeats: 1, phase: 0 });
    let nearX = 0;
    let nearY = 0;
    let n = 0;
    for (let i = 0; i < g.count; i++) {
      if (!g.front[i]) continue;
      nearY += g.y[i]!;
      nearX += g.x[i]!;
      n++;
    }
    expect(n).toBeGreaterThan(4);
    expect(nearY / n).toBeGreaterThan(base.cy); // the near arc is below the centre of the planet (seen from above)
    // Consecutive near glyphs: x grows with the character index, and the glyph is upright (a > 0, d > 0, no mirroring).
    const near = [...Array(g.count).keys()].filter((i) => g.front[i] === 1).sort((p, q) => g.code[p]! - g.code[q]!);
    const mid = near.slice(Math.floor(near.length / 4), Math.ceil((3 * near.length) / 4));
    for (let i = 1; i < mid.length; i++) expect(g.x[mid[i]!]!).toBeGreaterThan(g.x[mid[i - 1]!]!);
    for (const i of near) expect(isMirrored(g.a[i]!, g.b[i]!, g.c[i]!, g.d[i]!)).toBe(false);
    // Perspective: the scale of a near glyph is larger than a far one's.
    const scale = (i: number) => Math.hypot(g.a[i]!, g.b[i]!);
    const nearScale = Math.max(...near.map(scale));
    const far = [...Array(g.count).keys()].filter((i) => g.front[i] === 0);
    expect(far.length).toBeGreaterThan(0);
    expect(nearScale).toBeGreaterThan(Math.max(...far.map(scale)));
  });

  it("turns with the phase: a quarter of a step later glyph k is a quarter of a step further round", () => {
    const g0 = new GlyphBuffer();
    const g1 = new GlyphBuffer();
    const M = 40;
    const S = 400;
    const d = 1e7;
    const text = "A".repeat(M);
    const step = (2 * Math.PI) / M;
    placeGlyphs(g0, { text, repeats: 1, phase: 0, f: S * d, d, cx: 0, cy: 0 });
    placeGlyphs(g1, { text, repeats: 1, phase: step, f: S * d, d, cx: 0, cy: 0 });
    // A whole step later, glyph k sits where glyph k + 1 was.
    for (let k = 0; k < M - 1; k++) {
      expect(g1.x[k]).toBeCloseTo(g0.x[k + 1]!, 1);
      expect(g1.y[k]).toBeCloseTo(g0.y[k + 1]!, 1);
    }
  });

  it("gives the nominal em from the ring's own size: the same in earth radii at every zoom, so the type scales with the ring", () => {
    const g = new GlyphBuffer();
    const h = 900;
    const f = focalPx(h);
    placeGlyphs(g, { ...base, f, d: cameraDistance(2.2, h) });
    const emWorld = (g.em * cameraDistance(2.2, h)) / f;
    placeGlyphs(g, { ...base, f, d: cameraDistance(3.0, h) });
    expect((g.em * cameraDistance(3.0, h)) / f).toBeCloseTo(emWorld, 9);
    // 3 repeats of the line: the advance is rho * 2pi / 27 and a glyph's em is that over (0.6 + tracking).
    expect(emWorld).toBeCloseTo((RING.radiusRatio * 2 * Math.PI) / (3 * text.length) / (RING.type.advanceEm + RING.type.tracking), 9);
  });

  it("allocates nothing once the buffer is big enough", () => {
    const g = new GlyphBuffer();
    placeGlyphs(g, base);
    const xs = g.x;
    placeGlyphs(g, { ...base, phase: 1 });
    expect(g.x).toBe(xs);
  });
});

describe("the ring's clock", () => {
  it("moves against the near arc's reading direction at RING.degPerSec, gentler than the globe's rotation", () => {
    const p = (ms: number) => ringPhase(ms);
    expect((p(1000) - p(0)) / DEG).toBeCloseTo(RING.direction * RING.degPerSec, 9);
    expect(RING.degPerSec).toBeLessThan(4); // SPIN.degPerSec
  });
});

describe("the lowest zoom", () => {
  const cases = [
    { w: 1440, h: 900 },
    { w: 720, h: 900 }, // the panel open
    { w: 390, h: 844 },
    { w: 844, h: 390 },
    { w: 1920, h: 1080 },
  ];

  it("is below the fit by at least `floorBelowFit` levels and keeps the whole ring and the planet in the free area, with the margin", () => {
    for (const { w, h } of cases) {
      const fit = fitZoom(w, h, 0.12);
      const floor = ringFloorZoom({ fit, freeWidth: w, height: h });
      expect(floor).toBeLessThanOrEqual(fit - RING.zoom.floorBelowFit + 1e-9);
      const d = cameraDistance(floor, h);
      const e = ringHalfExtents(focalPx(h), d);
      const pad = RING.type.targetEmPx * 1.6;
      expect(e.hx + pad).toBeLessThanOrEqual((w / 2) * (1 - RING.zoom.fitMargin) + 1e-6);
      expect(e.hy + pad).toBeLessThanOrEqual((h / 2) * (1 - RING.zoom.fitMargin) + 1e-6);
      // And it is the highest such zoom unless the floor is the plain levels-below-the-fit rule.
      if (floor < fit - RING.zoom.floorBelowFit - 1e-6) {
        const e2 = ringHalfExtents(focalPx(h), cameraDistance(floor + 0.01, h));
        expect(e2.hx + pad > (w / 2) * (1 - RING.zoom.fitMargin) || e2.hy + pad > (h / 2) * (1 - RING.zoom.fitMargin)).toBe(true);
      }
    }
  });

  it("is a small change on a desktop and a larger one on a narrow screen", () => {
    const d = (w: number, h: number) => fitZoom(w, h, 0.12) - ringFloorZoom({ fit: fitZoom(w, h, 0.12), freeWidth: w, height: h });
    expect(d(1440, 900)).toBeLessThan(1);
    expect(d(390, 844)).toBeGreaterThan(d(1440, 900));
  });
});

describe("the fade", () => {
  const fit = 2.7;
  const floor = 2.0;

  it("is gone at the fit and above, full at the floor and below, and monotonic in between", () => {
    expect(ringAlpha(fit, fit, floor)).toBe(0);
    expect(ringAlpha(fit + 3, fit, floor)).toBe(0);
    expect(ringAlpha(floor, fit, floor)).toBe(1);
    expect(ringAlpha(floor - 1, fit, floor)).toBe(1);
    let last = 0;
    for (let z = fit; z >= floor; z -= 0.01) {
      const a = ringAlpha(z, fit, floor);
      expect(a).toBeGreaterThanOrEqual(last - 1e-12);
      last = a;
    }
  });

  it("is already zero before the camera is back at the fit, and full before it is at the floor", () => {
    const t = (z: number) => (fit - z) / (fit - floor);
    expect(ringAlpha(fit - RING.zoom.fade.from * (fit - floor), fit, floor)).toBeCloseTo(0, 12);
    expect(ringAlpha(fit - RING.zoom.fade.to * (fit - floor), fit, floor)).toBeCloseTo(1, 12);
    expect(t(floor)).toBe(1);
  });

  it("is off when there is no room below the fit (no ring: the floor is the fit)", () => {
    expect(ringAlpha(2.5, 2.5, 2.5)).toBe(0);
    expect(ringAlpha(2.0, 2.5, 2.5)).toBe(0);
  });

  it("is a staircase of palette tones, the near arc the louder, never above the role's level", () => {
    const levels = activeLevels();
    const front = [0, 0.1, 0.4, 0.7, 1].map((a) => ringTone(a, levels, "front"));
    expect(front[0]).toBe(0);
    expect(front[front.length - 1]).toBe(roleLevel(RING.tones.front, levels));
    for (let i = 1; i < front.length; i++) expect(front[i]).toBeGreaterThanOrEqual(front[i - 1]!);
    expect(ringTone(1, levels, "back")).toBeLessThanOrEqual(ringTone(1, levels, "front"));
    expect(ringTone(0, levels, "back")).toBe(0);
  });
});
