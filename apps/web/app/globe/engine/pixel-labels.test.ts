import { describe, expect, it } from "vitest";
import { CLEAR, MIXED, PixelBuffer } from "./pixel-buffer";
import { ALPHA_STEPS, BOX_STYLE, LABEL_PAD, MIN_LABEL_CHARS, SPOT, TEXT_GAP, boxOpenness, chipText, dashingFor, drawBox, drawLabel, edgeLit, labelCandidates, labelLayout, labelTones, labelVariants, quantAlpha, selectedShift, snapToLattice, spotAt } from "./pixel-labels";
import { FONT_CAP, FONT_DESCENT, measureText } from "./pixel-font/pixel-font";
import { buildRamp, textFloorLevel } from "./palette";

const T = labelTones(12);
/** A theme-like ramp: dark page, light ink, 12 distinct levels. */
const RAMP = Array.from({ length: 12 }, (_, k) => [k / 11, k / 11, k / 11] as const);
const INK = T.active.box;
const PEAK = T.rest.box;

describe("label geometry (whole cells)", () => {
  it("a place's plate is the name plus LABEL_PAD cells of room on every side, no outline", () => {
    const m = measureText("Paris");
    const t = labelLayout("Paris", null);
    expect(t.w).toBe(m.w + 2 * LABEL_PAD);
    expect(t.chipW).toBe(0);
    expect(t.h).toBe(LABEL_PAD + Math.max(m.top, FONT_CAP) + FONT_DESCENT + LABEL_PAD);
    expect(t.baseline).toBe(LABEL_PAD + Math.max(m.top, FONT_CAP));
    expect(Number.isInteger(t.w) && Number.isInteger(t.h)).toBe(true);
  });
  it("the room below the text is the same whatever the text: the descender rows and LABEL_PAD, so the baseline is a fixed distance from the border", () => {
    for (const name of ["Paris", "Gyg", "Tromsø"]) {
      const t = labelLayout(name, null);
      expect(t.h - t.baseline, name).toBe(FONT_DESCENT + LABEL_PAD);
    }
    expect(LABEL_PAD).toBeGreaterThanOrEqual(2); // more than the 1 cell the first version had
  });
  it("a group's counter is a separate run, TEXT_GAP cells after the name, and the plate is as high as the name's", () => {
    const text = "Germany";
    const chip = chipText(10);
    const t = labelLayout(text, chip);
    expect(chip).toBe("10 entries");
    expect(t.chipX).toBe(LABEL_PAD + measureText(text).w + TEXT_GAP);
    expect(t.chipW).toBe(measureText(chip).w);
    expect(t.w).toBe(t.chipX + t.chipW + LABEL_PAD);
    expect(t.h).toBe(labelLayout(text, null).h);
    expect(TEXT_GAP).toBeGreaterThanOrEqual(4); // the two runs read as separate blocks
  });
  it("a longer counter (publication types and other stats later) only grows the plate to the right", () => {
    const short = labelLayout("Germany", chipText(10));
    const long = labelLayout("Germany", "10 entries, 3 articles, 2 projects");
    expect(long.chipX).toBe(short.chipX);
    expect(long.w).toBeGreaterThan(short.w);
    expect(long.h).toBe(short.h);
  });
  it("singular and plural", () => {
    expect(chipText(1)).toBe("1 entry");
    expect(chipText(2)).toBe("2 entries");
    expect(chipText(146)).toBe("146 entries");
  });
  it("the name is drawn as written: lowercase stays lowercase", () => {
    expect(measureText("minimum").w).toBeLessThanOrEqual(measureText("MINIMUM").w);
  });
});

describe("shorter ways of writing a label: the counter first, then the country, then an ellipsis, never below MIN_LABEL_CHARS", () => {
  it("a group's whole label comes first, then the name alone, then truncations, each narrower than the one before", () => {
    const v = labelVariants("Western Europe", chipText(6));
    expect(v[0]).toMatchObject({ text: "Western Europe", chip: "6 entries" });
    expect(v[1]).toMatchObject({ text: "Western Europe", chip: null });
    expect(v[2]!.text.endsWith("…")).toBe(true);
    for (let i = 1; i < v.length; i++) expect(v[i]!.layout.w).toBeLessThanOrEqual(v[i - 1]!.layout.w);
  });
  it("a truncation is always narrower than the whole name: the ellipsis is a wide glyph, so cutting a letter or two does not count", () => {
    const v = labelVariants("Moscow, Russia", null);
    expect(v[0]!.text).toBe("Moscow, Russia");
    for (const x of v.slice(1)) expect(x.layout.w).toBeLessThan(v[0]!.layout.w);
  });
  it("a place alone in its country can lose the country before it is truncated further", () => {
    const v = labelVariants("Bogotá, Colombia", null).map((x) => x.text);
    expect(v).toContain("Bogotá");
  });
  it("truncation keeps at least MIN_LABEL_CHARS characters, the ellipsis included, and a short name is never truncated", () => {
    const v = labelVariants("Ho Chi Minh City", null);
    const shortest = v[v.length - 1]!.text;
    expect(Array.from(shortest).length).toBe(MIN_LABEL_CHARS);
    for (const x of v) expect(Array.from(x.text).length).toBeGreaterThanOrEqual(MIN_LABEL_CHARS);
    expect(labelVariants("Paris", null).map((x) => x.text)).toEqual(["Paris"]);
    expect(labelVariants("Agadir", null).length).toBe(1);
  });
  it("a name is cut before a trailing comma or space: 'London,' never ends a truncation", () => {
    for (const x of labelVariants("London, United Kingdom", null)) expect(x.text).not.toMatch(/[,\s]…$/);
  });
});

