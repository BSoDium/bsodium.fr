import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LabelLayer, featherShadow, type LabelView } from "./label-dom";
import { LABEL_TYPE } from "./label-text";

/** The smallest DOM the layer needs: elements with a style, a dataset, children and remove(). */
class FakeEl {
  style: Record<string, string> = {};
  dataset: Record<string, string> = {};
  children: FakeEl[] = [];
  className = "";
  textContent = "";
  parent: FakeEl | null = null;
  append(...c: FakeEl[]) {
    for (const x of c) {
      x.parent = this;
      this.children.push(x);
    }
  }
  prepend(...c: FakeEl[]) {
    for (const x of c) {
      x.parent = this;
      this.children.unshift(x);
    }
  }
  remove() {
    if (this.parent) this.parent.children = this.parent.children.filter((c) => c !== this);
    this.parent = null;
  }
  getBoundingClientRect() {
    return { left: 0, top: 0, right: 10, bottom: 10 };
  }
}

const view = (extra: Partial<LabelView> = {}): LabelView => ({ x: 10, y: 20, w: 60, h: 24, name: "Paris", sub: null, mode: "rest", over: false, alpha: 1, ...extra });
let root: FakeEl;
let layer: LabelLayer;

beforeEach(() => {
  vi.stubGlobal("document", { createElement: () => new FakeEl() });
  vi.stubGlobal("window", { devicePixelRatio: 2 });
  root = new FakeEl();
  layer = new LabelLayer(root as unknown as HTMLElement);
});
afterEach(() => vi.unstubAllGlobals());

const frame = (fn: () => void) => {
  layer.begin();
  fn();
  layer.end();
};
/** One element per label, in the root: no layer of feathers (the feather is the plate's own shadow). */
const el = (n = 0) => root.children[n]!;

