import { describe, expect, it } from "vitest";
import {
  CAPTION_FACE,
  CaptionMotion,
  bandColumns,
  bandMesh,
  captionPixelFrom,
  easeInCubic,
  easeOutExpo,
  enteringAngle,
  entranceMs,
  entranceStart,
  faceTowardsViewer,
  layoutCaption,
  leavingAngle,
  lineHidden,
  parallelPoint,
  shellHorizon,
  snapLat,
  splitLine,
  topLatitude,
} from "./caption";
import { DEG, cameraDistance, lonLatToVec3, viewBasis } from "./geo";
import { GRATICULE_STEP_DEG } from "./geometry";
import { CAPTION } from "./tuning";

const TEXTS = ["A personal archive, organised around places.", "Software \u00b7 Articles \u00b7 Artworks \u00b7 Poetry", "Drag to explore. Pick a place."];
/** Widths in ems of the three lines (a serif at about half an em a letter). */
const measure = (t: string) => t.length * 0.5;
const DESKTOP = 330; // the planet's radius at the lowest zoom, CSS px, at 1440x900
const PHONE = 150; // and at 390x844
const layout = (rPx = DESKTOP, viewLat = 28) => layoutCaption({ texts: TEXTS, measure, rPx, viewLat });
const d = cameraDistance(2.2, 900);
/** The screen height (planet radii) of a point of the earth frame seen from a camera over `lat`, longitude 0: the point's component along the view's north. */
const screenY = (p: readonly number[], lat: number) => {
  const { north } = viewBasis({ lon: 0, lat, zoom: 1 }, 900);
  return p[0]! * north[0] + p[1]! * north[1] + p[2]! * north[2];
};

