// Writes the fictional routes (with synthetic legs) of packages/published/fixtures/demo.json. Re-runnable: it replaces
// the `routes` block only. Run from the repo root with: node --experimental-strip-types apps/web/scripts/paths/make-demo-legs.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { curvyPolyline } from "./_synthetic.mjs";

const file = new URL("../../../../packages/published/fixtures/demo.json", import.meta.url);
const demo = JSON.parse(readFileSync(file, "utf8"));
const at = (slug) => {
  const p = demo.places.find((x) => x.slug === slug);
  if (!p) throw new Error(`no place ${slug}`);
  return [p.coordinates.lat, p.coordinates.lon];
};

let seed = 7;
const leg = (mode, from, to, opts = {}) => {
  if (mode === "flight" || mode === "unknown") return { mode };
  return { mode, polyline: curvyPolyline(at(from), at(to), { seed: seed++, ...opts }) };
};

const routes = [
  {
    id: "demo-route-vietnam",
    title: "Demo route (curated stop order)",
    stops: ["hanoi", "hue", "ho-chi-minh-city"],
    legs: [leg("rail", "hanoi", "hue", { wobble: 0.02, bend: 0.03 }), leg("flight", "hue", "ho-chi-minh-city")],
  },
  {
    id: "demo-route-adriatic-loop",
    title: "Demo route: a loop through the Adriatic",
    stops: ["paris", "ljubljana", "zagreb", "split", "belgrade"],
    legs: [
      leg("rail", "paris", "ljubljana", { wobble: 0.02, bend: 0.04 }),
      leg("road", "ljubljana", "zagreb"),
      leg("road", "zagreb", "split", { bend: 0.1 }),
      leg("ferry", "split", "belgrade", { wobble: 0.01, bend: 0.2 }),
    ],
  },
  {
    id: "demo-route-coast-and-islands",
    title: "Demo route: coast, walk and a long haul",
    stops: ["bangkok", "da-nang", "hoi-an", "hue", "lisbon"],
    legs: [leg("flight", "bangkok", "da-nang"), leg("walk", "da-nang", "hoi-an", { wobble: 0.08 }), leg("road", "hoi-an", "hue"), leg("unknown", "hue", "lisbon")],
  },
  {
    id: "demo-route-northern-lights",
    title: "Demo route: north and back",
    stops: ["lisbon", "paris", "reykjavik", "vancouver"],
    legs: [leg("rail", "lisbon", "paris", { wobble: 0.025 }), leg("flight", "paris", "reykjavik"), leg("flight", "reykjavik", "vancouver")],
  },
];
// Textual replacement of the `"routes": [...]` block only, so the hand-formatted rest of the file is untouched.
const text = readFileSync(file, "utf8");
const block = /  "routes": \[\n[\s\S]*?\n  \],\n/;
if (!block.test(text)) throw new Error("routes block not found");
const render = (r) => {
  const legs = r.legs.map((l) => `        ${JSON.stringify(l)}`).join(",\n");
  return `    {\n      "id": ${JSON.stringify(r.id)},\n      "title": ${JSON.stringify(r.title)},\n      "stops": ${JSON.stringify(r.stops)},\n      "legs": [\n${legs}\n      ]\n    }`;
};
writeFileSync(file, text.replace(block, `  "routes": [\n${routes.map(render).join(",\n")}\n  ],\n`));
console.log(routes.map((r) => `${r.id}: ${r.legs.map((l) => l.mode + (l.polyline ? `(${l.polyline.length})` : "")).join(", ")}`).join("\n"));
