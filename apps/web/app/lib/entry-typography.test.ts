import { describe, expect, it } from "vitest";
import { dropCapIndex, dropCapKind, DROP_CAP_MIN_LENGTH, formatMonthYear, headlineScale, linkedLine, splitHeadline } from "./entry-typography";

describe("splitHeadline", () => {
  it("leaves a title without a separator as one heavy run", () => {
    expect(splitHeadline("Night trains through the Balkans")).toEqual({ lead: "Night trains through the Balkans", tail: "" });
  });
  it("splits at the first comma, colon or dash and keeps the separator in the thin run (lead + tail is the title)", () => {
    for (const title of ["Collide, a label collision engine for maps", "Timetable Diff: the tool behind these notes", "Eleven hours \u2014 by bus", "Rain, then, more rain, again"]) {
      const { lead, tail } = splitHeadline(title);
      expect(tail, title).not.toBe("");
      expect(lead + tail, title).toBe(title);
    }
    expect(splitHeadline("Collide, a label collision engine for maps")).toEqual({ lead: "Collide", tail: ", a label collision engine for maps" });
    expect(splitHeadline("Rain, then, more rain").lead).toBe("Rain");
  });
  it("does not split when a half is too short to stand alone", () => {
    expect(splitHeadline("A, B")).toEqual({ lead: "A, B", tail: "" });
    expect(splitHeadline("Citadel, ")).toEqual({ lead: "Citadel, ", tail: "" });
    expect(splitHeadline("No. 3: ?")).toEqual({ lead: "No. 3: ?", tail: "" });
    expect(splitHeadline(", leading comma")).toEqual({ lead: ", leading comma", tail: "" });
  });
  it("splits at the earliest separator whatever its kind", () => {
    expect(splitHeadline("One: two, three").lead).toBe("One");
    expect(splitHeadline("One, two: three").lead).toBe("One");
  });
});

describe("formatMonthYear", () => {
  it("writes a month and a year, completing nothing", () => {
    expect(formatMonthYear("2026-03-14")).toBe("March 2026");
    expect(formatMonthYear("2024-06")).toBe("June 2024");
    expect(formatMonthYear("2022")).toBe("2022");
  });
  it("gives null for anything that is not a partial ISO date", () => {
    expect(formatMonthYear(undefined)).toBeNull();
    expect(formatMonthYear("2026-13")).toBeNull();
    expect(formatMonthYear("March 2026")).toBeNull();
    expect(formatMonthYear("2026-3-1")).toBeNull();
  });
});

describe("dropCapIndex", () => {
  const long = "x".repeat(DROP_CAP_MIN_LENGTH);
  it("is the first block when it is a long paragraph that starts with a capital letter", () => {
    expect(dropCapIndex([{ type: "paragraph", text: `A${long}` }])).toBe(0);
    expect(dropCapIndex([{ type: "paragraph", text: `T${long}` }])).toBe(0);
    expect(dropCapIndex([{ type: "paragraph", text: `\u00C9t\u00E9${long}` }])).toBe(0);
  });
  it("is -1 for a short paragraph, a body that does not open with a paragraph, or a first character that is not a letter", () => {
    expect(dropCapIndex([{ type: "paragraph", text: "Short." }])).toBe(-1);
    expect(dropCapIndex([{ type: "heading", level: 2, text: "H" }, { type: "paragraph", text: `A${long}` }])).toBe(-1);
    expect(dropCapIndex([{ type: "paragraph", text: `\u2014${long}` }])).toBe(-1);
    expect(dropCapIndex([])).toBe(-1);
  });
});

describe("dropCapKind", () => {
  const long = " " + "word ".repeat(DROP_CAP_MIN_LENGTH / 5);
  it("takes a capital and an accented capital (with room for the mark)", () => {
    expect(dropCapKind(`A${long}`)).toBe("plain");
    expect(dropCapKind(`W${long}`)).toBe("plain");
    expect(dropCapKind(`J${long}`)).toBe("plain");
    expect(dropCapKind(`\u0152uvre${long}`)).toBe("plain");
    expect(dropCapKind(`\u00C9crit${long}`)).toBe("accent");
    expect(dropCapKind(`\u00C0 ${long}`)).toBe("accent");
    expect(dropCapKind(`   T${long}`)).toBe("plain");
  });
  it("takes the Latin Extended-A capitals (Polish, Czech, ...): room for a mark above the letter, none for a stroke or an ogonek", () => {
    expect(dropCapKind(`\u0141\u00F3d\u017A${long}`)).toBe("plain"); // Ł
    expect(dropCapKind(`\u015Awiat${long}`)).toBe("accent"); // Ś
    expect(dropCapKind(`\u017B\u00F3\u0142w${long}`)).toBe("accent"); // Ż
    expect(dropCapKind(`\u0104${long}`)).toBe("plain"); // Ą
    expect(dropCapKind(`\u017Dena${long}`)).toBe("accent"); // Ž
    expect(dropCapKind(`\u010Cesko${long}`)).toBe("accent"); // Č
    expect(dropCapKind(`\u0118${long}`)).toBe("plain"); // Ę
    expect(dropCapKind(`\u0179${long}`)).toBe("accent"); // Ź
  });
  it("skips Latin Extended-A capitals with a cedilla and lowercase letters of the block", () => {
    for (const lead of ["\u015E", "\u0162", "\u0122", "\u0142\u00F3d\u017A"]) expect(dropCapKind(`${lead}${long}`), lead).toBeNull();
  });
  it("skips an opening quote or bracket, a letter that hangs below the baseline, a lowercase start and a capital followed by a mark (an elision too)", () => {
    for (const lead of ["\u00ABIl", "\u201CA", "\"A", "'A", "(A", "Quand", "\u00C7a", "answer", "I,", "A.", "\u00E9t\u00E9", "L'exil", "L\u2019exil", "I'm"]) {
      expect(dropCapKind(`${lead}${long}`), lead).toBeNull();
    }
  });
  it("skips a paragraph shorter than the threshold", () => {
    expect(dropCapKind("A short one.")).toBeNull();
    expect(dropCapKind("A".repeat(DROP_CAP_MIN_LENGTH - 1))).toBeNull();
  });
});

describe("linkedLine", () => {
  it("counts what is there and says nothing when there is nothing", () => {
    expect(linkedLine({ places: 4, entries: 3 })).toBe("4 places, 3 entries");
    expect(linkedLine({ places: 1, entries: 1 })).toBe("1 place, 1 entry");
    expect(linkedLine({ places: 2, entries: 0 })).toBe("2 places");
    expect(linkedLine({ places: 0, entries: 2 })).toBe("2 entries");
    expect(linkedLine({ places: 0, entries: 0 })).toBeNull();
  });
  it("leaves the entries out when their count is not known", () => {
    expect(linkedLine({ places: 3, entries: null })).toBe("3 places");
  });
});

describe("headlineScale", () => {
  it("is 1 for a short title and 0.6 for a very long one", () => {
    expect(headlineScale("A short title")).toBe(1);
    expect(headlineScale("x".repeat(48))).toBe(1);
    expect(headlineScale("x".repeat(200))).toBe(0.6);
  });
  it("shrinks monotonically in between", () => {
    let last = 1;
    for (let n = 48; n <= 120; n += 6) {
      const v = headlineScale("x".repeat(n));
      expect(v).toBeLessThanOrEqual(last);
      last = v;
    }
  });
});
