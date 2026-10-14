import { describe, expect, it } from "vitest";
import {
  CAPTION_FACE,
  CAPTION_FACES,
  CAPTION_FALLBACK_STYLE,
  CAPTION_STYLES,
  CaptionMotion,
  bandMesh,
  captionColors,
  captionFont,
  type CaptionRun,
  entranceSides,
  runsText,
  seededUnit,
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
  meridianDelta,
  meridianY,
  planPieces,
  solveParallels,
  minScaleFor,
  shellY,
  swapEnterAngle,
  swapExitAngle,
  swapMs,
  swapExitMs,
  splitRuns,
  visibleHalfSpan,
  unitBand,
  bandPoint,
} from "./caption";
import { DEG, cameraDistance, lonLatToVec3, viewBasis } from "./geo";
import { CAPTION } from "./tuning";

/** The home screen's four rows (two that take turns, two that stay), with the words picked out as the site does (`siteCaption`). */
const LINES: CaptionRun[][] = [
  [{ text: "A " }, { text: "personal archive", style: "heavy" }, { text: "," }],
  [{ text: "organised around " }, { text: "places", style: "heavy-italic" }, { text: "." }],
  [{ text: "Drag to " }, { text: "explore", style: "heavy" }, { text: "." }],
  [{ text: "Pick a " }, { text: "place", style: "heavy" }, { text: "." }],
];
/** The other phrase sets (rows of the same slot). */
const SECTIONS_ROWS: CaptionRun[][] = [
  [{ text: "Software", style: "mono" }, { text: " \u00b7 " }, { text: "Articles", style: "heavy" }],
  [{ text: "Artworks", style: "heavy-italic" }, { text: " \u00b7 " }, { text: "Poetry", style: "script" }],
];
/** Widths in ems of a run (a serif at about half an em a letter, the heavy cuts a little wider, the mono at its own pitch). */
const measure = (r: CaptionRun) => r.text.length * (r.style === "heavy" || r.style === "heavy-italic" ? 0.56 : r.style === "mono" ? 0.53 : 0.5);
const DESKTOP = 330; // the planet's radius at the lowest zoom, CSS px, at 1440x900
const PHONE = 150; // and at 390x844
/** The camera's distance at the lowest zoom of a 1440 x 900 window (what the layer is told). */
const D_REST = 5.8;
const layout = (rPx = DESKTOP, viewLat = 28) => layoutCaption({ rows: LINES, measure, rPx, viewLat, d: D_REST });
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

  it("has the tilt and the curvature of the graticule's parallel at the view's latitude: from the north the ends rise, from the south they fall, at the equator it is straight", () => {
    const line = layout().lines[0]!;
    for (const view of [28, 55, 0, -28, -50]) {
      const mid = screenY(parallelPoint(0, line.baseLat, 1), view);
      const end = screenY(parallelPoint(line.halfSpan, line.baseLat, 1), view);
      // the graticule's dotted parallel at the same latitude, on the planet's surface, for the same two longitudes
      const gMid = screenY(lonLatToVec3(0, line.baseLat), view);
      const gEnd = screenY(lonLatToVec3(line.halfSpan / DEG, line.baseLat), view);
      expect(end - mid).toBeCloseTo(gEnd - gMid, 9); // the shell is the surface scaled: the same shape
    }
    // the line lies in the plane of its parallel: all its points are at one height along the earth's axis, whatever the camera
    const ys = [-1, -0.3, 0, 0.5, 1].map((u) => parallelPoint(u * line.halfSpan, line.baseLat, CAPTION.radius)[1]);
    for (const y of ys) expect(y).toBeCloseTo(CAPTION.radius * Math.sin(line.baseLat * DEG), 9);
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
    expect(CAPTION.radius - CAPTION.depth).toBeGreaterThan(1.02); // the back of the letters is still clear of the surface
  });

  it("is ONE unit strip for every line: the vertex shader's parallel (`bandPoint`) gives the same points as the built mesh", () => {
    const unit = unitBand();
    expect(unit.attributes.length / 3).toBe((64 + 1) * 2 * CAPTION.slices);
    const line = layout(DESKTOP, -30).lines[3]!;
    const m = bandMesh(line, 64, CAPTION.slices, CAPTION.depth);
    const p: [number, number, number] = [0, 0, 0];
    for (const i of [0, 5, 64, 65, 130, 400, unit.attributes.length / 3 - 1]) {
      bandPoint(line, unit.attributes[3 * i]!, unit.attributes[3 * i + 1]!, unit.attributes[3 * i + 2]!, CAPTION.depth, CAPTION.radius, p);
      expect(m.positions[3 * i]).toBeCloseTo(p[0], 5);
      expect(m.positions[3 * i + 1]).toBeCloseTo(p[1], 5);
      expect(m.positions[3 * i + 2]).toBeCloseTo(p[2], 5);
    }
  });
});

