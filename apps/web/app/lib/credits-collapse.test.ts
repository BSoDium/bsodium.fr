import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CREDITS_SHOWN_MS, createCreditsCollapse, creditsGuardKey } from "./credits-collapse";

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
};

describe("phone credits: shown, then collapsed", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("is visible at t = 0 and collapsed at 5 s", () => {
    const seen: boolean[] = [];
    const c = createCreditsCollapse({ surface: "globe", storage: memory(), onChange: (s) => seen.push(s) });
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
    const c = createCreditsCollapse({ surface: "globe", storage: memory(), onChange: (s) => seen.push(s) });
    c.start();
    vi.advanceTimersByTime(800);
    c.interact();
    expect(c.state).toBe("collapsed");
    vi.advanceTimersByTime(10_000);
    expect(seen).toEqual([true, false]);
  });

  it("stays collapsed: no second start, no second interaction brings it back", () => {
    const seen: boolean[] = [];
    const c = createCreditsCollapse({ surface: "globe", storage: memory(), onChange: (s) => seen.push(s) });
    c.start();
    c.interact();
    c.start();
    c.interact();
    expect(c.state).toBe("collapsed");
    expect(seen).toEqual([true, false]);
  });

  it("is shown at most once per page session per surface (a remount, the globe under a phone's panel, finds the guard)", () => {
    const storage = memory();
    const a = createCreditsCollapse({ surface: "globe", storage, onChange: () => {} });
    a.start();
    a.stop();
    const seen: boolean[] = [];
    const b = createCreditsCollapse({ surface: "globe", storage, onChange: (s) => seen.push(s) });
    b.start();
    expect(b.state).toBe("collapsed");
    expect(seen).toEqual([]);
    // the street map is its own surface: it shows once as well
    const s = createCreditsCollapse({ surface: "street", storage, onChange: (v) => seen.push(v) });
    s.start();
    expect(s.state).toBe("shown");
    expect(storage.m.get(creditsGuardKey("street"))).toBe("1");
  });

  it("survives a StrictMode effect cycle (start, stop, start): still shown, and one 5 s from the second start", () => {
    const c = createCreditsCollapse({ surface: "globe", storage: memory(), onChange: () => {} });
    c.start();
    c.stop();
    vi.advanceTimersByTime(CREDITS_SHOWN_MS * 2);
    expect(c.state).toBe("shown");
    c.start();
    vi.advanceTimersByTime(CREDITS_SHOWN_MS);
    expect(c.state).toBe("collapsed");
  });

  it("works with a blocked or absent storage (shown once per instance)", () => {
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    for (const storage of [throwing, null]) {
      const c = createCreditsCollapse({ surface: "globe", storage, onChange: () => {} });
      c.start();
      expect(c.state).toBe("shown");
      vi.advanceTimersByTime(CREDITS_SHOWN_MS);
      expect(c.state).toBe("collapsed");
    }
  });
});