describe("real parallels", () => {
  it("is the shell: every point at `CAPTION.radius`, and a row of a band is a circle of one latitude about the earth's axis", () => {
    for (const line of layout().lines) {
      const m = bandMesh(line, 24, 1, CAPTION.depth);
      const cols = 25;
      for (let j = 0; j < 2; j++) {
        let y = NaN;
        for (let i = 0; i < cols; i++) {
          const k = (j * cols + i) * 3;
          expect(Math.hypot(m.positions[k]!, m.positions[k + 1]!, m.positions[k + 2]!)).toBeCloseTo(CAPTION.radius, 5);
          if (i === 0) y = m.positions[k + 1]!;
          expect(m.positions[k + 1]!).toBeCloseTo(y, 5); // the same height along the axis: the same parallel
        }
      }
    }
  });

  it("has every baseline on a graticule parallel or midway between two, the block above the view's latitude, the lines in order", () => {
    const l = layout().lines;
    expect(l).toHaveLength(3);
    for (const line of l) expect(Math.abs(line.baseLat % (GRATICULE_STEP_DEG / 2))).toBe(0);
    expect(l[0]!.baseLat).toBe(topLatitude(28));
    expect(l[0]!.baseLat).toBe(52.5);
    for (let i = 1; i < l.length; i++) expect(l[i]!.baseLat).toBeLessThan(l[i - 1]!.baseLat);
  });

  it("has the tilt and the curvature of the graticule's parallel at the view's latitude: from the north the ends rise, from the south they fall, at the equator it is straight", () => {
    const line = layout().lines[0]!;
    for (const view of [28, 55, 0, -28, -50]) {
      const mid = screenY(parallelPoint(0, line.baseLat, 1), view);
      const end = screenY(parallelPoint(line.halfSpan, line.baseLat, 1), view);
      // the graticule's dotted parallel at the same latitude, on the planet's surface, for the same two longitudes
      const gMid = screenY(lonLatToVec3(0, line.baseLat), view);
      const gEnd = screenY(lonLatToVec3(line.halfSpan / DEG, line.baseLat), view);
      expect(end - mid).toBeCloseTo(gEnd - gMid, 9); // the shell is the surface scaled: the same shape
      if (view > 1) expect(end).toBeGreaterThan(mid);
      else if (view < -1) expect(end).toBeLessThan(mid);
      else expect(end).toBeCloseTo(mid, 9);
    }
    // the line lies in the plane of its parallel: all its points are at one height along the earth's axis, whatever the camera
    const ys = [-1, -0.3, 0, 0.5, 1].map((u) => parallelPoint(u * line.halfSpan, line.baseLat, CAPTION.radius)[1]);
    for (const y of ys) expect(y).toBeCloseTo(CAPTION.radius * Math.sin(line.baseLat * DEG), 9);
  });

  it("follows the view's latitude in graticule steps, and stays inside the clamp", () => {
    expect(topLatitude(28)).toBe(52.5);
    expect(topLatitude(10)).toBe(37.5);
    expect(topLatitude(-10)).toBe(15);
    expect(topLatitude(80)).toBe(CAPTION.topLat.max);
    expect(topLatitude(-70)).toBe(CAPTION.topLat.min);
    expect(snapLat(37.4, 15)).toBe(30);
    expect(layout(DESKTOP, 5).lines[0]!.baseLat).toBe(30);
  });

  it("is centred on the central meridian: the strip is symmetric about longitude 0", () => {
    const line = layout().lines[0]!;
    const m = bandMesh(line, 20, 1, CAPTION.depth);
    const cols = 21;
    const first = [m.positions[0]!, m.positions[1]!, m.positions[2]!];
    const last = [m.positions[(cols - 1) * 3]!, m.positions[(cols - 1) * 3 + 1]!, m.positions[(cols - 1) * 3 + 2]!];
    expect(first[0]).toBeCloseTo(-last[0]!, 6);
    expect(first[1]).toBeCloseTo(last[1]!, 6);
    expect(first[2]).toBeCloseTo(last[2]!, 6);
  });

  it("is wound counter-clockwise seen from outside, on every slice: every triangle's normal points away from the planet (back faces are the far side's)", () => {
    const line = layout().lines[2]!;
    const m = bandMesh(line, 12, CAPTION.slices, CAPTION.depth);
    const P = (i: number) => [m.positions[3 * i]!, m.positions[3 * i + 1]!, m.positions[3 * i + 2]!] as const;
    for (let t = 0; t < m.indices.length; t += 3) {
      const a = P(m.indices[t]!);
      const b = P(m.indices[t + 1]!);
      const c = P(m.indices[t + 2]!);
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const n = [u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!];
      const centre = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
      expect(n[0]! * centre[0]! + n[1]! * centre[1]! + n[2]! * centre[2]!).toBeGreaterThan(0);
    }
  });

  it("reads left to right: texture u grows with the longitude (east), v is 1 at the top (the higher latitude)", () => {
    const line = layout().lines[0]!;
    const m = bandMesh(line, 10, 1, CAPTION.depth);
    expect(m.uvs[2]).toBeGreaterThan(m.uvs[0]!);
    expect(m.positions[3]).toBeGreaterThan(m.positions[0]!);
    const cols = 11;
    expect(m.uvs[2 * cols + 1]).toBe(1);
    expect(m.positions[3 * cols + 1]).toBeGreaterThan(m.positions[1]!);
  });

  it("is a stack: the front face at the shell, `depth` of slices behind it towards the planet, every slice with its layer", () => {
    const line = layout().lines[1]!;
    const slices = CAPTION.slices;
    const m = bandMesh(line, 8, slices, CAPTION.depth);
    const perSlice = 9 * 2;
    expect(m.layers).toHaveLength(slices * perSlice);
    expect(m.indices).toHaveLength(slices * 8 * 6);
    const radius = (n: number) => Math.hypot(m.positions[3 * n]!, m.positions[3 * n + 1]!, m.positions[3 * n + 2]!);
    expect(m.layers[0]).toBe(0);
    expect(radius(0)).toBeCloseTo(CAPTION.radius - CAPTION.depth, 5);
    const front = (slices - 1) * perSlice;
    expect(m.layers[front]).toBe(1);
    expect(radius(front)).toBeCloseTo(CAPTION.radius, 5);
    expect(CAPTION.depth).toBeGreaterThan(0);
    expect(CAPTION.radius - CAPTION.depth).toBeGreaterThan(1.02); // the back of the letters is still clear of the surface
    expect(bandColumns(line)).toBeGreaterThanOrEqual(8);
  });
});