describe("the parallels are picked for the camera's tilt", () => {
  const pieces = (rPx = DESKTOP) => planPieces({ rows: LINES, measure, rPx }).pieces;
  const solve = (phi: number, rPx = DESKTOP) => solveParallels(pieces(rPx), phi, D_REST, [], minScaleFor(pieces(rPx), rPx));
  const PX = 600; // planet radii to px at a 900 px viewport: only for a readable scale

  it("inverts the projection: the screen height of a parallel's point at the central meridian maps back to its offset, and `shellY` is the same projection", () => {
    for (const delta of [-0.9, -0.3, 0, 0.2, 0.7, 1.1]) {
      expect(meridianDelta(meridianY(delta, D_REST), D_REST)).toBeCloseTo(delta, 9);
      expect(shellY(0, 30 + delta / DEG, 30, D_REST)).toBeCloseTo(meridianY(delta, D_REST), 9);
    }
    expect(meridianY(0, D_REST)).toBe(0);
  });

  it("holds the same CLEARANCE between rows, to a few px, from the north (+50), the equator and the south (-50)", () => {
    const eq = solve(0);
    for (const phi of [50, -50, 30, -30]) {
      const s = solve(phi);
      expect(s.scale).toBeLessThanOrEqual(eq.scale + 1e-9); // (the letters may be smaller where a chord needs it; the clearances are not)
      s.clearances.forEach((c, i) => expect(Math.abs(c - eq.clearances[i]!) * PX).toBeLessThan(2));
      // and the same block middle on the screen
      expect(Math.abs(s.centreY - eq.centreY) * PX).toBeLessThan(3);
    }
  });

  it("is symmetric: a tilt and its mirror give the same size, clearances and middle", () => {
    for (const phi of [20, 40, 50, 62, 75]) {
      const a = solve(phi);
      const b = solve(-phi);
      expect(a.scale).toBeCloseTo(b.scale, 9);
      a.clearances.forEach((c, i) => expect(c).toBeCloseTo(b.clearances[i]!, 3));
      expect(a.centreY).toBeCloseTo(b.centreY, 3);
    }
  });

  it("never lets two rows touch, from +70 to -70: every clearance over the width the rows share is positive, and every row keeps its own parallel", () => {
    for (let phi = 70; phi >= -70; phi -= 10) {
      const s = solve(phi);
      s.clearances.forEach((c) => expect(c).toBeGreaterThan(0));
      for (let i = 1; i < s.placements.length; i++) expect(s.placements[i - 1]!.baseLat - s.placements[i]!.baseLat).toBeGreaterThanOrEqual(CAPTION.minLatGapDeg - 1e-9);
      for (const p of s.placements) expect(Math.abs(p.baseLat)).toBeLessThanOrEqual(CAPTION.latMax + 1e-9);
    }
  });

  it("holds at the extreme tilts too (over a pole): rows stay apart and none passes the limb the camera sees", () => {
    for (const phi of [90, 85, -85, -90]) {
      const s = solve(phi);
      expect(Number.isFinite(s.scale)).toBe(true);
      s.clearances.forEach((c) => expect(c).toBeGreaterThanOrEqual(0));
    }
  });

  it("keeps the rows inside their chords: no row is wider than the camera sees it well, and the whole block shrinks together", () => {
    for (const phi of [70, 50, 28, 0, -28, -50, -70]) {
      const { placements, scale } = solve(phi);
      expect(scale).toBeGreaterThan(0.2);
      expect(scale).toBeLessThanOrEqual(1);
      for (const p of placements) expect(2 * p.halfSpan).toBeLessThanOrEqual(CAPTION.hardSpanDeg * DEG + 1e-6);
      // uniform: the size hierarchy of the nominal caps is kept
      const nominal = pieces();
      placements.forEach((p, i) => expect(p.capR / nominal[i]!.cap).toBeCloseTo(scale, 6));
    }
  });

  it("centres the block: its middle is where `centreDeg` puts it at the camera tilts the page has", () => {
    const target = meridianY(CAPTION.centreDeg * DEG, D_REST);
    for (const phi of [28, 0, -28, 50, -50]) expect(Math.abs(solve(phi).centreY - target) * PX).toBeLessThan(4);
  });

  it("puts the call to action under the other rows and makes it the largest", () => {
    const l = layout().lines;
    expect(l).toHaveLength(4);
    expect(Math.min(l[2]!.capR, l[3]!.capR)).toBeGreaterThan(Math.max(l[0]!.capR, l[1]!.capR));
    for (let i = 1; i < l.length; i++) expect(l[i]!.baseLat).toBeLessThan(l[i - 1]!.baseLat);
  });

  it("is the same block on a phone planet as on a desktop one, in the planet's own units (up to the smallest letter), and never under three quarters of the least size", () => {
    const ph = solve(28, PHONE).placements;
    ph.forEach((p) => expect(p.capR * PHONE).toBeGreaterThanOrEqual(0.75 * CAPTION.minCapPx - 1e-6));
    const d = solve(28, DESKTOP).placements;
    expect(ph.length).toBe(d.length);
  });

  it("knows how far from the central meridian a parallel is seen well, 0 when not at all and pi over the pole", () => {
    expect(visibleHalfSpan(0, 0, 0.5)).toBeCloseTo(0.5, 9);
    expect(visibleHalfSpan(0, 80, 0.5)).toBe(0); // farther than that even at its middle
    expect(visibleHalfSpan(80, 80, 0.5)).toBe(Math.PI); // seen over the pole: all of it is near
  });

  it("is sized by the ink the faces report (an overhanging script is not clipped): the box's width is what the layout gives the strip", () => {
    const wide = (r: CaptionRun) => r.text.length * 0.5;
    const rows = [[{ text: "Poetry", style: "script" as const }]];
    const a = layoutCaption({ rows, measure: wide, rPx: DESKTOP, viewLat: 0, d: D_REST });
    const b = layoutCaption({ rows, measure: wide, box: () => ({ widthEm: 3.6, aboveCaps: 1.5, belowCaps: 0.8 }), rPx: DESKTOP, viewLat: 0, d: D_REST });
    expect(b.lines[0]!.widthEm).toBe(3.6);
    expect(b.lines[0]!.aboveCaps).toBe(1.5);
    expect(b.lines[0]!.belowCaps).toBe(0.8);
    expect(b.lines[0]!.halfSpan).toBeGreaterThan(a.lines[0]!.halfSpan); // 3.6 ems of ink against 3 of advance
  });

  it("cuts a phrase at the delimiter nearest the middle (a separator dot is dropped), at a clause end before a plain space, and says null where there is none", () => {
    const m = (r: CaptionRun) => r.text.length;
    const line: CaptionRun[] = [{ text: "A " }, { text: "personal archive", style: "heavy" }, { text: ", organised around " }, { text: "places", style: "heavy-italic" }, { text: "." }];
    const cut = splitRuns(line, m)!;
    expect(cut.map(runsText)).toEqual(["A personal archive,", "organised around places."]);
    const dots = splitRuns([...SECTIONS_ROWS[0]!, { text: " \u00b7 " }, ...SECTIONS_ROWS[1]!], m)!;
    expect(dots.map(runsText)).toEqual(["Software \u00b7 Articles", "Artworks \u00b7 Poetry"]);
    expect(splitRuns([{ text: "Explore" }], m)).toBeNull();
    expect(cut[0]!.some((r) => r.style === "heavy")).toBe(true);
    expect(cut[1]!.some((r) => r.style === "heavy-italic")).toBe(true);
  });
});