describe("the label layer: real text in pooled elements, positioned by transform only", () => {
  it("a plate with its name, positioned by translate3d and nothing else, with a small feather of its own colour", () => {
    frame(() => layer.put(1, "paris", view()));
    expect(root.children.length).toBe(1); // the plate only: no second element, no layer below the boxes
    const e = el();
    expect(e.className).toBe("map-label");
    expect(e.children[0]!.textContent).toBe("Paris");
    expect(e.children[0]!.className).toBe("map-label-name");
    expect(e.style.transform).toBe("translate3d(10px,20px,0)");
    expect(e.style.left).toBe("0"); // placement is the transform
    expect(e.style.display).toBe("");
    expect(e.dataset.slug).toBe("paris");
    expect([e.style.minWidth, e.style.minHeight]).toEqual(["60px", "24px"]); // the plate is never smaller than what the plan reserved
    expect(e.style.boxShadow).toBe(featherShadow());
  });
  it("the type comes from LABEL_TYPE: two lines, the name 14 px / 500 and the second line 11 px / 400, block lines with their own line height", () => {
    frame(() => layer.put(1, "a", view()));
    const [name, sub] = el().children;
    expect([name!.style.fontSize, name!.style.fontWeight, name!.style.lineHeight, name!.style.display]).toEqual([`${LABEL_TYPE.name.size}px`, String(LABEL_TYPE.name.weight), `${LABEL_TYPE.name.lineHeight}px`, "block"]);
    expect([sub!.style.fontSize, sub!.style.fontWeight, sub!.style.lineHeight]).toEqual([`${LABEL_TYPE.sub.size}px`, String(LABEL_TYPE.sub.weight), `${LABEL_TYPE.sub.lineHeight}px`]);
    expect(el().style.padding).toBe(`${LABEL_TYPE.padY}px ${LABEL_TYPE.padX}px`);
  });
  it("the feather is ONE small shadow of the plate's own translucent colour, 1 to 2 px, from LABEL_TYPE.feather: it dims nothing around the text", () => {
    const { blur, spread } = LABEL_TYPE.feather;
    expect(featherShadow()).toBe(`0 0 ${blur}px ${spread}px var(--map-label-plate)`);
    expect(spread).toBeGreaterThanOrEqual(1);
    expect(spread).toBeLessThanOrEqual(2);
    expect(blur).toBeGreaterThanOrEqual(1);
    expect(blur).toBeLessThanOrEqual(2);
    expect(spread + blur).toBeLessThanOrEqual(4); // the whole falloff is a few px, never a halo
  });
  it("positions are rounded to whole DEVICE pixels (at 2x a half px is kept, a quarter is not)", () => {
    frame(() => layer.put(1, "a", view({ x: 10.3, y: 20.8 })));
    expect(el().style.transform).toBe("translate3d(10.5px,21px,0)");
  });
  it("while something moves the position is EXACT, a fraction of a device pixel: a label follows its box smoothly (begin(false))", () => {
    layer.begin(false);
    layer.put(1, "a", view({ x: 10.3, y: 20.8 }));
    layer.end();
    expect(el().style.transform).toBe("translate3d(10.3px,20.8px,0)");
    layer.begin(false);
    layer.put(1, "a", view({ x: 10.31, y: 20.8 }));
    layer.end();
    expect(el().style.transform).toBe("translate3d(10.31px,20.8px,0)"); // a hundredth of a pixel is a write: no 0.5 px steps
  });
  it("at rest (the default, begin(true)) it is rounded to whole device pixels again, so the text is sharp", () => {
    layer.begin(false);
    layer.put(1, "a", view({ x: 10.3, y: 20.8 }));
    layer.end();
    frame(() => layer.put(1, "a", view({ x: 10.3, y: 20.8 })));
    expect(el().style.transform).toBe("translate3d(10.5px,21px,0)");
  });
  it("the second line is its own line, and absent when there is none", () => {
    frame(() => layer.put(1, "eu", view({ name: "Europe", sub: "12 places" })));
    const [name, sub] = el().children;
    expect(name!.textContent).toBe("Europe");
    expect(sub!.textContent).toBe("12 places");
    expect(sub!.className).toBe("map-label-sub");
    expect(sub!.style.display).toBe("block");
    frame(() => layer.put(1, "eu", view({ name: "Europe", sub: null })));
    expect(el().children[1]!.style.display).toBe("none");
  });
  it("writes only what changed: a frame with the same values touches nothing", () => {
    frame(() => layer.put(1, "a", view()));
    const w = layer.writes;
    frame(() => layer.put(1, "a", view()));
    expect(layer.writes).toBe(w);
    frame(() => layer.put(1, "a", view({ x: 11 })));
    expect(layer.writes).toBe(w + 1);
    frame(() => layer.put(1, "a", view({ x: 11, w: 70 })));
    expect(layer.writes).toBe(w + 2);
  });
  it("a selected plate (inverted) and one drawn over other labels (the last resort) are opaque: no feather; at rest and hovered it has one", () => {
    frame(() => layer.put(1, "a", view({ mode: "rest" })));
    expect(el().style.boxShadow).toBe(featherShadow());
    frame(() => layer.put(1, "a", view({ mode: "hover" })));
    expect(el().style.boxShadow).toBe(featherShadow());
    frame(() => layer.put(1, "a", view({ mode: "selected" })));
    expect(el().dataset.mode).toBe("selected");
    expect(el().style.boxShadow).toBe("none");
    frame(() => layer.put(1, "a", view({ mode: "rest", over: true })));
    expect(el().style.boxShadow).toBe("none");
    frame(() => layer.put(1, "a", view({ mode: "rest", over: false })));
    expect(el().style.boxShadow).toBe(featherShadow());
  });
  it("state, plate and opacity are attributes and a style; a full opacity writes none", () => {
    frame(() => layer.put(1, "a", view({ mode: "selected", over: true, alpha: 0.5 })));
    expect(el().dataset.mode).toBe("selected");
    expect("over" in el().dataset).toBe(true);
    expect(el().style.opacity).toBe("0.5");
    frame(() => layer.put(1, "a", view({ mode: "rest", over: false, alpha: 1 })));
    expect(el().dataset.mode).toBe("rest");
    expect("over" in el().dataset).toBe(false);
    expect(el().style.opacity).toBe("");
  });
  it("a label that is not put goes back to the pool, hidden, and the element is reused (no node is created in a warm frame)", () => {
    frame(() => layer.put(1, "a", view()));
    frame(() => undefined);
    expect(el().style.display).toBe("none");
    expect(layer.count).toBe(0);
    frame(() => layer.put(2, "b", view({ name: "Lyon" })));
    expect(root.children.length).toBe(1); // the same element
    expect(el().dataset.slug).toBe("b");
    expect(el().children[0]!.textContent).toBe("Lyon");
    expect(el().style.display).toBe("");
    expect(el().style.boxShadow).toBe(featherShadow()); // a reused plate is rewritten
  });
});

describe("moving: only a transform, no CSS transition (the motion is computed per frame)", () => {
  it("a moved label gets a new transform (the feather is its own shadow) and no glide attribute or transition", () => {
    frame(() => layer.put(1, "a", view()));
    frame(() => layer.put(1, "a", view({ x: 50 })));
    expect(el().style.transform).toContain("50px");
    expect("glide" in el().dataset).toBe(false);
    expect(el().style.transition ?? "").toBe("");
  });
});

describe("dispose", () => {
  it("removes every element", () => {
    frame(() => layer.put(1, "a", view()));
    frame(() => layer.put(2, "b", view()));
    layer.dispose();
    expect(root.children.length).toBe(0);
  });
});