describe("where a label can go (candidates)", () => {
  const grid = { cols: 400, rows: 300 };
  const rect = { c0: 100, r0: 100, c1: 160, r1: 150 };
  const w = 50;
  const h = 16;
  it("the first choice is above the box's top-left corner: flush on its top edge and its left edge", () => {
    const c = labelCandidates(rect, w, h, grid);
    expect(c[0]).toEqual({ id: SPOT.aboveLeft, x: 100, y: 100 - h, inside: false });
    expect(c[0]!.y + h).toBe(rect.r0); // the plate's last row is the row above the edge
  });
  it("candidates come in priority order and each is entirely on the grid", () => {
    const c = labelCandidates(rect, w, h, grid);
    for (let i = 1; i < c.length; i++) expect(c[i]!.id).toBeGreaterThan(c[i - 1]!.id);
    for (const s of c) expect(s.x >= 0 && s.y >= 0 && s.x + w <= grid.cols && s.y + h <= grid.rows, `${s.id}`).toBe(true);
    const ids = c.map((s) => s.id);
    for (const id of [SPOT.aboveLeft, SPOT.aboveRight, SPOT.belowLeft, SPOT.left, SPOT.right]) expect(ids, `${id}`).toContain(id);
    expect(ids.some((id) => id >= SPOT.aboveShift)).toBe(true);
  });
  it("a nested label is flush inside the outline, so its text is LABEL_PAD cells from the border on the top and on the left: the same room as above", () => {
    const big = { c0: 100, r0: 100, c1: 300, r1: 250 };
    const all = labelCandidates(big, w, h, grid);
    const tl = all.find((s) => s.id === SPOT.insideTopLeft)!;
    expect(tl.inside).toBe(true);
    expect(tl.x).toBe(big.c0 + 1);
    expect(tl.y).toBe(big.r0 + 1);
    const bl = all.find((s) => s.id === SPOT.insideBottomLeft)!;
    expect(bl.y + h).toBe(big.r1 - 1);
    // drawn: the first glyph column is LABEL_PAD cells from the border's inner side
    const layout = labelLayout("Bulgaria", null);
    const b = new PixelBuffer(60, 40);
    drawLabel(b, 1, 1, "Bulgaria", null, layout, 1, T, false);
    let minX = 99;
    for (let y = 0; y < 40; y++) for (let x = 0; x < 60; x++) if (b.get(x, y) === T.rest.name) minX = Math.min(minX, x);
    expect(minX - 1).toBe(LABEL_PAD);
  });
  it("a plate that does not fit inside the box is not nested, and one that would leave the grid is not offered", () => {
    const tiny = { c0: 100, r0: 100, c1: 112, r1: 112 };
    expect(labelCandidates(tiny, w, h, grid).some((s) => s.inside)).toBe(false);
    const top = { c0: 20, r0: 4, c1: 200, r1: 80 }; // no room above
    const ids = labelCandidates(top, w, h, grid).map((s) => s.id);
    expect(ids).not.toContain(SPOT.aboveLeft);
    expect(ids).toContain(SPOT.insideTopLeft);
  });
  it("a box with its left corner off the screen offers the visible part of its top edge", () => {
    const off = { c0: -50, r0: 100, c1: 150, r1: 200 };
    const c = labelCandidates(off, w, h, grid);
    expect(c.find((s) => s.id === SPOT.aboveLeft)).toBeUndefined();
    expect(c.find((s) => s.id === SPOT.aboveVisibleLeft)).toMatchObject({ x: 0, y: 100 - h });
  });
});