describe("the rows that take turns", () => {
  const start = 2.6;

  it("sends the outgoing rows round the orbit and behind the planet, each row after the one above, ease-in, to the side it goes towards", () => {
    expect(swapExitAngle(0, 0, start)).toBe(0);
    expect(swapExitAngle(CAPTION.cycle.exitMs, 0, start)).toBe(-start);
    // row 1 starts `exitStaggerMs` later
    expect(swapExitAngle(CAPTION.cycle.exitStaggerMs - 1, 1, start)).toBe(0);
    expect(swapExitAngle(CAPTION.cycle.exitStaggerMs + CAPTION.cycle.exitMs, 1, start)).toBe(-start);
    // slow start, quick end (ease-in)
    expect(Math.abs(swapExitAngle(CAPTION.cycle.exitMs * 0.3, 0, start))).toBeLessThan(0.1 * start);
    expect(swapExitAngle(300, 0, -start)).toBeGreaterThan(0); // the other side
  });

  it("brings the incoming rows in only once every outgoing row has gone, from their own sides, each `staggerMs` after the one above", () => {
    const rows = 2;
    const gone = swapExitMs(rows);
    expect(swapEnterAngle(0, 0, rows, start)).toBe(start);
    expect(swapEnterAngle(gone - 1, 0, rows, start)).toBe(start); // leaving room first
    expect(swapEnterAngle(gone + 100, 0, rows, start)).toBeLessThan(start);
    expect(swapEnterAngle(gone + 100, 1, rows, start)).toBe(start); // row 2 waits for its stagger
    expect(swapEnterAngle(gone + CAPTION.enter.staggerMs + CAPTION.enter.ms, 1, rows, start)).toBe(0);
    expect(swapEnterAngle(gone + 300, 0, rows, -start)).toBeGreaterThan(-start); // from the west
    expect(swapMs(rows)).toBe(gone + entranceMs(rows));
  });

  it("dwells several seconds, and exits and enters within about two", () => {
    expect(CAPTION.cycle.dwellMs).toBeGreaterThanOrEqual(5000);
    expect(CAPTION.cycle.dwellMs).toBeLessThanOrEqual(6500);
    expect(swapMs(2)).toBeLessThan(2500);
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
          // a pole-ward parallel seen over the pole is in view from every side: it cannot be hidden by turning
          if (visibleHalfSpan(viewLat, l.baseLat, shellHorizon(dist)) >= Math.min(Math.PI, start) - l.halfSpan - 1e-9) continue;
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
    m.leave(300, "orbit"); // cut short: where they had got to
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
    m.leave(50, "orbit");
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
    p.leave(10, "orbit");
    for (const t of [10, 100, 200]) expect(p.angle(t, 0, start)).toBe(start);
  });

  it("goes on from where it is when a leaving is cut short by an entrance: no jump, no stagger, and it settles into its place", () => {
    const m = new CaptionMotion();
    m.setStarts([start, start]);
    m.enter(0);
    m.leave(400, "orbit");
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
    m.leave(10, "orbit");
    m.angle(10 + CAPTION.leaveMs + 1, 0, start); // out -> hidden
    m.enter(1000);
    expect(m.angle(1000, 0, start)).toBe(start);
    const mid = m.angle(1100, 0, start);
    m.enter(1100); // a second show while in: nothing restarts
    expect(m.angle(1100, 0, start)).toBe(mid);
  });
});

