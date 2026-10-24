/**
 * The search palette's hidden entry, "I like surprises", that plays the cinematic interlude (globe/engine/cinematic.ts; the request to the globe is `globe/interlude.ts`).
 */
import { foldText } from "./search";

/** The entry's name, its second line, and the words (and the longer phrases they begin) it is found by. */
export const SURPRISE = {
  title: "I like surprises",
  sub: "Play the studio parody",
  words: ["i", "like", "surprises", "surprise", "impress", "me", "easter", "egg", "universal", "parody", "cinematic"],
} as const;

/**
 * Whether the typed query finds the entry. It is meant to be hard to come across: the query must have at least three letters, and every word of it must begin one of the entry's
 * own words (so "impress", "surpr", "i like sur" find it, "i", "lik" and "place" do not), and it is listed after everything else the query matches, not among it.
 */
export function matchesSurprise(query: string): boolean {
  const words = foldText(query).split(" ").filter(Boolean);
  if (words.length === 0 || words.join("").length < 3) return false;
  return words.every((w) => SURPRISE.words.some((x) => x.startsWith(w) && (w.length >= 2 || x === w)));
}
