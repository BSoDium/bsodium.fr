import { describe, expect, it } from "vitest";
import {
  CAPTION_FONTS,
  CaptionMotion,
  bandFrame,
  bandMesh,
  captionFontFrom,
  easeInCubic,
  easeOutExpo,
  enteringAngle,
  entranceMs,
  entranceStart,
  faceTowardsViewer,
  layoutCaption,
  legibleFont,
  leavingAngle,
  lineHidden,
  shellHorizon,
  shellPoint,
} from "./caption";
import { DEG, cameraDistance } from "./geo";
import { CAPTION } from "./tuning";

const TEXTS = ["Drag to explore", "Pick a place"];
const WIDTHS = [7.4, 6.1];
const layout = () => layoutCaption(TEXTS, WIDTHS, CAPTION_FONTS.jacquard.capEm, CAPTION_FONTS.jacquard.boxCaps);
const d = cameraDistance(2.2, 900);

describe("the shell and the bands", () => {
  it("has the bands' axis leaning away by `leanDeg` and NO roll: at the central meridian a band is horizontal on the screen", () => {
    const { A, e1, e2 } = bandFrame();
    expect(A[0]).toBe(0); // no x component: nothing leans sideways
    expect(e2).toEqual([1, 0, 0]); // the reading direction is the screen's horizontal at the meridian
    expect(Math.hypot(...A)).toBeCloseTo(1, 12);
    expect(A[0] * e1[0] + A[1] * e1[1] + A[2] * e1[2]).toBeCloseTo(0, 12);
    for (const lambda of [-0.2, 0, 0.3]) {
      const l = shellPoint(-0.01, lambda);
      const r = shellPoint(0.01, lambda);
      // a hundredth of a radian either side of the central meridian: the line's tangent has no vertical component
      expect(Math.abs(r[1] - l[1])).toBeLessThan(1e-9);
      expect(r[0]).toBeGreaterThan(l[0]);
    }
  });

  it("is the shell: every point at `CAPTION.radius`, and a line's points all at one latitude (the same distance along the axis)", () => {
    const lines = layout().lines;
    const { A } = bandFrame();
    for (const line of lines) {
      const m = bandMesh(line, 24, 2);
      const cols = 25;
      for (let j = 0; j < 3; j++) {
        let along = NaN;
        for (let i = 0; i < cols; i++) {
          const k = (j * cols + i) * 3;
          const x = m.positions[k]!;
          const y = m.positions[k + 1]!;
          const z = m.positions[k + 2]!;
          expect(Math.hypot(x, y, z)).toBeCloseTo(CAPTION.radius, 5);
          const a = x * A[0] + y * A[1] + z * A[2];
          if (i === 0) along = a;
          expect(a).toBeCloseTo(along, 5); // a row is a circle about the axis: constant latitude
        }
      }
    }
  });

  it("stacks the lines one under the other, centred on the block's latitude, each on its own", () => {
    const l = layout().lines;
    expect(l).toHaveLength(2);
    expect(l[0]!.lambda).toBeGreaterThan(l[1]!.lambda);
    const gap = (CAPTION.leading * layout().capR) / CAPTION.radius;
    expect(l[0]!.lambda - l[1]!.lambda).toBeCloseTo(gap, 9);
    expect((l[0]!.lambda + l[1]!.lambda) / 2).toBeCloseTo((CAPTION.leanDeg + CAPTION.centreDeg) * DEG, 9);
  });

  it("is centred on the central meridian: the strip is symmetric about longitude 0", () => {
    const line = layout().lines[0]!;
    const m = bandMesh(line, 20, 1);
    const cols = 21;
    const first = [m.positions[0]!, m.positions[1]!, m.positions[2]!];
    const last = [m.positions[(cols - 1) * 3]!, m.positions[(cols - 1) * 3 + 1]!, m.positions[(cols - 1) * 3 + 2]!];
    expect(first[0]).toBeCloseTo(-last[0]!, 6);
    expect(first[1]).toBeCloseTo(last[1]!, 6);
    expect(first[2]).toBeCloseTo(last[2]!, 6);
  });

  it("bends down towards the limbs: the line's ends are lower than its middle (it arches over the planet)", () => {
    const line = layout().lines[0]!;
    const mid = shellPoint(0, line.lambda);
    const end = shellPoint(line.halfSpan, line.lambda);
    expect(end[1]).toBeLessThan(mid[1]);
    // and it foreshortens: the end is further from the viewer's axis in depth than the middle
    expect(end[2]).toBeLessThan(mid[2]);
  });

  it("is wound counter-clockwise seen from outside: every triangle's normal points away from the planet (back faces are the far side's)", () => {
    const line = layout().lines[0]!;
    const m = bandMesh(line, 12, 2);
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

  it("reads left to right: texture u grows with the longitude, to the right of the screen at the meridian", () => {
    const line = layout().lines[0]!;
    const m = bandMesh(line, 10, 1);
    expect(m.uvs[2]).toBeGreaterThan(m.uvs[0]!);
    expect(m.positions[3]).toBeGreaterThan(m.positions[0]!);
    // v is 1 at the top (the higher latitude)
    const cols = 11;
    expect(m.uvs[2 * cols + 1]).toBe(1);
    expect(m.positions[3 * cols + 1]).toBeGreaterThan(m.positions[1]!);
  });

  it("shrinks to the span the planet can carry, and never past it", () => {
    const wide = layoutCaption(["a very long call to action that does not fit round a planet"], [40], CAPTION_FONTS.jacquard.capEm, 2.3);
    expect(wide.capR).toBeLessThan(CAPTION.capR);
    expect(2 * wide.lines[0]!.halfSpan).toBeLessThanOrEqual(CAPTION.maxSpanDeg * DEG + 1e-9);
    expect(layout().capR).toBe(CAPTION.capR);
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
    const line = { halfSpan: 0.8 };
    const h = shellHorizon(d);
    expect(lineHidden(h + 0.8 + 0.01, line, d)).toBe(true);
    expect(lineHidden(-(h + 0.8 + 0.01), line, d)).toBe(true);
    expect(lineHidden(h + 0.8 - 0.05, line, d)).toBe(false);
    expect(lineHidden(0, line, d)).toBe(false);
  });

  it("starts every line hidden: from `entranceStart` the whole line is behind the horizon of any camera the page has", () => {
    for (const l of layout().lines) {
      const start = entranceStart(l);
      for (const dist of [cameraDistance(0.5, 900), cameraDistance(2.2, 900), cameraDistance(6.5, 900), 1.2]) expect(lineHidden(start, l, dist)).toBe(true);
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
    expect(CAPTION.enter.staggerMs).toBe(140);
    for (const t of [0, 100, 139]) expect(enteringAngle(t, 1, start)).toBe(start); // it has not started
    for (const t of [200, 400, 800]) expect(enteringAngle(t, 1, start)).toBeGreaterThan(enteringAngle(t, 0, start));
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

describe("the faces", () => {
  it("falls back along the chain to the face that reads at the size the page has, the bitmap font last", () => {
    expect(legibleFont("jacquard", 19)).toBe("jacquard");
    expect(legibleFont("jacquard", 12.5)).toBe("pixelify");
    expect(legibleFont("jacquard", 9)).toBe("bitmap");
    expect(legibleFont("pixelify", 19)).toBe("pixelify");
    expect(legibleFont("bitmap", 30)).toBe("bitmap");
    expect(legibleFont("jacquard", 0)).toBe("bitmap");
  });

  it("is chosen with ?orbit-font= (or the session's), a bad value is the default, and the repo's own font needs no file", () => {
    expect(captionFontFrom("?orbit-font=pixelify", null)).toBe("pixelify");
    expect(captionFontFrom("?x=1", "bitmap")).toBe("bitmap");
    expect(captionFontFrom("?orbit-font=comic", "bitmap")).toBe("jacquard");
    expect(captionFontFrom("", null)).toBe("jacquard");
    expect(CAPTION_FONTS.bitmap.url).toBeNull();
    expect(CAPTION_FONTS.jacquard.url).toMatch(/^\/fonts\/.*\.woff2$/);
    expect(CAPTION_FONTS.pixelify.url).toMatch(/^\/fonts\/.*\.woff2$/);
  });
});
