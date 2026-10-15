# Travel paths (2026-10-15)

Every leg of every route is drawn faintly on both maps at all times; the legs next to the selected place go to full ink. The place panel lists the same legs as sentences. Contract: [api-contract.md](api-contract.md#route-legs-routeslegs-optional-additive-in-schema-version-1). Code: `apps/web/app/globe/paths/` (pure), `engine/route-layer.ts` + `engine/materials.ts` (`pathMaterial`) on the globe, `street/core/routes.ts` + `street/style/street-style.ts` on the street map, `lib/journeys.ts` (text), `components/paths-toggle.tsx`.

## Data path

`resolveRoutes` (lib/projection.ts) turns `routes[]` into `GlobeRoute { points, legs? }`. `buildNetwork` (paths/network.ts) runs once per route set: decodes each polyline (paths/polyline.ts), builds the geodesic arc (0.4 degree steps, lifted 0.12 per radian, the curated routes' look) for legs without one, and derives 5 simplification levels by Douglas-Peucker on the sphere in metres (20, 80, 320, 1,280, 5,120 m; each level a subset of the one before, ends always kept; the 3D distance makes a chord's sag under the surface count, so no level can sink into the planet's disc). `buildBuffers` makes one shared vertex set and one index range per level.

## Globe

- One instanced `LineSegments` (one draw call; instanced x3 only when a rail leg exists: the rail's cross-ticks are copies 1 and 2). Attributes per vertex: position (lifted), distance along the leg, leg id, mode id, leg length, tangent. Selection is a texel per leg in a small `uState` texture and a draw-on front uniform: no geometry rebuild.
- Zoom: `levelFor(metresPerCell, current)` picks the coarsest level whose error is at most half an art pixel, with a 25 % hysteresis; applied with `setDrawRange` (no rebuild). `fadeLevel`: a leg shorter than 2 art pixels is hidden, and its tone steps up through the palette (solid levels, the borders' staircase, no alpha) to the faint tone at 14 pixels. So short legs are hidden at the world view and appear as you zoom.
- Tones: faint = the palette's `coast` level (3.1:1 light / 3.2:1 dark against the page: the loudest tone the map has, asserted >= 3:1 in `engine/readability.test.ts`); selected legs = ink. Mode colour is a later decision (palettes, PR #289): everything is neutral ink.
- Styles in art pixels (one buffer pixel is one; table in paths/modes.ts, read by the shader and the street style): road solid; rail 4 on / 2 off with a 1-cell tick across (a 3-cell cross) at the middle of each dash; ferry 1.5 / 2.5; flight 1.5 / 3.5 and lifted; walk 1.5 / 1.5; unknown 4 / 3 and lifted. A "dot" is 1.5 cells because docs/pixel-line-rules.md 3.12 (c) measured that shorter dashes break at some angles under the pixel pass.
- Occlusion: the analytic "does the camera ray enter the occluder sphere first" test of the old route material (the depth buffer is off for lines), so limb behaviour is unchanged: nothing from the far side shows, nothing is cut mid-dash. Lifted arcs flatten with `routeLift` at the hand-over.
- Draw order: renderOrder 4 as the old routes (above coast, below the horizon outline, markers and labels).
- Selection shows the legs ADJACENT to the place (arriving and leaving, on every route through it), drawing on from the place outwards, 2.2 s, eased as before. Before this change the whole route through the place lit; adjacent legs match the Journeys list and keep a 100-stop trip from lighting up whole. The far-end places are forced drawn (as the route's stops were).
- Reduced motion: no draw-on and no dash march; the lit legs are complete at once.
- Idle cost is zero: the layer renders nothing by itself; `advance` is true only during a draw-on.

## Street map

One GeoJSON source `routes` with a feature per leg (`key` = `routeId:legIndex`, `mode`), built once. Layers per mode (`routes-faint[-mode]`, `routes-focus[-mode]`, `-tick` for rail): 1 art pixel wide, `THIN_INK` so staircase removal applies, dasharrays from the same table, colours from `lineColor(coast)` and `lineColor(ink)`. `routes-focus` is `setFilter`ed to the selected place's keys; no `setData` on selection. The old erasing halo is gone (a 3-cell halo would cut every road a 1-cell path crosses). The "Paths" switch sets layout visibility.

## Switch

`Paths` (`components/paths-toggle.tsx`, a design-system `Toggle`, `aria-pressed`, name constant) bottom right above the credits card; stored in `localStorage` key `paths-layer` (absent = on; try/catch everywhere); read after hydration. Off hides all paths on both maps, the lit legs included.

## Accessibility

Paths are drawn into the aria-hidden canvases. The place panel's "Journeys" section (`lib/journeys.ts`) lists "Arrived from X by road, about 190 km" / "Left for Y by train, about 540 km": distance from the polyline (or the stops' great circle) rounded to 10 km, noun by mode (road: by road, rail: by train, ferry: by ferry, flight: by plane, walk: on foot, unknown: nothing), no timestamps.

## Measurements (headless Chrome 147-ish for Testing, Apple GPU through ANGLE/Metal, 1440x900 @2: NOT a phone)

`node apps/web/scripts/paths/check.mjs perf` (synthetic legs by `?globe-debug&paths-stress=N`, shape of the spike's legs: about 0.9 points/km):

| legs | vertices | segments per level (0..4) | buffers | drawn: world / zoom |
| --- | --- | --- | --- | --- |
| 13 (demo) | 3,941 | 629 / 547 / 355 / 183 / 90 | 168 KB | 90 / 183 |
| 225 | 32,189 | 20,566 / 11,302 / 5,713 / 2,481 / 1,095 | 1.5 MB | 1,095 / 2,481 |
| 2,000 | 327,250 | 189,637 / 105,514 / 54,627 / 24,021 / 10,563 | 15.4 MB | 10,563 / 24,021 |

Frame cost: `renderNow()` JS time p50 below the 0.1 ms timer resolution and p95 0.1 ms at every view and size; GPU-synced frame p50 0.4 to 0.5 ms (p95 0.8 to 1.4 ms). One draw call added. The design's goal ("a few thousand segments visible") holds at 225 legs; at 2,000 legs it is 10 to 24 thousand segments.

## Not verified

Safari; any phone GPU; the real data's size and look (fixtures are synthetic); the pixel pass on the street map with real tiles (the layers are unit-tested and the style builds; the street checks in `scripts/street` need tile servers); mode colour (later).
