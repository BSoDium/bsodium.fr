/**
 * When the header that a gesture brought may take the pointer again (components/navbar.tsx `useGestureGuard`): pure, with the clock passed in, so
 * that it is tested (`gesture-guard.test.ts`).
 *
 * The guard ends `guardMs` after the last pointer has gone up (or after the header appeared, when none was down), and never later than `capMs`
 * after the header appeared: a pointer that was never reported up (a context menu took the pointerup, the window lost the focus in the middle of
 * a press) must not leave the header inert for good. Pointers are tracked by id and forgotten on `reset` (blur, a hidden tab).
 */
export const GESTURE_GUARD_MS = 350;
export const GESTURE_GUARD_CAP_MS = 1500;

export class GestureGuard {
  private down = new Set<number>();
  private lastEnd = 0;

  constructor(
    private guardMs: number = GESTURE_GUARD_MS,
    private capMs: number = GESTURE_GUARD_CAP_MS,
  ) {}

  pointerDown(id: number): void {
    this.down.add(id);
  }

  pointerUp(id: number, now: number): void {
    this.down.delete(id);
    this.lastEnd = now;
  }

  /** The window lost the focus, or the tab was hidden: whatever was down is not tracked any more. */
  reset(now: number): void {
    if (this.down.size > 0) this.lastEnd = now;
    this.down.clear();
  }

  get pointersDown(): number {
    return this.down.size;
  }

  /** The header appeared at `appearedAt`: whether it may take the pointer at `now`. */
  mayRelease(appearedAt: number, now: number): boolean {
    if (now - appearedAt >= this.capMs) return true;
    if (this.down.size > 0) return false;
    return now - Math.max(this.lastEnd, appearedAt) >= this.guardMs;
  }
}