describe("the layout: sizes, call to action, wrapping", () => {
  it("makes the call to action (the last line) the largest, and the others equal", () => {
    const l = layout().lines;
    expect(l[2]!.capR).toBeGreaterThan(l[0]!.capR);
    expect(l[2]!.capR).toBeGreaterThan(l[1]!.capR);
  });

  it("spans no more than `maxSpanDeg` of its parallel, shrinking a long line to it", () => {
    const wide = layoutCaption({ texts: ["x".repeat(50)], measure, rPx: DESKTOP, viewLat: 28 });
    expect(wide.lines[0]!.capR).toBeLessThan(CAPTION.capR[0]!);
    expect(2 * wide.lines[0]!.halfSpan).toBeLessThanOrEqual(CAPTION.maxSpanDeg * DEG + 1e-9);
  });

  it("keeps three lines on a desktop-sized planet, wrapped when there is not the room", () => {
    const l = layout(DESKTOP);
    expect(l.wrapped).toBe(false);
    expect(l.stepDeg).toBe(GRATICULE_STEP_DEG);
    expect(l.lines).toHaveLength(3);
    // the whole block is above the plate under the page's own text: the call to action is no lower than the view's own latitude less a step
    expect(l.lines[2]!.baseLat).toBeGreaterThanOrEqual(28 - GRATICULE_STEP_DEG);
  });

  it("wraps the lines when a letter would be under the least size, at half the step, never leaving a letter under it when it can help it", () => {
    const l = layout(PHONE);
    expect(l.wrapped).toBe(true);
    expect(l.stepDeg).toBe(GRATICULE_STEP_DEG / 2);
    expect(l.lines.length).toBeGreaterThan(3);
    expect(l.lines[0]!.baseLat).toBe(topLatitude(28, CAPTION.aboveWrappedDeg));
    for (const line of l.lines) expect(Math.abs((line.baseLat / l.stepDeg) % 1)).toBe(0);
    expect(l.lines.map((x) => x.parent)).toEqual([...l.lines.map((x) => x.parent)].sort((a, b) => a - b));
    // the pieces read in order and are the whole line
    for (let p = 0; p < TEXTS.length; p++) {
      const joined = l.lines.filter((x) => x.parent === p).map((x) => x.text).join(" ").replace(/\s+/g, " ");
      expect(joined.replace(/ \u00b7 /g, " ")).toBe(TEXTS[p]!.replace(/ \u00b7 /g, " "));
    }
  });

  it("splits at the delimiter nearest the middle, and says null where there is none", () => {
    expect(splitLine("A personal archive, organised around places.")).toEqual(["A personal archive,", "organised around places."]);
    expect(splitLine("Software \u00b7 Articles \u00b7 Artworks \u00b7 Poetry")).toEqual(["Software \u00b7 Articles", "Artworks \u00b7 Poetry"]);
    expect(splitLine("Drag to explore. Pick a place.")).toEqual(["Drag to explore.", "Pick a place."]);
    expect(splitLine("Explore")).toBeNull();
  });
});

describe("what is seen: faces and the horizon", () => {
  it("is on a front face while the point is nearer the view axis than the shell's horizon, `acos(r / d)`, and culled past it", () => {
    const h = shellHorizon(d);
    expect(h).toBeCloseTo(Math.acos(CAPTION.radius / d), 12);
    expect(h).toBeLessThan(Math.PI / 2);
    expect(faceTowardsViewer(h - 0.01, d)).toBe(true);
    expect(faceTowardsViewer(h + 0.01, d)).toBe(false);
    expect(faceTowardsViewer(Math.PI, d)).toBe(false);
  });

  it("is before the globe's own horizon: a letter vanishes before the limb, it is never cut by it or seen beyond it", () => {
    expect(shellHorizon(d)).toBeLessThan(Math.acos(1 / d));
  });

  it("hides a line whose nearest edge is past the horizon, on either side, and shows it when any of it is in view", () => {
    const line = { halfSpan: 0.8, baseLat: 0 };
    const h = shellHorizon(d);
    // on the equator seen from the equator the central angle is the longitude offset itself
    expect(lineHidden(h + 0.8 + 0.01, line, d, 0)).toBe(true);
    expect(lineHidden(-(h + 0.8 + 0.01), line, d, 0)).toBe(true);
    expect(lineHidden(h + 0.8 - 0.05, line, d, 0)).toBe(false);
    expect(lineHidden(0, line, d, 0)).toBe(false);
  });

  it("counts the parallel's own latitude: a line high up stays in view longer than its longitude says (it curves round the pole)", () => {
    const line = { halfSpan: 0.4, baseLat: 60 };
    const theta = shellHorizon(d) + 0.4 + 0.1;
    expect(lineHidden(theta, { ...line, baseLat: 0 }, d, 0)).toBe(true);
    expect(lineHidden(theta, line, d, 50)).toBe(false);
  });

  it("starts every line hidden: from `entranceStart` the whole line is behind the horizon of any camera the page has, at any view latitude it can have", () => {
    for (const viewLat of [28, 10, -20, 40]) {
      for (const l of layout(DESKTOP, viewLat).lines) {
        const start = entranceStart(l, viewLat);
        expect(start).toBeGreaterThanOrEqual(CAPTION.enter.fromDeg * DEG);
        expect(start).toBeLessThanOrEqual(Math.PI);
        for (const dist of [cameraDistance(0.5, 900), cameraDistance(2.2, 900), cameraDistance(6.5, 900), 1.2]) {
          if (l.baseLat > 40 && viewLat > 30) continue; // a pole-ward parallel is seen over the pole from every side: it cannot be hidden by turning
          expect(lineHidden(start, l, dist, viewLat)).toBe(true);
        }
      }
    }
  });
});