describe("boxes: palette levels for state, opacity for fades", () => {
  const rect = { c0: 1, r0: 1, c1: 8, r1: 6 };
  it("a selected box is one solid line one cell thick in the ink, nothing inside", () => {
    const b = new PixelBuffer(10, 8);
    drawBox(b, rect, T, { alpha: 1, fillAlpha: 0, solid: true, active: true });
    const k = INK.toString(36);
    expect(b.dump()).toEqual(["..........", `.${k.repeat(7)}..`, `.${k}.....${k}..`, `.${k}.....${k}..`, `.${k}.....${k}..`, `.${k.repeat(7)}..`, "..........", ".........."]);
  });
  it("a masked box (clamped to the minimum) has the PAGE colour inside a one-cell outline: it reads as an area, empty", () => {
    const b = new PixelBuffer(8, 6);
    drawBox(b, { c0: 1, r0: 1, c1: 7, r1: 5 }, T, { alpha: 1, fillAlpha: 1, solid: true, active: true });
    const k = INK.toString(36);
    expect(b.dump()).toEqual(["........", `.${k.repeat(6)}.`, `.${k}0000${k}.`, `.${k}0000${k}.`, `.${k.repeat(6)}.`, "........"]);
  });
  it("COLOUR is the state: at rest the outline is the peak level, hovered or focused the ink with the same dashes; selected adds the solid line", () => {
    const draw = (style: { active?: boolean; solid?: boolean }) => {
      const b = new PixelBuffer(62, 50);
      drawBox(b, { c0: 1, r0: 1, c1: 61, r1: 49 }, T, { alpha: 1, fillAlpha: 0, ...style });
      return b;
    };
    const rest = draw({});
    const hover = draw({ active: true });
    const selected = draw({ active: true, solid: true });
    const cells = (b: PixelBuffer) => {
      const lit: string[] = [];
      for (let y = 0; y < 50; y++) for (let x = 0; x < 62; x++) if (b.get(x, y) !== CLEAR) lit.push(`${x},${y}`);
      return lit;
    };
    expect(cells(hover)).toEqual(cells(rest)); // hover changes the colour only, not the stroke
    expect(cells(selected).length).toBeGreaterThan(cells(rest).length); // selection also changes the stroke
    for (const c of cells(rest)) {
      const [x, y] = c.split(",").map(Number);
      expect(rest.get(x!, y!)).toBe(PEAK);
      expect(hover.get(x!, y!)).toBe(INK);
      expect(selected.get(x!, y!)).toBe(INK);
    }
    expect(PEAK).toBeLessThan(INK); // lower elevation at rest
    expect(PEAK).toBe(10); // a level of the palette, not an opacity
  });
  it("at rest the four corners are solid and the rest of each edge is dashed, each edge counted from its own anchor", () => {
    const b = new PixelBuffer(60, 48);
    const w = 58;
    const h = 46;
    drawBox(b, { c0: 1, r0: 1, c1: 1 + w, r1: 1 + h }, T, { alpha: 1, fillAlpha: 0 });
    const k = PEAK.toString(36);
    const d = b.dump();
    const dash = dashingFor(w, h);
    const row = (n: number) => Array.from({ length: n }, (_, i) => (edgeLit(i, n, false, dash) ? k : ".")).join("");
    const rev = (s: string) => [...s].reverse().join("");
    expect(d[1]).toBe(`.${row(w)}.`); // top: counted from its left corner
    expect(d[h]).toBe(`.${rev(row(w))}.`); // bottom: counted from its right corner
    expect(d.slice(1, 1 + h).map((r) => r[1]).join("")).toBe(row(h)); // left: from its top
    expect(d.slice(1, 1 + h).map((r) => r[w]).join("")).toBe(rev(row(h))); // right: from its bottom
    for (const [x, y] of [[1, 1], [w, 1], [1, h], [w, h]] as const) expect(b.get(x, y)).toBe(PEAK);
    for (let i = 0; i < dash.arm; i++) expect(b.get(1 + i, 1)).toBe(PEAK);
    expect(b.get(1 + dash.arm, 1)).toBe(CLEAR); // the first gap starts right after the arm
    expect(row(w)).toContain("."); // not a solid line
  });
  it("a dash is DASH_ON cells lit then `gap` dark, counted from the end of an arm, with an arm at the far end", () => {
    const n = 100;
    const { arm, gap } = dashingFor(n, n);
    const cells = Array.from({ length: n }, (_, i) => edgeLit(i, n, false));
    for (let i = 0; i < arm; i++) expect(cells[i]).toBe(true);
    for (let i = arm; i < arm + gap; i++) expect(cells[i]).toBe(false);
    for (let i = arm + gap; i < arm + gap + BOX_STYLE.dashOn; i++) expect(cells[i]).toBe(true);
    expect(cells[arm + gap + BOX_STYLE.dashOn]).toBe(false);
    for (let i = n - arm; i < n; i++) expect(cells[i]).toBe(true);
  });
  it("DASH ORIGIN: the pattern is anchored to the edge's start: resizing by 1..N cells changes only the far end", () => {
    const dash = { arm: 6, gap: 3 };
    for (const n of [30, 41, 60, 97]) {
      const a = Array.from({ length: n }, (_, i) => edgeLit(i, n, false, dash));
      for (let k = 1; k <= 12; k++) {
        const b = Array.from({ length: n + k }, (_, i) => edgeLit(i, n + k, false, dash));
        for (let i = 0; i < n - dash.arm; i++) expect(b[i], `n=${n} +${k} i=${i}`).toBe(a[i]); // the dashes do not slide
      }
    }
  });
  it("drawn: top and left keep their dashes when the box grows from its bottom-right, bottom and right when it grows from its top-left", () => {
    const draw = (c0: number, r0: number, c1: number, r1: number) => {
      const b = new PixelBuffer(130, 140);
      drawBox(b, { c0, r0, c1, r1 }, T, { alpha: 1, fillAlpha: 0 });
      return b;
    };
    // sizes inside one band of dashingFor (the same arm and gap): the smaller side is 56..64
    const dash = dashingFor(56, 100);
    for (const s of [56, 60, 64]) expect(dashingFor(s, 100)).toEqual(dash);
    const base = draw(5, 5, 5 + 56, 5 + 100);
    for (let k = 1; k <= 8; k++) {
      const wider = draw(5, 5, 5 + 56 + k, 5 + 100); // the right edge moves: the top edge's near part stays
      for (let x = 5; x < 5 + 56 - dash.arm; x++) expect(wider.get(x, 5), `top x=${x} +${k}`).toBe(base.get(x, 5));
      const left = draw(5 - k, 5, 5 + 56, 5 + 100); // the left edge moves: the bottom edge, anchored at its right corner, keeps its dashes
      for (let x = 5 + 55; x >= 5 + dash.arm; x--) expect(left.get(x, 5 + 99), `bottom x=${x} -${k}`).toBe(base.get(x, 5 + 99));
      const taller = draw(5, 5, 5 + 56, 5 + 100 + k); // the bottom moves: the left edge, anchored at its top, keeps its dashes
      for (let y = 5; y < 5 + 100 - dash.arm; y++) expect(taller.get(5, y), `left y=${y} +${k}`).toBe(base.get(5, y));
      const higher = draw(5, 5 - k, 5 + 56, 5 + 100); // the top moves: the right edge, anchored at its bottom, keeps its dashes
      for (let y = 5 + 99; y >= 5 + dash.arm; y--) expect(higher.get(5 + 55, y), `right y=${y} -${k}`).toBe(base.get(5 + 55, y));
    }
  });
  it("the whole outline is rotationally symmetric: turned half a turn it is the same", () => {
    for (const [w, h] of [[58, 46], [40, 90], [23, 31], [9, 9], [120, 70]] as const) {
      const b = new PixelBuffer(w + 2, h + 2);
      drawBox(b, { c0: 1, r0: 1, c1: 1 + w, r1: 1 + h }, T, { alpha: 1, fillAlpha: 0 });
      const d = b.dump();
      const turned = [...d].reverse().map((r) => [...r].reverse().join(""));
      expect(turned, `${w}x${h}`).toEqual(d);
    }
  });
  it("a big box has longer arms and scarcer dashes than a small one; both stay within their limits", () => {
    const sizes = [9, 12, 20, 40, 80, 160, 400, 1000];
    const out = sizes.map((s) => dashingFor(s, s));
    for (let i = 1; i < out.length; i++) {
      expect(out[i]!.arm).toBeGreaterThanOrEqual(out[i - 1]!.arm);
      expect(out[i]!.gap).toBeGreaterThanOrEqual(out[i - 1]!.gap);
    }
    expect(out[out.length - 1]!.arm).toBeGreaterThan(out[0]!.arm);
    for (const { arm, gap } of out) {
      expect(arm).toBeGreaterThanOrEqual(BOX_STYLE.arm.min);
      expect(arm).toBeLessThanOrEqual(BOX_STYLE.arm.max);
      expect(gap).toBeGreaterThanOrEqual(BOX_STYLE.gap.min);
      expect(gap).toBeLessThanOrEqual(BOX_STYLE.gap.max);
    }
    const big = dashingFor(300, 300);
    expect(big.arm).toBeGreaterThanOrEqual(12);
    let lit = 0;
    for (let i = 0; i < 300; i++) if (edgeLit(i, 300, false)) lit++;
    expect(lit - 2 * big.arm).toBeLessThan(0.3 * 300);
  });
  it("a tiny box never has overflowing or overlapping arms: it degrades to a plain solid outline", () => {
    for (let n = 1; n <= 7; n++) expect(Array.from({ length: n }, (_, i) => edgeLit(i, n, false)).every(Boolean), `n=${n}`).toBe(true);
    for (let n = 1; n <= 400; n++) {
      const { arm, gap } = dashingFor(n, n);
      const lit = Array.from({ length: n }, (_, i) => edgeLit(i, n, false));
      if (!lit.every(Boolean)) expect(n).toBeGreaterThanOrEqual(2 * arm + gap);
    }
    expect(dashingFor(400, 12)).toEqual(dashingFor(12, 12));
    const b = new PixelBuffer(9, 9);
    drawBox(b, { c0: 1, r0: 1, c1: 8, r1: 8 }, T, { alpha: 1, fillAlpha: 0 });
    for (let i = 1; i < 8; i++) for (const [x, y] of [[i, 1], [i, 7], [1, i], [7, i]] as const) expect(b.get(x, y)).toBe(PEAK);
  });
  it("the selected box is one uninterrupted line, one cell thick: no ring, no doubling", () => {
    const b = new PixelBuffer(12, 10);
    drawBox(b, { c0: 1, r0: 1, c1: 11, r1: 9 }, T, { alpha: 1, fillAlpha: 1, solid: true, active: true });
    const k = INK.toString(36);
    const d = b.dump();
    expect(d[1]).toBe(`.${k.repeat(10)}.`);
    expect(d[2]).toBe(`.${k}${"0".repeat(8)}${k}.`);
    expect(d[8]).toBe(`.${k.repeat(10)}.`);
    for (let y = 1; y < 9; y++) {
      expect(d[y]![1]).toBe(k);
      expect(d[y]![10]).toBe(k);
    }
  });
  it("a fade is opacity, not shade: every outline cell is one level at the node's alpha, whatever the alpha", () => {
    for (const a of [1 / 64, 0.1, 0.25, 0.5, 0.9, 1]) {
      const b = new PixelBuffer(10, 8);
      b.setRamp(RAMP);
      drawBox(b, rect, T, { alpha: a, fillAlpha: a, solid: true });
      let cells = 0;
      for (let y = 0; y < 8; y++)
        for (let x = 0; x < 10; x++) {
          const level = b.get(x, y);
          if (level === CLEAR) continue;
          cells++;
          const outline = x === 1 || x === 7 || y === 1 || y === 5;
          expect(level, `${x},${y} at ${a}`).toBe(outline ? PEAK : 0);
          expect(b.alphaAt(x, y)).toBeCloseTo(a, 2);
        }
      expect(cells).toBe(7 * 5);
    }
  });
  it("the mask stops at the outline: outline cells are composited over the map alone, interior cells over the map alone", () => {
    const b = new PixelBuffer(10, 8);
    drawBox(b, rect, T, { alpha: 0.5, fillAlpha: 0.5, solid: true });
    expect(b.alphaAt(1, 1)).toBeCloseTo(0.5, 2);
    expect(b.alphaAt(4, 3)).toBeCloseTo(0.5, 2);
  });
  it("the alpha is quantised to 1/ALPHA_STEPS", () => {
    expect(quantAlpha(0)).toBe(0);
    expect(quantAlpha(1)).toBe(1);
    expect(quantAlpha(0.5)).toBe(0.5);
    expect(quantAlpha(1.2)).toBe(1);
    expect(quantAlpha(0.3) * ALPHA_STEPS).toBeCloseTo(Math.round(0.3 * ALPHA_STEPS), 9);
  });
});

