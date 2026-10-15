import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CREDITS_SHOWN_MS, createCreditsCollapse, resetCreditsShown } from "./credits-collapse";

describe("phone credits: shown, then collapsed", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetCreditsShown(); // a new document load
  });
  afterEach(() => vi.useRealTimers());

  it("is visible at t = 0 and collapsed at 5 s", () => {
    const seen: boolean[] = [];
    const c = createCreditsCollapse({ surface: "globe", onChange: (s) => seen.push(s) });
    c.start();
    expect(c.state).toBe("shown");
    expect(seen).toEqual([true]);
    vi.advanceTimersByTime(CREDITS_SHOWN_MS - 1);
    expect(c.state).toBe("shown");
    vi.advanceTimersByTime(1);
    expect(c.state).toBe("collapsed");
    expect(seen).toEqual([true, false]);
  });

  it("collapses at once on the first interaction, and the timer is gone", () => {
    const seen: boolean[] = [];
    const c = createCreditsCollapse({ surface: "globe", onChange: (s) => seen.push(s) });
    c.start();
    vi.advanceTimersByTime(800);
    c.interact();
    expect(c.state).toBe("collapsed");
    vi.advanceTimersByTime(10_000);
    expect(seen).toEqual([true, false]);
  });

  it("stays collapsed: no second start, no second interaction brings it back", () => {
    const seen: boolean[] = [];
    const c = createCreditsCollapse({ surface: "globe", onChange: (s) => seen.push(s) });
    c.start();
    c.interact();
    c.start();
    c.interact();
    expect(c.state).toBe("collapsed");
    expect(seen).toEqual([true, false]);
  });

  it("is shown at most once per surface per page load (a remount, the globe under a phone's panel, a handover or a client-side navigation finds it already shown)", () => {
    const a = createCreditsCollapse({ surface: "globe", onChange: () => {} });
    a.start();
    a.stop();
    const seen: boolean[] = [];
    const b = createCreditsCollapse({ surface: "globe", onChange: (s) => seen.push(s) });
    b.start();
    expect(b.state).toBe("collapsed");
    expect(seen).toEqual([]);
    // the street map is its own surface: it shows once as well
    const s = createCreditsCollapse({ surface: "street", onChange: (v) => seen.push(v) });
    s.start();
    expect(s.state).toBe("shown");
  });

  it("is shown again by a new document load (a reload resets the module state): visible by default on every arrival", () => {
    const first = createCreditsCollapse({ surface: "globe", onChange: () => {} });
    first.start();
    first.interact();
    resetCreditsShown();
    const again = createCreditsCollapse({ surface: "globe", onChange: () => {} });
    again.start();
    expect(again.state).toBe("shown");
  });

  it("survives a StrictMode effect cycle (start, stop, start): still shown, and one 5 s from the second start", () => {
    const c = createCreditsCollapse({ surface: "globe", onChange: () => {} });
    c.start();
    c.stop();
    vi.advanceTimersByTime(CREDITS_SHOWN_MS * 2);
    expect(c.state).toBe("shown");
    c.start();
    vi.advanceTimersByTime(CREDITS_SHOWN_MS);
    expect(c.state).toBe("collapsed");
  });
});
