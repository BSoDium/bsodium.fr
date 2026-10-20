/**
 * The way a leg was travelled, as a small picture on its path (paths/trail-dots-layer.ts): 1-bit sprites on the art grid, 9 x 7 cells, in
 * the same pixel hand as the boxes and the type. `#` is ink, `.` is the plate's page colour showing through. One per mode; `unknown` has none (the
 * map does not say what it does not know). The picture is the redundant half of the mode (the line's pattern is the other): neither carries it alone.
 */
import type { LegMode } from "./modes";

export const ICON_W = 9;
export const ICON_H = 7;

export const MODE_ICONS: Record<LegMode, readonly string[] | null> = {
  // a plane from above, nose to the right
  flight: ["...#.....", "...##....", "#..####..", "#########", "#..####..", "...##....", "...#....."],
  // a train from the front: roof, windscreen, lamps, the rail under it
  rail: ["..#####..", ".#.....#.", ".#.###.#.", ".#.....#.", ".#######.", "..#...#..", "#########"],
  // a bus from the side: windows, wheels
  road: ["#########", "#.#.#.#.#", "#########", "#########", "#########", ".##...##.", ".##...##."],
  // a boat: sail, hull, water
  ferry: ["....#....", "...##....", "..###....", ".####....", "#########", ".#######.", "..#####.."],
  // a walker
  walk: ["...##....", "...##....", "..####...", ".#.##.#..", "...##....", "..#..#...", ".#....#.."],
  unknown: null,
};