describe("the sides the lines come in from", () => {
  const start = 2.6;
  const make = (seed: number | null, lines = 3) => {
    const m = new CaptionMotion();
    m.seed = seed;
    m.setStarts(Array(lines).fill(start));
    return m;
  };

  it("is all from the east without a seed (the plain default), at the start angle", () => {
    const m = make(null);
    m.enter(0);
    for (let i = 0; i < 3; i++) expect(m.angle(0, i, start)).toBe(start);
  });

  it("is random per line and per entrance, deterministic for a seed, and may repeat", () => {
    const a = entranceSides(12345, 1, 3);
    expect(entranceSides(12345, 1, 3)).toEqual(a);
    expect(a.every((x) => x === 1 || x === -1)).toBe(true);
    // across entrances and seeds both sides turn up, and over many draws neither dominates
    let west = 0;
    let n = 0;
    for (let seed = 1; seed <= 40; seed++) for (let e = 1; e <= 5; e++) for (const side of entranceSides(seed, e, 3)) (n++, side === -1 && west++);
    expect(west / n).toBeGreaterThan(0.35);
    expect(west / n).toBeLessThan(0.65);
    // two lines of one entrance can share a side (it is not a shuffle)
    const same = [...Array(60).keys()].some((seed) => new Set(entranceSides(seed + 1, 1, 3)).size === 1);
    expect(same).toBe(true);
  });

  it("starts each line on its own side, travels in with the same curve, and rests in place from either", () => {
    const m = make(7);
    m.enter(0);
    const sides = [0, 1, 2].map((i) => Math.sign(m.angle(0, i, start)));
    expect(sides).toEqual(entranceSides(7, 1, 3));
    for (let i = 0; i < 3; i++) {
      const t = 700 + i * CAPTION.enter.staggerMs;
      expect(m.angle(t, i, start)).toBeCloseTo(sides[i]! * enteringAngle(700 + 0, 0, start), 9);
    }
    m.angle(entranceMs(3) + 5, 0, start);
    expect(m.phase).toBe("rest");
    for (let i = 0; i < 3; i++) expect(m.angle(entranceMs(3) + 5, i, start)).toBe(0);
  });

  it("draws new sides for each entrance from hidden, but a leaving cut short goes on from where each line is, on its own side", () => {
    const m = make(99);
    m.enter(0);
    const first = [0, 1, 2].map((i) => m.side(i));
    m.leave(400, "orbit");
    const at = [0, 1, 2].map((i) => m.angle(400, i, start));
    m.angle(400 + CAPTION.leaveMs + 1, 0, start); // out -> hidden
    const n = m.entranceNumber;
    m.enter(2000);
    expect(m.entranceNumber).toBe(n + 1);
    expect([0, 1, 2].map((i) => m.side(i))).toEqual(entranceSides(99, n + 1, 3));
    // cut short: the same sides, no jump
    const k = make(99);
    k.enter(0);
    k.leave(400, "orbit");
    const stay = [0, 1, 2].map((i) => k.side(i));
    k.enter(450);
    expect([0, 1, 2].map((i) => k.side(i))).toEqual(stay);
    expect(stay).toEqual(first);
    expect(at.length).toBe(3);
  });

  it("keeps a line that has not begun behind the planet on its own side when the leaving begins early (west or east)", () => {
    const m = make(5);
    m.enter(0);
    m.leave(50, "orbit");
    for (const t of [50, 90, 240]) {
      for (let i = 1; i < 3; i++) expect(m.angle(t, i, start)).toBe(start * m.side(i));
    }
  });

  it("gives the same sequence for the same seed (the generator)", () => {
    const r1 = seededUnit(42);
    const r2 = seededUnit(42);
    expect([r1(), r1(), r1()]).toEqual([r2(), r2(), r2()]);
  });
});