describe("tones: palette levels, AA text, a counter below the name", () => {
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const lum = (c: readonly number[]) => 0.2126 * lin(c[0]!) + 0.7152 * lin(c[1]!) + 0.0722 * lin(c[2]!);
  const contrast = (a: readonly number[], b: readonly number[]) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
  for (const [name, bg, fg] of [["light", [0.984, 0.984, 0.984], [0.039, 0.039, 0.039]], ["dark", [0.039, 0.039, 0.039], [0.961, 0.961, 0.961]]] as const) {
    it(`${name}: every state's text and outline are AA / 3:1 over the page, rest is lower than active, the counter is below the name`, () => {
      const ramp = buildRamp(bg as unknown as [number, number, number], fg as unknown as [number, number, number]);
      const tones = labelTones(ramp.length, textFloorLevel(ramp));
      for (const tone of [tones.rest, tones.active]) {
        expect(contrast(ramp[tone.name]!, ramp[0]!)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(ramp[tone.count]!, ramp[0]!)).toBeGreaterThanOrEqual(4.5); // the counter is text too
        expect(contrast(ramp[tone.box]!, ramp[0]!)).toBeGreaterThanOrEqual(3);
        expect(tone.count).toBeLessThanOrEqual(tone.name);
      }
      expect(tones.rest.box).toBeLessThan(tones.active.box);
      expect(tones.rest.name).toBeLessThan(tones.active.name);
      expect(tones.active.count).toBeLessThan(tones.active.name); // dimmer than the name
      expect(tones.rest.name).toBe(tones.rest.box); // the label follows the box
      expect(tones.active.name).toBe(tones.active.box);
    });
  }
});

