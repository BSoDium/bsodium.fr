import { describe, expect, it } from "vitest";
import { DEG, FOV_DEG, cameraDistance, fitZoom, focalPx, silhouetteRadiusPx } from "./geo";
import { SPIN } from "./idle-spin";
import {
  GlyphSet,
  bandCentre,
  bandLoop,
  bandPhase,
  layoutBand,
  orbitZoomAlpha,
  placeBand,
  placeRing,
  ringBaselineRadius,
  ringFloorZoom,
  ringPhase,
  ringReach,
  type OrbitCam,
} from "./orbit";
import { ringLayout, ringText } from "./ring";
import { RING } from "./tuning";

const H = 900;
const ZOOM = 2.2;
const cam = (): OrbitCam => ({ d: cameraDistance(ZOOM, H), f: focalPx(H), cx: 720, cy: 404 });
const R = () => silhouetteRadiusPx(ZOOM, H);
const LINE = ringText(["Elliot Négrel-Jerzy", "Front-end and UX software engineer", "Data visualisation", "Paris"]);
/** Advance of a character of the display face in em: uniform enough for the layout's arithmetic. */
const ADV = (ch: string) => (ch === " " ? 0.3 : 0.62);

describe("the ring: 3D placement through the globe's own camera", () => {
  const layout = ringLayout(LINE.length, 280);
  const args = { text: LINE, repeats: layout.repeats, emR: layout.emPerR, phase: 0, cam: cam() };

  it("puts one glyph per letter of every turn, and nothing for the spaces", () => {
    const g = new GlyphSet();
    const n = placeRing(g, args);
    expect(n).toBe(LINE.replace(/ /g, "").length * layout.repeats);
  });

  it("lays the glyph at phase 0 on the NEAR side (in front of the planet's plane, below the centre) and the opposite one on the far side", () => {
    const g = new GlyphSet();
    placeRing(g, { ...args, text: "ABCDEFGH", repeats: 1 });
    expect(g.count).toBe(8);
    expect(g.back[0]).toBe(0);
    expect(g.y[0]!).toBeGreaterThan(args.cam.cy); // the near point is below the centre on the screen (the plane's top goes away)
    expect(g.back[4]).toBe(1); // half a turn on
    expect(g.y[4]!).toBeLessThan(args.cam.cy);
  });

  it("foreshortens with perspective: a near glyph is bigger on the screen than a far one, by about the depth ratio", () => {
    const g = new GlyphSet();
    placeRing(g, { ...args, text: "ABCDEFGH", repeats: 1 });
    const size = (i: number) => Math.hypot(g.a[i]!, g.b[i]!);
    expect(size(0)).toBeGreaterThan(size(4));
    const c = args.cam;
    const rho = ringBaselineRadius();
    const st = Math.sin(RING.tiltDeg * DEG);
    const expected = (c.d + rho * st) / (c.d - rho * st);
    expect(size(0) / size(4)).toBeGreaterThan(1);
    expect(size(0) / size(4)).toBeLessThan(expected * 1.1);
  });

  it("never mirrors a glyph: reading to the right everywhere, upside down on the far side", () => {
    const g = new GlyphSet();
    placeRing(g, args);
    let farUp = 0;
    for (let i = 0; i < g.count; i++) {
      const det = g.a[i]! * g.d[i]! - g.b[i]! * g.c[i]!;
      expect(det).toBeGreaterThan(0);
      if (g.back[i] === 1 && g.d[i]! < 0) farUp++;
    }
    // the far arc's glyphs are turned over (their down points up the screen)
    expect(farUp).toBeGreaterThan(g.count / 4);
  });

  it("scales with the planet: the glyphs' positions about the centre grow with the focal length at the same distance", () => {
    const g1 = new GlyphSet();
    const g2 = new GlyphSet();
    const c = args.cam;
    placeRing(g1, { ...args, cam: { ...c, cx: 0, cy: 0 } });
    placeRing(g2, { ...args, cam: { ...c, f: c.f * 2, cx: 0, cy: 0 } });
    for (let i = 0; i < g1.count; i += 7) {
      expect(g2.x[i]!).toBeCloseTo(2 * g1.x[i]!, 2);
      expect(g2.y[i]!).toBeCloseTo(2 * g1.y[i]!, 2);
    }
  });

  it("closes: the glyphs a whole turn apart in the line are in the same place, and the last one is one step before the first", () => {
    const g = new GlyphSet();
    placeRing(g, { ...args, text: "ABCDEFGH", repeats: 2 });
    expect(g.count).toBe(16);
    for (let i = 0; i < 8; i++) {
      expect(g.code[i]).toBe(g.code[i + 8]);
    }
    const step = (2 * Math.PI) / 16;
    const g2 = new GlyphSet();
    placeRing(g2, { ...args, text: "ABCDEFGH", repeats: 2, phase: step });
    // a whole step later glyph k stands where glyph k + 1 was
    for (let k = 0; k < 15; k++) {
      expect(g2.x[k]!).toBeCloseTo(g.x[k + 1]!, 2);
      expect(g2.y[k]!).toBeCloseTo(g.y[k + 1]!, 2);
    }
  });

  it("allocates nothing once the buffer is big enough", () => {
    const g = new GlyphSet();
    placeRing(g, args);
    const xs = g.x;
    placeRing(g, { ...args, phase: 1 });
    expect(g.x).toBe(xs);
  });
});

