import { describe, expect, it } from "vitest";
import { ICON_H, ICON_W, MODE_ICONS } from "./mode-icons";
import { LEG_MODES } from "./modes";
import { legCells } from "./trail-dots";

const view = { cols: 500, rows: 500 };
const line = (n: number): Array<Array<readonly [number, number]>> => [[[10, 10], [10 + n, 10]]];

describe("legCells: the patterns written cell by cell", () => {
  it("a road has no cells here (MapLibre draws it)", () => {
    expect(legCells(line(100), "road", view)).toEqual([]);
  });
  it("a flight is a dot every `period` cells along the path, exactly one cell each", () => {
    const cells = legCells(line(100), "flight", view);
    expect(cells.map((c) => c.col)).toEqual(Array.from({ length: 21 }, (_, i) => 10 + i * 5).filter((c) => c <= 110));
    expect(new Set(cells.map((c) => c.row))).toEqual(new Set([10]));
  });
  it("a rail is dashes of 4 on 2 off with a 3-cell cross-tick in the middle of each, until the ticks are asked off", () => {
    const withTicks = legCells(line(60), "rail", view);
    const without = legCells(line(60), "rail", view, 3, false);
    expect(without.every((c) => c.row === 10)).toBe(true);
    expect(withTicks.length).toBeGreaterThan(without.length);
    expect(withTicks.some((c) => c.row === 9) && withTicks.some((c) => c.row === 11)).toBe(true);
  });
  it("gives the band of the position along the leg: the tail is band 0, the head the last", () => {
    const cells = legCells(line(100), "flight", view);
    expect(cells[0]!.band).toBe(0);
    expect(cells[cells.length - 1]!.band).toBe(4);
  });
  it("skips what is off screen without moving the pattern", () => {
    const all = legCells(line(400), "flight", { cols: 600, rows: 600 });
    const some = legCells([[[10, 10], [410, 10]]], "flight", { cols: 100, rows: 100 }, 0);
    expect(some.every((c) => c.col <= 100)).toBe(true);
    expect(some.map((c) => c.col)).toEqual(all.filter((c) => c.col <= 100).map((c) => c.col));
  });
});

describe("the pictures of the modes", () => {
  it("are 9 x 7 cells of # and ., one per mode but unknown", () => {
    for (const mode of LEG_MODES) {
      const icon = MODE_ICONS[mode];
      if (mode === "unknown") {
        expect(icon).toBeNull();
        continue;
      }
      expect(icon, mode).toHaveLength(ICON_H);
      for (const row of icon!) expect(row, mode).toMatch(new RegExp(`^[#.]{${ICON_W}}$`));
    }
  });
  it("are different from each other", () => {
    const seen = new Set(LEG_MODES.filter((m) => MODE_ICONS[m]).map((m) => MODE_ICONS[m]!.join("|")));
    expect(seen.size).toBe(LEG_MODES.length - 1);
  });
});