describe("labels: one weight, a dimmer counter", () => {
  const draw = (name: string, chip: string | null, alpha = 1, active = false) => {
    const layout = labelLayout(name, chip);
    const buf = new PixelBuffer(layout.w + 6, layout.h + 4);
    drawLabel(buf, 3, 2, name, chip, layout, alpha, T, active);
    return { buf, layout };
  };
  it("the plate is the page colour, exactly the plate's cells, no outline of any kind", () => {
    const { buf, layout } = draw("Paris", null);
    for (let y = 0; y < buf.rows; y++)
      for (let x = 0; x < buf.cols; x++) {
        const inside = x >= 3 && y >= 2 && x < 3 + layout.w && y < 2 + layout.h;
        expect(buf.get(x, y) === CLEAR, `${x},${y}`).toBe(!inside);
      }
    expect(buf.get(3, 2)).toBe(0);
  });
  it("the text is centred in its plate: LABEL_PAD clear cells on the left, on the right and above the capitals", () => {
    const { buf, layout } = draw("Paris", null);
    let minX = 99;
    let maxX = -1;
    let minY = 99;
    for (let y = 2; y < 2 + layout.h; y++)
      for (let x = 3; x < 3 + layout.w; x++)
        if (buf.get(x, y) === T.rest.name) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
        }
    expect(minX - 3).toBe(LABEL_PAD);
    expect(3 + layout.w - 1 - maxX).toBe(LABEL_PAD);
    expect(minY - 2).toBe(LABEL_PAD);
  });
  it("the counter is a level below the name where the AA floor allows (else the same); active: the ink and the peak", () => {
    const tones = labelTones(12, 9);
    expect(tones.rest.count).toBe(tones.rest.name - 1);
    const l = labelLayout("Germany", chipText(10));
    const b = new PixelBuffer(120, 30);
    drawLabel(b, 0, 0, "Germany", chipText(10), l, 1, tones, false);
    const seen = new Set<number>();
    for (let y = 0; y < 30; y++) for (let x = 0; x < 120; x++) seen.add(b.get(x, y));
    expect(seen.has(tones.rest.name)).toBe(true);
    expect(seen.has(tones.rest.count)).toBe(true);
    const act = draw("Germany", chipText(10), 1, true).buf;
    const levels = new Set<number>();
    for (let y = 0; y < act.rows; y++) for (let x = 0; x < act.cols; x++) levels.add(act.get(x, y));
    expect(levels.has(T.active.name)).toBe(true);
    expect(levels.has(T.active.count)).toBe(true);
    expect(T.active.count).toBeLessThan(T.active.name);
  });
  it("the counter has no plate of its own: the gap between the runs is the page-colour plate, TEXT_GAP cells wide", () => {
    const text = "Germany";
    const { buf, layout } = draw(text, chipText(10));
    const nameEnd = 3 + LABEL_PAD + layout.textW;
    for (let x = nameEnd; x < nameEnd + TEXT_GAP; x++) for (let y = 2; y < 2 + layout.h; y++) expect(buf.get(x, y), `${x},${y}`).toBe(0);
    let first = -1;
    for (let x = nameEnd; x < buf.cols && first < 0; x++) for (let y = 2; y < 2 + layout.h; y++) if (buf.get(x, y) === T.rest.count) first = x;
    expect(first - 3).toBeGreaterThanOrEqual(layout.chipX);
    expect(first - 3).toBeLessThanOrEqual(layout.chipX + 2);
  });
  it("the name and the counter share one baseline", () => {
    const { buf, layout } = draw("Ill", chipText(2));
    const lastRow = 2 + layout.baseline - 1;
    let lastName = -1;
    let lastCount = -1;
    for (let yy = 2; yy < 2 + layout.h; yy++)
      for (let xx = 3; xx < buf.cols; xx++) {
        if (buf.get(xx, yy) === T.rest.count && xx >= 3 + layout.chipX) lastCount = Math.max(lastCount, yy);
        if (buf.get(xx, yy) === T.rest.name && xx < 3 + layout.chipX) lastName = Math.max(lastName, yy);
      }
    expect(lastCount).toBe(lastRow);
    expect(lastName).toBe(lastRow);
  });
  it("fades with opacity: plate and text are at the node's alpha, in page colour and palette levels, never another level", () => {
    for (const a of [1 / 64, 0.3, 0.7]) {
      const { buf, layout } = draw("Nikšić", chipText(3), a);
      buf.setRamp(RAMP);
      for (let y = 2; y < 2 + layout.h; y++)
        for (let x = 3; x < 3 + layout.w; x++) {
          const cell = buf.get(x, y);
          expect([0, T.rest.name, T.rest.count, MIXED]).toContain(cell);
          expect(buf.alphaAt(x, y)).toBeGreaterThanOrEqual(a - 0.01);
        }
    }
  });
  it("only palette levels are ever drawn at full opacity (no grey between)", () => {
    const { buf } = draw("Nikšić", chipText(3));
    for (let y = 0; y < buf.rows; y++) for (let x = 0; x < buf.cols; x++) expect([0, T.rest.name, T.rest.count, CLEAR]).toContain(buf.get(x, y));
  });
});

