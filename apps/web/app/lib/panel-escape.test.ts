import { describe, expect, it } from "vitest";
import { panelOwnsEscape } from "./panel-escape";

const press = (over: Partial<Parameters<typeof panelOwnsEscape>[0]> = {}) => ({ key: "Escape", defaultPrevented: false, target: null, ...over });
const inside = (selector: string) => ({ closest: (s: string) => (s === selector ? {} : null) });

describe("the panel's Escape", () => {
  it("closes the panel on a bare Escape", () => {
    expect(panelOwnsEscape(press(), false)).toBe(true);
    expect(panelOwnsEscape(press({ target: { closest: () => null } }), false)).toBe(true);
  });
  it("is not another key, nor one that something already handled", () => {
    expect(panelOwnsEscape(press({ key: "Enter" }), false)).toBe(false);
    expect(panelOwnsEscape(press({ defaultPrevented: true }), false)).toBe(false);
  });
  it("leaves the key to a dialog: the search palette closes alone, the panel under it stays", () => {
    expect(panelOwnsEscape(press({ target: inside("dialog") }), false)).toBe(false);
    expect(panelOwnsEscape(press(), true)).toBe(false);
  });
});
