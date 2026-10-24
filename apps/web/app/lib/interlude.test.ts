import { describe, expect, it } from "vitest";
import { matchesSurprise } from "./interlude";

describe("finding the surprise", () => {
  it("is found by its own words, and only by at least three letters of them", () => {
    for (const q of ["impress", "impress me", "surprises", "I like surprises", "i like sur", "easter egg", "surpr", "universal", "parody"]) expect(matchesSurprise(q), q).toBe(true);
  });
  it("is not found by a letter or two, nor by a word that is not its own", () => {
    for (const q of ["", " ", "i", "li", "me", "place", "zagreb", "impress zagreb", "like zagreb"]) expect(matchesSurprise(q), q).toBe(false);
  });
});