describe("the art-pixel lattice: plates sit on the grid of the box they are anchored to", () => {
  const grid = { cols: 800, rows: 600 };
  const cell = 2.5;
  const lat = { cell, ox: -1, oy: -2 };
  const on = (v: number, o: number) => Math.abs((v - o) / cell - Math.round((v - o) / cell)) < 1e-9;
  it("snapToLattice: to the nearest point, or down when asked, from the origin of the grid (not of the page)", () => {
    expect(snapToLattice(10.9, -1, 2.5)).toBe(11.5);
    expect(snapToLattice(10.9, -1, 2.5, true)).toBe(9);
    expect(snapToLattice(9, -1, 2.5, true)).toBe(9); // already on it: not pushed down by float noise
    expect(snapToLattice(-1, -1, 2.5)).toBe(-1);
  });
  it("every candidate of a box of whole cells is a lattice point, whatever the size of the plate", () => {
    const rect = { c0: -1 + 40 * cell, r0: -2 + 30 * cell, c1: -1 + 60 * cell, r1: -2 + 50 * cell };
    for (const [w, h] of [[83.5, 38], [61, 24], [120.5, 25]] as const) {
      const spots = labelCandidates(rect, w, h, grid, { inset: 5, quant: cell, gap: 2.5, bleed: 0, lattice: lat });
      expect(spots.length).toBeGreaterThan(4);
      for (const s of spots) {
        expect(on(s.x, lat.ox)).toBe(true);
        expect(on(s.y, lat.oy)).toBe(true);
      }
    }
  });
  it("a plate above or beside its box is rounded away from it: the clear room is the gap or up to a cell more, never less", () => {
    const rect = { c0: -1 + 40 * cell, r0: -2 + 30 * cell, c1: -1 + 60 * cell, r1: -2 + 50 * cell };
    const out = { x: 0, y: 0, inside: false };
    for (const h of [24, 25, 38, 39.5]) {
      expect(spotAt(SPOT.aboveLeft, rect, 80, h, grid, { gap: 2.5, lattice: lat }, out)).toBe(true);
      const room = rect.r0 - (out.y + h);
      expect(room).toBeGreaterThanOrEqual(2.5 - 1e-9);
      expect(room).toBeLessThan(2.5 + cell);
    }
    for (const w of [60, 61.5, 83]) {
      expect(spotAt(SPOT.left, rect, w, 24, grid, { gap: 2.5, lattice: lat }, out)).toBe(true);
      const room = rect.c0 - (out.x + w);
      expect(room).toBeGreaterThanOrEqual(2.5 - 1e-9);
      expect(room).toBeLessThan(2.5 + cell);
    }
  });
  it("a position that slides along its box at the screen's edge stays on the lattice and on the screen", () => {
    // a box whose right part is off the screen: the right-aligned plate is pulled back inside by whole cells
    const rect = { c0: 790, r0: 200, c1: 840, r1: 240 };
    const out = { x: 0, y: 0, inside: false };
    expect(spotAt(SPOT.aboveRight, rect, 83.5, 24, grid, { gap: 2.5, lattice: lat, slide: true }, out)).toBe(true);
    expect(on(out.x, lat.ox)).toBe(true);
    expect(out.x + 83.5).toBeLessThanOrEqual(grid.cols);
    expect(out.x).toBeGreaterThan(grid.cols - 83.5 - cell - 1e-9); // as far right as the lattice allows
  });
  it("without a lattice the positions are exact (the pixel text, other callers)", () => {
    const out = { x: 0, y: 0, inside: false };
    expect(spotAt(SPOT.aboveLeft, { c0: 101, r0: 203.3, c1: 140, r1: 240 }, 80, 24, grid, { gap: 3 }, out)).toBe(true);
    expect(out).toMatchObject({ x: 101, y: 203.3 - 24 - 3 });
  });
});