describe("leaving: a fade, or the orbit", () => {
  const start = 2.6;
  const make = () => {
    const m = new CaptionMotion();
    m.setStarts([start, start, start]);
    return m;
  };

  it("fades by default: nothing moves, the lines stay where they were, and the caption is hidden after `fadeMs`", () => {
    const m = make();
    m.enter(0);
    m.angle(CAPTION.enter.ms + 3 * CAPTION.enter.staggerMs + 50, 0, start); // in place: rest
    expect(m.phase).toBe("rest");
    m.leave(5000);
    expect(m.phase).toBe("fade");
    expect(m.animating).toBe(false); // no frames are asked for: the fade is the compositor's
    for (const t of [5000, 5050, 5100, 5170]) for (let i = 0; i < 3; i++) expect(m.angle(t, i, start)).toBe(0);
    m.tick(5000 + CAPTION.fadeMs - 1);
    expect(m.phase).toBe("fade");
    m.tick(5000 + CAPTION.fadeMs);
    expect(m.phase).toBe("hidden");
    expect(m.animating).toBe(false);
  });

  it("freezes a line mid-entrance where it was when the fade begins (no travel)", () => {
    const m = make();
    m.enter(0);
    const at = m.angle(400, 0, start);
    expect(at).toBeGreaterThan(0);
    m.leave(400);
    for (const t of [400, 450, 560]) expect(m.angle(t, 0, start)).toBe(at);
  });

  it("keeps the orbit exit: `leave(now, \"orbit\")` sends the lines on behind the planet, as before", () => {
    const m = make();
    m.enter(0);
    m.angle(CAPTION.enter.ms + 3 * CAPTION.enter.staggerMs + 50, 0, start);
    m.leave(5000, "orbit");
    expect(m.phase).toBe("out");
    expect(m.animating).toBe(true);
    const mid = m.angle(5000 + CAPTION.leaveMs / 2, 0, start);
    expect(mid).toBeLessThan(0);
    expect(m.angle(5000 + CAPTION.leaveMs + 1, 0, start)).toBe(start);
    expect(m.phase).toBe("hidden");
  });

  it("enters again from a fade as from hidden: a fresh entrance with sides drawn again", () => {
    const m = new CaptionMotion();
    m.seed = 11;
    m.setStarts([start, start, start]);
    m.enter(0);
    m.angle(5000, 0, start);
    m.leave(5000);
    m.tick(5000 + CAPTION.fadeMs);
    const n = m.entranceNumber;
    m.enter(6000);
    expect(m.entranceNumber).toBe(n + 1);
    expect(m.phase).toBe("in");
    expect(Math.abs(m.angle(6000, 0, start))).toBe(start);
  });

  it("is quick: the fade is between 150 and 220 ms", () => {
    expect(CAPTION.fadeMs).toBeGreaterThanOrEqual(150);
    expect(CAPTION.fadeMs).toBeLessThanOrEqual(220);
  });
});