describe("the entrance: fast, then a slow settle, staggered, a function of time", () => {
  const start = 2.6;

  it("is easeOutExpo: 0 at 0, 1 at 1, most of the way in the first tenth, monotonic", () => {
    expect(easeOutExpo(0)).toBe(0);
    expect(easeOutExpo(1)).toBe(1);
    expect(easeOutExpo(0.1)).toBeGreaterThan(0.45);
    expect(easeOutExpo(0.5)).toBeGreaterThan(0.96);
    let last = 0;
    for (let p = 0; p <= 1; p += 0.01) {
      expect(easeOutExpo(p)).toBeGreaterThanOrEqual(last);
      last = easeOutExpo(p);
    }
  });

  it("turns a line from its start to 0 within `enter.ms`, covering most of the way in the first 150 ms (under 40 % left) and settling slowly", () => {
    expect(enteringAngle(0, 0, start)).toBe(start);
    expect(enteringAngle(CAPTION.enter.ms, 0, start)).toBe(0);
    expect(enteringAngle(150, 0, start) / start).toBeLessThan(0.4);
    expect(enteringAngle(500, 0, start) / start).toBeLessThan(0.04);
    expect(enteringAngle(500, 0, start)).toBeGreaterThan(0); // still settling
    expect(CAPTION.enter.ms).toBeGreaterThanOrEqual(900);
    expect(CAPTION.enter.ms).toBeLessThanOrEqual(1100);
  });

  it("staggers the lines: line 1 starts `staggerMs` after line 0 and stays behind it all the way", () => {
    expect(CAPTION.enter.staggerMs).toBe(260);
    for (const t of [0, 100, 259]) expect(enteringAngle(t, 1, start)).toBe(start); // it has not started
    for (const t of [300, 500, 900]) expect(enteringAngle(t, 1, start)).toBeGreaterThan(enteringAngle(t, 0, start));
    expect(enteringAngle(CAPTION.enter.staggerMs + CAPTION.enter.ms, 1, start)).toBe(0);
    expect(entranceMs(2)).toBe(CAPTION.enter.ms + CAPTION.enter.staggerMs);
  });

  it("is a function of time alone: the same turn at any frame rate", () => {
    const at = (fps: number, ms: number) => {
      // a clock that only reads at frames of `fps`: the value at the last frame before `ms` is the function of that frame's time
      const frame = Math.floor((ms * fps) / 1000) / fps;
      return enteringAngle(frame * 1000, 0, start);
    };
    const m = new CaptionMotion();
    m.setStarts([start, start]);
    m.enter(0);
    for (const ms of [120, 480, 960]) {
      const exact = m.angle(ms, 0, start);
      expect(exact).toBeCloseTo(enteringAngle(ms, 0, start), 12);
      expect(Math.abs(at(30, ms) - exact)).toBeLessThan(0.35);
      expect(Math.abs(at(144, ms) - exact)).toBeLessThan(Math.abs(at(30, ms) - exact) + 1e-9);
    }
  });

  it("leaves quickly, on behind the planet the other way, from wherever it was", () => {
    expect(CAPTION.leaveMs).toBeLessThanOrEqual(250);
    expect(leavingAngle(0, 0.7, start)).toBe(0.7);
    expect(leavingAngle(CAPTION.leaveMs, 0.7, start)).toBeCloseTo(-start, 12);
    expect(easeInCubic(0.5)).toBeCloseTo(0.125, 12);
    const m = new CaptionMotion();
    m.setStarts([start, start]);
    m.enter(0);
    m.leave(300); // cut short: where they had got to
    const a0 = m.angle(300, 0, start);
    expect(a0).toBeCloseTo(enteringAngle(300, 0, start), 9);
    const mid = m.angle(300 + CAPTION.leaveMs / 2, 0, start);
    expect(mid).toBeLessThan(a0);
    expect(m.phase).toBe("out");
    m.angle(300 + CAPTION.leaveMs + 1, 0, start);
    expect(m.phase).toBe("hidden");
    expect(m.animating).toBe(false);
  });

  it("waits for the first frame on load, then plays; a returning showcase plays at once; reduced motion is the final composition", () => {
    const m = new CaptionMotion();
    m.setStarts([start]);
    m.enter(null);
    expect(m.waiting).toBe(true);
    expect(m.angle(5000, 0, start)).toBe(start);
    m.begin(1000, CAPTION.enter.loadDelayMs);
    expect(m.waiting).toBe(false);
    expect(m.angle(1000, 0, start)).toBe(start);
    expect(m.angle(1000 + CAPTION.enter.loadDelayMs + 300, 0, start)).toBeLessThan(0.15 * start);
    m.angle(1000 + CAPTION.enter.loadDelayMs + CAPTION.enter.ms + 10, 0, start);
    expect(m.phase).toBe("rest");
    expect(m.animating).toBe(false);
    const r = new CaptionMotion();
    r.setStarts([start]);
    r.settle(true);
    expect(r.angle(0, 0, start)).toBe(0);
    expect(r.animating).toBe(false);
    r.settle(false);
    expect(r.angle(0, 0, start)).toBe(start);
  });
});