describe("the band: a caption wrapped on a shell above the surface", () => {
  const layout = layoutBand(["Drag to explore", "Pick a place"], ADV);
  const c = cam();

  it("has the phrases in capitals on the configured lines, one under the other, each line closing round the planet", () => {
    expect(layout.lines).toHaveLength(RING.band.lines);
    const text = (i: number) => String.fromCharCode(...layout.lines[i]!.code);
    expect(text(0)).toContain("DRAG TO EXPLORE");
    expect(text(1)).toContain("PICK A PLACE");
    for (const line of layout.lines) {
      const last = line.s[line.s.length - 1]!;
      const first = line.s[0]!;
      // the glyphs span less than the loop (a seam of air is left) and more than half of it for a caption this size
      expect(last - first).toBeLessThan(bandLoop(line.lambda));
      expect(last - first).toBeGreaterThan(0);
    }
    expect(layout.em).toBeLessThanOrEqual(RING.band.emR);
  });

  it("is centred on its phrase at the front, and reads to the right", () => {
    const g = new GlyphSet();
    placeBand(g, layout, 0, c);
    expect(g.count).toBeGreaterThan(20);
    // every drawn glyph faces the viewer (none behind the plane through the planet's centre), none is mirrored
    for (let i = 0; i < g.count; i++) expect(g.a[i]! * g.d[i]! - g.b[i]! * g.c[i]!).toBeGreaterThan(0);
    // the first line's glyphs advance to the right across the face
    const one = new GlyphSet();
    placeBand(one, { ...layout, lines: [layout.lines[0]!] }, 0, c);
    expect(one.count).toBeGreaterThan(10);
    for (let i = 1; i < one.count; i++) expect(one.x[i]!).toBeGreaterThan(one.x[i - 1]! - 1e-6);
  });

  it("stays on the planet's face: every glyph centre is within the silhouette (a little more for the shell's height)", () => {
    const g = new GlyphSet();
    placeBand(g, layout, 0.4, c);
    for (let i = 0; i < g.count; i++) expect(Math.hypot(g.x[i]! - c.cx, g.y[i]! - c.cy)).toBeLessThan(R() * 1.12);
  });

  it("slides on its own clock: the phase moves by RING.band.degPerSec, to the left, and not with the globe's idle rotation", () => {
    expect((bandPhase(1000) - bandPhase(0)) / DEG).toBeCloseTo(-RING.band.degPerSec, 9);
    const was = SPIN.degPerSec;
    try {
      SPIN.degPerSec = was * 20;
      expect((bandPhase(1000) - bandPhase(0)) / DEG).toBeCloseTo(-RING.band.degPerSec, 9);
    } finally {
      SPIN.degPerSec = was;
    }
  });

  it("shrinks the type instead of overlapping when the phrases are too long for the loop, and is empty without phrases", () => {
    const long = layoutBand(["a very long call to action that does not fit round a planet at this size at all", "and a second one"], ADV);
    expect(long.em).toBeLessThan(RING.band.emR);
    for (const line of long.lines) expect(line.s[line.s.length - 1]! - line.s[0]!).toBeLessThan(bandLoop(line.lambda));
    expect(layoutBand([], ADV).lines).toEqual([]);
    expect(layoutBand(["  ", ""], ADV).lines).toEqual([]);
  });

  it("has its lines centred on the band's own latitude", () => {
    const lambdas = layout.lines.map((l) => l.lambda);
    const mean = lambdas.reduce((s, v) => s + v, 0) / lambdas.length;
    expect(mean).toBeCloseTo(bandCentre(), 9);
    expect(lambdas[0]!).toBeGreaterThan(lambdas[1]!); // line 0 is the top one
  });
});

