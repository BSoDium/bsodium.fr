import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MAP_CARD } from "~/lib/map-card";
import { AttributionButton } from "./attribution-button";
import { DevContentBadge } from "./dev-content-badge";

const OFM = { primaryUrl: "https://tiles.openfreemap.org/planet", fallbackPmtilesUrl: null };
const credits = (props: Partial<Parameters<typeof AttributionButton>[0]> = {}) =>
  renderToStaticMarkup(createElement(AttributionButton, { tiles: OFM, insetRight: 0, reducedMotion: false, ...props }));

describe("map card: the dev badge and the credits line are one object", () => {
  it("both carry every class of the shared card (border, plate, padding, radius, mono type)", () => {
    const badge = renderToStaticMarkup(createElement(DevContentBadge, { mode: "preview" }));
    const line = credits();
    for (const cls of MAP_CARD.split(" ")) {
      expect(badge, cls).toContain(cls);
      expect(line, cls).toContain(cls);
    }
    expect(MAP_CARD).toMatch(/font-mono/);
    expect(MAP_CARD).toMatch(/border-border(?!-)/);
  });
});

describe("credits line", () => {
  it("is one line of real text with the main contributors, from the same list as the dialog", () => {
    const html = credits();
    const text = html.replace(/<[^>]+>/g, "");
    expect(text).toBe("© OpenStreetMap · OpenFreeMap · Natural Earth·See more");
    expect(html).toContain("select-text");
    expect(html).toContain("overflow-hidden");
    expect(html).toContain("whitespace-nowrap");
  });
  it("has one more middle dot, between the last credit and the button, outside the clipped text and hidden from assistive technology", () => {
    const html = credits();
    expect(html).toMatch(/<\/p><span aria-hidden="true" class="[^"]*shrink-0[^"]*">·<\/span><button/);
    expect(html.split("·").length - 1).toBe(3); // two between the three credits, one before "See more"
    // the line itself keeps clipping rather than wrapping: the dot is not inside it
    const line = /<p[^>]*>.*?<\/p>/.exec(html)![0];
    expect(line).toContain("overflow-hidden");
    expect(line.split("·").length - 1).toBe(2);
  });
  it("follows the tile configuration", () => {
    expect(credits({ tiles: null }).replace(/<[^>]+>/g, "")).toBe("Natural Earth·See more");
    expect(credits({ tiles: { primaryUrl: "https://t.example/x.pmtiles", fallbackPmtilesUrl: null } }).replace(/<[^>]+>/g, "")).toBe("© OpenStreetMap · Protomaps · Natural Earth·See more");
  });
  it("sits bottom right, left of the detail panel, never wider than the room that leaves", () => {
    const html = credits({ insetRight: 720 });
    expect(html).toContain("right:calc(720px + 0.5rem)");
    expect(html).toContain("max-width:calc(100% - 720px - 1rem)");
    expect(html).toContain("env(safe-area-inset-bottom)");
  });
  it("the button has a name that contains its visible label, opens a dialog, has the up-left arrow", () => {
    const html = credits();
    const button = /<button[^>]*>.*?<\/button>/.exec(html)![0];
    expect(button).toContain('aria-label="See more credits"');
    expect(button).toContain('aria-haspopup="dialog"');
    expect(button).toContain("See more");
    expect(button).toContain("lucide-arrow-up-left");
    expect(button).toContain('aria-hidden="true"');
    // the card is not drawn below md (the compact button replaces it: see below), so it has no touch-target extension of its own
    expect(button).not.toContain("max-md:");
  });
  it("is not drawn on a phone (below md: display none, so also out of the tab order and the accessibility tree) and nothing else changes from md up", () => {
    const html = credits();
    const card = /<div[^>]*data-attribution="card"[^>]*>/.exec(html)![0];
    expect(card).toContain("max-md:hidden");
    expect((/class="([^"]*)"/.exec(card)?.[1] ?? "").split(" ")).not.toContain("hidden");
  });
  it("keeps the dim colour at full opacity and raises it on hover and keyboard focus", () => {
    const html = credits();
    expect(html).toContain("text-subtle-foreground");
    expect(html).toContain("hover:text-foreground");
    expect(html).toContain("focus-visible:text-foreground");
    expect(html).not.toMatch(/class="[^"]*\bopacity-/);
  });
});

describe("compact credits button (below md)", () => {
  const compact = () => /<button[^>]*data-attribution="compact"[^>]*>.*?<\/button>/.exec(credits())![0];
  it("is a real button named 'Map credits' that opens the dialog, drawn below md only, with a decorative icon", () => {
    const b = compact();
    expect(b).toContain('aria-label="Map credits"');
    expect(b).toContain('aria-haspopup="dialog"');
    expect(b).toContain('type="button"');
    expect(b).toMatch(/class="[^"]*\bmd:hidden\b/);
    expect(b).toContain("lucide-info");
    expect(b).toContain('aria-hidden="true"');
  });
  it("is a 28 px box with a 44 px touch target (an invisible ::after, 9 px each way outside the padding box: 26 + 18), solid tones, never an opacity", () => {
    const b = compact();
    expect(b).toContain("size-7");
    expect(b).toContain("after:-inset-[9px]");
    expect(b).toContain("bg-background");
    expect(b).not.toMatch(/bg-background\//);
    expect(b).toContain("text-subtle-foreground");
    expect(b).toContain("hover:text-foreground");
    expect(b).toContain("focus-visible:text-foreground");
    expect(b).not.toMatch(/class="[^"]*\bopacity-/);
    expect(b).not.toContain("backdrop-blur");
  });
  it("sits in the card's corner, above the safe area, and above the hero (z 20)", () => {
    const b = compact();
    expect(b).toContain("right:0.5rem");
    expect(b).toContain("env(safe-area-inset-bottom)");
    expect(b).toContain("z-20");
  });
  it("opens the same dialog as the card: there is one dialog and both buttons are wired to it", () => {
    const src = readFileSync(new URL("./attribution-button.tsx", import.meta.url), "utf8");
    expect(src.match(/<CreditsDialog/g)).toHaveLength(1);
    expect(src.match(/onClick=\{\(\) => setOpen\(true\)\}/g)).toHaveLength(2);
  });
});

describe("credits dialog", () => {
  it("uses the soft hairline of the card, not the strong border of outlined buttons", () => {
    const src = readFileSync(new URL("./credits-dialog.tsx", import.meta.url), "utf8");
    expect(src).not.toContain("border-border-strong");
    expect(src).toMatch(/rounded-md border border-border bg-background/);
    expect(src).toMatch(/variant="outline"[^>]*className="border-border"/);
  });
});
