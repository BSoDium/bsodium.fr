import { describe, expect, it } from "vitest";
import { GESTURE_GUARD_CAP_MS, GESTURE_GUARD_MS, GestureGuard } from "./gesture-guard";

describe("GestureGuard: when the header a gesture brought takes the pointer again", () => {
  it("waits the guard after the header appears when no pointer is down", () => {
    const g = new GestureGuard();
    expect(g.mayRelease(1000, 1000 + GESTURE_GUARD_MS - 1)).toBe(false);
    expect(g.mayRelease(1000, 1000 + GESTURE_GUARD_MS)).toBe(true);
  });

  it("waits for the pointer that is down, then the guard after it goes up", () => {
    const g = new GestureGuard();
    g.pointerDown(1);
    expect(g.mayRelease(1000, 1600)).toBe(false);
    g.pointerUp(1, 1700);
    expect(g.mayRelease(1000, 1700 + GESTURE_GUARD_MS - 1)).toBe(false);
    expect(g.mayRelease(1000, 1700 + GESTURE_GUARD_MS)).toBe(true);
  });

  it("is hard-capped: a pointerup that never came (a context menu took it) does not leave the header inert", () => {
    const g = new GestureGuard();
    g.pointerDown(7);
    expect(g.mayRelease(1000, 1000 + GESTURE_GUARD_CAP_MS - 1)).toBe(false);
    expect(g.mayRelease(1000, 1000 + GESTURE_GUARD_CAP_MS)).toBe(true);
    expect(GESTURE_GUARD_CAP_MS).toBeLessThanOrEqual(2000);
    expect(GESTURE_GUARD_CAP_MS).toBeGreaterThan(GESTURE_GUARD_MS);
  });

  it("forgets the pointers on blur or a hidden tab, and then waits the guard from there", () => {
    const g = new GestureGuard();
    g.pointerDown(3);
    g.pointerDown(4);
    expect(g.pointersDown).toBe(2);
    g.reset(1200);
    expect(g.pointersDown).toBe(0);
    expect(g.mayRelease(1000, 1200 + GESTURE_GUARD_MS - 1)).toBe(false);
    expect(g.mayRelease(1000, 1200 + GESTURE_GUARD_MS)).toBe(true);
  });

  it("tracks pointers by id: a second finger holds it, an unknown pointerup does not release another", () => {
    const g = new GestureGuard();
    g.pointerDown(1);
    g.pointerDown(2);
    g.pointerUp(1, 1100);
    expect(g.mayRelease(1000, 1400)).toBe(false); // still one down, inside the cap
    g.pointerUp(9, 1150);
    expect(g.pointersDown).toBe(1);
    g.pointerUp(2, 1200);
    expect(g.mayRelease(1000, 1200 + GESTURE_GUARD_MS)).toBe(true);
  });
});