describe("a box opens from a closed rectangle into corners and dashes as it grows (2026-10-13)", () => {
  const FLOOR = 12.5; // 5 cells at 2.5 px
  /** The drawn outline of an `n x n` box at openness `open`: the cells that are lit. */
  const lit = (n: number, open: number) => {
    const b = new PixelBuffer(n + 2, n + 2);
    drawBox(b, { c0: 1, r0: 1, c1: n + 1, r1: n + 1 }, T, { alpha: 1, fillAlpha: 0, open });
    let k = 0;
    for (let y = 0; y < n + 2; y++) for (let x = 0; x < n + 2; x++) if (b.get(x, y) === PEAK) k++;
    return { k, b };
  };
  it("boxOpenness: 0 at the floor (and under it), 1 from twice the floor, a straight line between, monotone and continuous", () => {
    expect(boxOpenness(FLOOR, FLOOR)).toBe(0);
    expect(boxOpenness(FLOOR * 0.4, FLOOR)).toBe(0);
    expect(boxOpenness(FLOOR * 2, FLOOR)).toBe(1);
    expect(boxOpenness(FLOOR * 9, FLOOR)).toBe(1);
    expect(boxOpenness(FLOOR * 1.5, FLOOR)).toBeCloseTo(0.5, 12);
    let prev = 0;
    for (let px = 0; px <= 60; px += 0.05) {
      const o = boxOpenness(px, FLOOR);
      expect(o).toBeGreaterThanOrEqual(prev);
      expect(o - prev).toBeLessThan(0.01); // 0.05 px of size: continuous, no jump
      prev = o;
    }
    expect(boxOpenness(NaN, FLOOR)).toBe(1); // (no measure: the full look)
    expect(boxOpenness(20, 0)).toBe(1);
  });
  it("dashingFor: the gap is 0 at openness 0 and non-decreasing in it, whole cells, up to the full look; the full look is what it was", () => {
    for (let n = 5; n <= 60; n++) {
      const full = dashingFor(n, n);
      expect(dashingFor(n, n, 1)).toEqual(full);
      expect(dashingFor(n, n, 0).gap).toBe(0);
      let prev = 0;
      for (let o = 0; o <= 1.0001; o += 0.01) {
        const d = dashingFor(n, n, o);
        expect(Number.isInteger(d.gap) && Number.isInteger(d.arm)).toBe(true);
        expect(d.gap).toBeGreaterThanOrEqual(prev);
        expect(d.gap - prev).toBeLessThanOrEqual(1); // a cell at a time
        expect(d.arm).toBe(full.arm);
        prev = d.gap;
      }
      expect(prev).toBe(full.gap);
    }
  });
  it("at openness 0 the outline is a plain closed rectangle: every cell of the ring is lit, at every size, also for a strip", () => {
    for (const [w, h] of [[5, 5], [6, 5], [9, 9], [30, 5], [5, 30], [14, 14]] as const) {
      const b = new PixelBuffer(w + 2, h + 2);
      drawBox(b, { c0: 1, r0: 1, c1: w + 1, r1: h + 1 }, T, { alpha: 1, fillAlpha: 0, open: 0 });
      let ring = 0;
      for (let y = 0; y < h + 2; y++) for (let x = 0; x < w + 2; x++) {
        const onRing = x >= 1 && x <= w && y >= 1 && y <= h && (x === 1 || x === w || y === 1 || y === h);
        expect(b.get(x, y) === PEAK, `${w}x${h} (${x},${y})`).toBe(onRing);
        if (onRing) ring++;
      }
      expect(ring).toBe(2 * (w + h) - 4);
    }
  });
  it("growing from the floor to the full look takes the outline from the whole ring to corners and dashes, a cell or two at a time, never back: the lit cells only decrease by the notches, and there is no pop", () => {
    // a box that grows from 5 to 14 cells, openness from its size as the scene does: 5 cells = the floor, 10 = fully open
    let prevLit = Infinity;
    let prevGap = 0;
    const gaps: number[] = [];
    for (let n = 5; n <= 14; n++) {
      const o = boxOpenness(n * 2.5, FLOOR);
      const d = dashingFor(n, n, o);
      expect(d.gap).toBeGreaterThanOrEqual(prevGap);
      gaps.push(d.gap);
      prevGap = d.gap;
      const ring = 4 * n - 4;
      const { k } = lit(n, o);
      expect(k).toBeLessThanOrEqual(ring);
      // the box is closed at the floor
      if (n === 5) expect(k).toBe(ring);
      // fully open from 10 cells: corners and dashes, so some of the ring is dark
      if (n >= 10) expect(k).toBeLessThan(ring);
      // no pop: lit cells never increase by more than the cells the growth itself adds (4) once the box is open
      if (Number.isFinite(prevLit) && n > 5) expect(k - prevLit).toBeLessThanOrEqual(4);
      prevLit = k;
    }
    expect(gaps[0]).toBe(0);
    expect(gaps[gaps.length - 1]).toBe(dashingFor(14, 14).gap);
  });
  it("selected is one solid line at every openness (the card at the floor is a plain rectangle too)", () => {
    for (const open of [0, 0.3, 1]) {
      const b = new PixelBuffer(9, 9);
      drawBox(b, { c0: 1, r0: 1, c1: 8, r1: 8 }, T, { alpha: 1, fillAlpha: 0, solid: true, active: true, open });
      for (let i = 1; i < 8; i++) for (const [x, y] of [[i, 1], [i, 7], [1, i], [7, i]] as const) expect(b.get(x, y)).toBe(INK);
    }
  });
});