describe("the ring's clock", () => {
  it("runs at RING.degPerSec in RING.direction, on its own clock: the globe's idle rotation (SPIN) does not change it", () => {
    expect((ringPhase(1000) - ringPhase(0)) / DEG).toBeCloseTo(RING.direction * RING.degPerSec, 9);
    expect(RING.degPerSec).toBeGreaterThan(0);
    const was = SPIN.degPerSec;
    try {
      SPIN.degPerSec = was * 20;
      expect((ringPhase(1000) - ringPhase(0)) / DEG).toBeCloseTo(RING.direction * RING.degPerSec, 9);
    } finally {
      SPIN.degPerSec = was;
    }
  });
});

describe("the lowest zoom and the fade", () => {
  const cases = [
    { w: 1440, h: 900 },
    { w: 720, h: 900 }, // the panel open
    { w: 390, h: 844 },
    { w: 844, h: 390 },
    { w: 1920, h: 1080 },
  ];

  it("is at least `floorBelowFit` below the fit and keeps the planet and the whole ring in the free area, with the margin", () => {
    for (const { w, h } of cases) {
      const fit = fitZoom(w, h, 0.12);
      const floor = ringFloorZoom({ fit, freeWidth: w, height: h });
      expect(floor).toBeLessThanOrEqual(fit - RING.zoom.floorBelowFit + 1e-9);
      const r = silhouetteRadiusPx(floor, h);
      const reach = ringReach(r, h);
      expect(reach.x).toBeLessThanOrEqual((w / 2) * (1 - RING.zoom.fitMargin));
      expect(Math.max(reach.yUp, reach.yDown)).toBeLessThanOrEqual((h / 2) * (1 - RING.zoom.fitMargin));
      expect(r).toBeLessThanOrEqual((Math.min(w, h) / 2) * (1 - RING.zoom.fitMargin) + 1e-6);
    }
  });

  it("agrees with the projection: the reach is the farthest the baseline circle goes on the screen, from the planet's centre", () => {
    const r = 280;
    const reach = ringReach(r, H);
    const f = focalPx(H);
    const d = Math.sqrt((f / r) ** 2 + 1);
    const g = new GlyphSet();
    // an em of zero centres the glyph on the baseline: the glyph centres are the circle
    placeRing(g, { text: "A".repeat(64), repeats: 1, emR: 0, phase: 0, cam: { d, f, cx: 0, cy: 0 } });
    let x = 0;
    let up = 0;
    for (let i = 0; i < g.count; i++) {
      x = Math.max(x, Math.abs(g.x[i]!));
      up = Math.max(up, -g.y[i]!);
    }
    expect(reach.x).toBeGreaterThan(x * 0.97);
    expect(reach.x).toBeLessThan(x * 1.05 + 1);
    expect(reach.yUp).toBeGreaterThan(up * 0.97);
  });

  it("is gone at the fit and above, full at the floor and below, and monotonic in between", () => {
    const fit = 2.7;
    const floor = 2.0;
    expect(orbitZoomAlpha(fit, fit, floor)).toBe(0);
    expect(orbitZoomAlpha(fit + 3, fit, floor)).toBe(0);
    expect(orbitZoomAlpha(floor, fit, floor)).toBe(1);
    expect(orbitZoomAlpha(floor - 1, fit, floor)).toBe(1);
    let last = 0;
    for (let z = fit; z >= floor; z -= 0.01) {
      const a = orbitZoomAlpha(z, fit, floor);
      expect(a).toBeGreaterThanOrEqual(last - 1e-12);
      last = a;
    }
    // no room below the fit: no type
    expect(orbitZoomAlpha(2.0, 2.5, 2.5)).toBe(0);
  });

  it("uses the same field of view as the globe (the type is seen through the globe's own camera)", () => {
    expect(FOV_DEG).toBeCloseTo(36.87, 2);
  });
});
