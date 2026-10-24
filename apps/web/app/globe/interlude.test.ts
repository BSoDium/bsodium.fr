import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PLAY_INTERLUDE_EVENT, requestInterlude, type PlayInterludeRequest } from "./interlude";

describe("asking for the interlude", () => {
  beforeEach(() => vi.stubGlobal("window", new EventTarget()));
  afterEach(() => vi.unstubAllGlobals());
  it("is taken when a globe answers, and not when none does", () => {
    expect(requestInterlude()).toBe(false);
    const on = (e: Event) => {
      (e as CustomEvent<PlayInterludeRequest>).detail.handled = true;
    };
    window.addEventListener(PLAY_INTERLUDE_EVENT, on);
    expect(requestInterlude()).toBe(true);
    window.removeEventListener(PLAY_INTERLUDE_EVENT, on);
    expect(requestInterlude()).toBe(false);
  });
});