describe("faces, styles and colours", () => {
  it("is the site's own faces and one handwriting: the serif and the mono are in the stylesheet (no file added), the handwriting has a file", () => {
    expect(CAPTION_FACES.serif.family).toMatch(/Newsreader/);
    expect(CAPTION_FACES.mono.family).toMatch(/JetBrains Mono/);
    expect(CAPTION_FACES.serif.url).toBeNull();
    expect(CAPTION_FACES.mono.url).toBeNull();
    expect(CAPTION_FACES.script.url).toMatch(/^\/fonts\/imperial-script-\d+\.\d+-latin-400\.woff2$/);
    expect(CAPTION_FACE.capEm).toBeGreaterThan(0.5);
  });

  it("has heavier weights for the highlights and a font string per style that names its face, weight and italic", () => {
    expect(CAPTION_STYLES.heavy.weight).toBeGreaterThan(CAPTION_STYLES.plain.weight);
    expect(CAPTION_STYLES["heavy-italic"].italic).toBe(true);
    expect(captionFont("heavy-italic", 100)).toMatch(/^italic 800 100px "Newsreader Variable"/);
    expect(captionFont("mono", 100)).toMatch(/JetBrains Mono Variable/);
    // the mono and the script are scaled to the serif's cap height
    expect(captionFont("mono", 100)).toContain(`${100 * CAPTION_FACES.mono.scale}px`);
    expect(CAPTION_FALLBACK_STYLE.script).toBe("heavy-italic");
  });

  it("takes its colours from the globe's own palette, greys only: the face a tint of the page, the outline the coast grey pushed to the ink, the side between", () => {
    const light = { background: [0.984, 0.984, 0.984], ink: [0.039, 0.039, 0.039], coast: [0.56, 0.56, 0.56], outline: [0.9, 0.9, 0.9], grid: [0.8, 0.8, 0.8], ramp: [] } as never;
    const dark = { background: [0.039, 0.039, 0.039], ink: [0.96, 0.96, 0.96], coast: [0.38, 0.38, 0.38], outline: [0.1, 0.1, 0.1], grid: [0.2, 0.2, 0.2], ramp: [] } as never;
    const l = captionColors(light);
    const d = captionColors(dark);
    // monochrome: every channel the same, and there is no accent
    for (const c of [l.face, l.outline, l.side, d.face, d.outline, d.side]) expect(c[0]).toBeCloseTo(c[1]!, 9);
    expect(Object.keys(l).sort()).toEqual(["face", "outline", "side"]);
    // never the pure ink or the pure page: quieter than the name
    expect(l.face[0]).toBeLessThan(0.984);
    expect(l.face[0]).toBeGreaterThan(0.9);
    expect(l.outline[0]).toBeLessThan(0.56);
    expect(l.outline[0]).toBeGreaterThan(0.039);
    expect(d.face[0]).toBeGreaterThan(0.039);
    expect(d.face[0]).toBeLessThan(0.35); // dark does not glare
    // the side is a tone of its own, between the face and the outline, in both schemes
    expect(l.side[0]).toBeLessThan(l.face[0]);
    expect(l.side[0]).toBeGreaterThan(l.outline[0]);
    expect(d.side[0]).toBeGreaterThan(d.face[0]);
    expect(d.side[0]).toBeLessThan(d.outline[0]);
  });
});
