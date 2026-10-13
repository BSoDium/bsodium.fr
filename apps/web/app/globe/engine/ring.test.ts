import { describe, expect, it } from "vitest";
import { fitZoom, silhouetteRadiusPx, silhouetteZoom } from "./geo";
import { ringLayout, ringText } from "./ring";
import { RING } from "./tuning";
import { RING_LINE_BUDGET, ringPhrases } from "../ring-text";

/** The identity the app hands in (the shape of `SITE` in lib/site.ts: this folder imports nothing from the app). */
const IDENTITY = {
  name: "Elliot Négrel-Jerzy",
  role: "Front-end and UX software engineer",
  location: "Paris",
  speciality: "Data visualisation, geospatial and cartography interfaces, design systems, computer graphics",
};
const LINE = ringText(ringPhrases(IDENTITY));

describe("silhouette zoom", () => {
  it("is the inverse of the silhouette radius, and `fitZoom` is built on it", () => {
    for (const h of [600, 900, 1200]) {
      for (const r of [80, 200, 396]) expect(silhouetteRadiusPx(silhouetteZoom(r, h), h)).toBeCloseTo(r, 6);
    }
    expect(fitZoom(1440, 900, 0.12)).toBeCloseTo(silhouetteZoom(450 * 0.88, 900), 12);
  });
});

describe("the ring's text", () => {
  it("is the phrases in capitals, a middle dot between them and one more to close the loop", () => {
    expect(ringText(["a b", "c"])).toBe("A B · C · ");
    expect(ringText([])).toBe("");
    expect(ringText(["  ", ""])).toBe("");
  });

  it("is the site identity, nothing else: the name, the role, the specialities that fit, the place", () => {
    // all of them when the budget allows
    expect(ringPhrases(IDENTITY, 1000)).toEqual([
      "Elliot Négrel-Jerzy",
      "Front-end and UX software engineer",
      "Data visualisation",
      "geospatial and cartography interfaces",
      "design systems",
      "computer graphics",
      "Paris",
    ]);
    // by default the last specialities that would make the line longer than the ring closes well with are left off
    expect(ringPhrases(IDENTITY)).toEqual(["Elliot Négrel-Jerzy", "Front-end and UX software engineer", "Data visualisation", "geospatial and cartography interfaces", "Paris"]);
    expect(LINE).toBe("ELLIOT NÉGREL-JERZY · FRONT-END AND UX SOFTWARE ENGINEER · DATA VISUALISATION · GEOSPATIAL AND CARTOGRAPHY INTERFACES · PARIS · ");
    expect(LINE.length).toBeLessThanOrEqual(RING_LINE_BUDGET);
    // never the name, the role or the place
    expect(ringPhrases(IDENTITY, 10)).toEqual(["Elliot Négrel-Jerzy", "Front-end and UX software engineer", "Paris"]);
  });

  it("leaves out what is blank, and a lone speciality is one phrase", () => {
    expect(ringPhrases({ name: " Ada ", role: "", location: "Lyon", speciality: "maps,, ,graphs" })).toEqual(["Ada", "maps", "graphs", "Lyon"]);
    expect(ringPhrases({ name: "Ada", role: "", location: "Lyon", speciality: "" })).toEqual(["Ada", "Lyon"]);
    expect(ringPhrases({ name: "A", role: "B", location: "C", speciality: "one field" })).toEqual(["A", "B", "one field", "C"]);
    expect(ringText(ringPhrases({ name: "", role: "", location: "", speciality: "" }))).toBe("");
  });
});

describe("the layout: the line closes evenly round the ring", () => {
  const adv = RING.type.advanceEm;
  // The silhouette's radius at the lowest zoom for the viewports the ring is checked at (1440x900, 1024x700, 390x844, 844x390, 1920x1080, the panel's half).
  const radii = [281, 190, 122, 100, 380, 150, 60];

  it("goes round a whole number of times and fills the circumference exactly: n * length advances of em * (0.6 + tracking)", () => {
    for (const r of radii) {
      const l = ringLayout(LINE.length, r);
      expect(Number.isInteger(l.repeats)).toBe(true);
      expect(l.repeats).toBeGreaterThanOrEqual(1);
      const em = l.emPerR * r;
      const circumference = 2 * Math.PI * r * (1 + RING.gap);
      expect(l.repeats * LINE.length * em * (adv + l.tracking)).toBeCloseTo(circumference, 6);
    }
  });

  it("keeps the letters near the target size, the tracking near the nominal, and never lets them touch", () => {
    for (const r of radii.filter((v) => v >= 100)) {
      const l = ringLayout(LINE.length, r);
      const em = l.emPerR * r;
      expect(em).toBeLessThanOrEqual(RING.type.targetEmPx * (1 + RING.type.emSlack) + 1e-9);
      expect(l.tracking).toBeGreaterThan(0.02 - 1e-9);
      expect(Math.abs(l.tracking - RING.type.tracking)).toBeLessThan(0.2);
      // within the slack of the target, or, when the line is too long for the ring at that size (a phone: about 160 letters on a circle of 770 px),
      // shrunk by what it takes to keep the tightest tracking: never more than a third below the target
      if (em < RING.type.targetEmPx * (1 - RING.type.emSlack) - 1e-9) {
        expect(l.tracking).toBeCloseTo(0.02, 9);
        expect(em).toBeGreaterThan(RING.type.targetEmPx * (2 / 3));
      }
    }
    // A ring too small for the line at the smallest em shrinks the type instead of overlapping it.
    const tiny = ringLayout(LINE.length, 30);
    expect(tiny.tracking).toBeGreaterThanOrEqual(0.02 - 1e-9);
  });

  it("is a ratio of the silhouette: the em and the tracking do not depend on the zoom, so the ring that closes at one size closes at every size", () => {
    const l = ringLayout(LINE.length, 281);
    for (const r of [60, 140, 281, 396]) {
      // The advance along the baseline circle (radius r (1 + gap)) is the em times (0.6 + tracking), whatever r is.
      const step = (2 * Math.PI) / (LINE.length * l.repeats);
      expect(step * r * (1 + RING.gap)).toBeCloseTo(l.emPerR * r * (adv + l.tracking), 6);
    }
  });

  it("repeats more on a bigger ring", () => {
    expect(ringLayout(LINE.length, 380).repeats).toBeGreaterThanOrEqual(ringLayout(LINE.length, 122).repeats);
    expect(ringLayout(0, 200).repeats).toBe(1);
  });
});