describe("leaving and entering again, cut short", () => {
  const start = 2.6;

  it("keeps a line that has not begun to arrive behind the planet: it does not sweep across the face on its way out", () => {
    const m = new CaptionMotion();
    m.setStarts([start, start]);
    m.enter(0);
    // 50 ms in: line 0 has begun, line 1 is still waiting for its stagger (260 ms)
    m.leave(50);
    for (const t of [50, 90, 150, 240]) {
      expect(m.angle(t, 1, start)).toBe(start);
      expect(m.angle(t, 0, start)).toBeLessThan(start);
    }
    // while a line that was in view goes on across, and ends hidden on the other side
    expect(m.angle(50 + CAPTION.leaveMs * 0.99, 0, start)).toBeLessThan(0);
    // a showcase that ends before its first frame (a pending entrance) never shows anything
    const p = new CaptionMotion();
    p.setStarts([start]);
    p.enter(null);
    expect(p.animating).toBe(false); // nothing moves before the first frame gives it a clock
    p.leave(10);
    for (const t of [10, 100, 200]) expect(p.angle(t, 0, start)).toBe(start);
  });

  it("goes on from where it is when a leaving is cut short by an entrance: no jump, no stagger, and it settles into its place", () => {
    const m = new CaptionMotion();
    m.setStarts([start, start]);
    m.enter(0);
    m.leave(400);
    const at = [m.angle(520, 0, start), m.angle(520, 1, start)];
    m.enter(520);
    expect(m.phase).toBe("in");
    // the first reading of the new entrance is the last one of the leaving
    expect(m.angle(520, 0, start)).toBeCloseTo(at[0]!, 9);
    expect(m.angle(520, 1, start)).toBeCloseTo(at[1]!, 9);
    for (let t = 530; t <= 520 + CAPTION.enter.ms; t += 40) {
      expect(Math.abs(m.angle(t, 0, start))).toBeLessThanOrEqual(Math.abs(at[0]!) + 1e-9);
    }
    m.angle(520 + CAPTION.enter.ms + entranceMs(2), 0, start);
    expect(m.angle(520 + 3000, 0, start)).toBe(0);
    expect(m.phase).toBe("rest");
  });

  it("enters from behind the planet when it comes from hidden, and ignores an entrance while one is running", () => {
    const m = new CaptionMotion();
    m.setStarts([start]);
    m.enter(0);
    m.leave(10);
    m.angle(10 + CAPTION.leaveMs + 1, 0, start); // out -> hidden
    m.enter(1000);
    expect(m.angle(1000, 0, start)).toBe(start);
    const mid = m.angle(1100, 0, start);
    m.enter(1100); // a second show while in: nothing restarts
    expect(m.angle(1100, 0, start)).toBe(mid);
  });
});

describe("the face and the toggle", () => {
  it("is the site's reading serif, no file of its own: Newsreader, with a system serif behind it", () => {
    expect(CAPTION_FACE.family).toMatch(/Newsreader/);
    expect(CAPTION_FACE.fallback).toMatch(/serif/);
  });

  it("is chosen with ?orbit-pixel=0|1 (or the session's); anything else is the page's choice", () => {
    expect(captionPixelFrom("?orbit-pixel=1", null)).toBe(true);
    expect(captionPixelFrom("?orbit-pixel=0", "1")).toBe(false);
    expect(captionPixelFrom("?x=1", "1")).toBe(true);
    expect(captionPixelFrom("?orbit-pixel=maybe", null)).toBeNull();
    expect(captionPixelFrom("", null)).toBeNull();
  });
});