describe("the text is flush with the box's edge when the label is not selected; the selected card is flush with the box (bleed, selectedShift)", () => {
  const rect = { c0: 100.4, r0: 200.3, c1: 160.9, r1: 240.6 };
  const W = 84;
  const H = 38;
  const grid = { cols: 1000, rows: 800 };
  const U = { gap: 5.5, bleed: 6, bleedY: 3, quant: 0, inset: 5.5 };
  const PAD_X = 6;
  const PAD_Y = 3;
  const at = (id: number, units = U) => {
    const o = { x: 0, y: 0, inside: false };
    expect(spotAt(id, rect, W, H, grid, units, o), `spot ${id}`).toBe(true);
    return o;
  };
  it("above and below, left-aligned: the text's left edge is the box's left edge, whatever the box's position", () => {
    for (const id of [SPOT.aboveLeft, SPOT.belowLeft]) expect(at(id).x + PAD_X, `${id}`).toBeCloseTo(rect.c0, 9);
  });
  it("above and below, right-aligned: the text's right edge is the box's right edge", () => {
    for (const id of [SPOT.aboveRight, SPOT.belowRight]) expect(at(id).x + W - PAD_X, `${id}`).toBeCloseTo(rect.c1, 9);
  });
  it("beside the box the text's top line is on the box's top edge (the plate's padding hangs above it)", () => {
    for (const id of [SPOT.left, SPOT.right]) expect(at(id).y + PAD_Y, `${id}`).toBeCloseTo(rect.r0, 9);
  });
  it("the vertical room to the box is untouched by the alignment: the same gap above and below", () => {
    expect(rect.r0 - (at(SPOT.aboveLeft).y + H)).toBeCloseTo(U.gap, 9);
    expect(at(SPOT.belowLeft).y - rect.r1).toBeCloseTo(U.gap, 9);
  });
  it("nested and shifted positions have no edge to align with: they do not bleed (nested stays inside the outline)", () => {
    const big = { c0: 100.4, r0: 200.3, c1: 260.9, r1: 300.6 };
    const o = { x: 0, y: 0, inside: false };
    expect(spotAt(SPOT.insideTopLeft, big, W, H, grid, U, o)).toBe(true);
    expect(o.inside).toBe(true);
    expect(o.x).toBeCloseTo(big.c0 + U.inset, 9);
    expect(o.y).toBeCloseTo(big.r0 + U.inset, 9);
  });
  it("selectedShift moves the plate to be flush with the box: left-aligned slots right by the bleed, right-aligned left, beside slots down; others stay", () => {
    for (const id of [SPOT.aboveLeft, SPOT.aboveVisibleLeft, SPOT.belowLeft]) expect(selectedShift(id, 6, 3)).toEqual({ dx: 6, dy: 0 });
    for (const id of [SPOT.aboveRight, SPOT.aboveVisibleRight, SPOT.belowRight]) expect(selectedShift(id, 6, 3)).toEqual({ dx: -6, dy: 0 });
    for (const id of [SPOT.left, SPOT.right]) expect(selectedShift(id, 6, 3)).toEqual({ dx: 0, dy: 3 });
    for (const id of [SPOT.insideTopLeft, SPOT.insideBottomRight, SPOT.aboveShift, SPOT.belowShift + 1]) expect(selectedShift(id, 6, 3)).toEqual({ dx: 0, dy: 0 });
    // the card: plate edge on the box edge
    expect(at(SPOT.aboveLeft).x + selectedShift(SPOT.aboveLeft, 6, 3).dx).toBeCloseTo(rect.c0, 9);
    expect(at(SPOT.aboveRight).x + W + selectedShift(SPOT.aboveRight, 6, 3).dx).toBeCloseTo(rect.c1, 9);
    expect(at(SPOT.right).y + selectedShift(SPOT.right, 6, 3).dy).toBeCloseTo(rect.r0, 9);
  });
  it("a plate whose hanging padding would leave the screen stays on it (a box at the left edge): the text is then up to the bleed from the edge", () => {
    const edge = { c0: 2, r0: 100, c1: 50, r1: 130 };
    const o = { x: 0, y: 0, inside: false };
    expect(spotAt(SPOT.aboveLeft, edge, W, H, grid, U, o)).toBe(true);
    expect(o.x).toBeGreaterThanOrEqual(0);
    const right = { c0: 950, r0: 100, c1: 998, r1: 130 };
    expect(spotAt(SPOT.aboveRight, right, W, H, grid, U, o)).toBe(true);
    expect(o.x + W).toBeLessThanOrEqual(grid.cols);
  });
});
