import type { ContentKind } from "@catalyst/schemas";
import { SECTIONS } from "./sections";

/**
 * Addresses that existed once and still must work. Pure (no `Response`): `routes/legacy-poems.ts` and `routes/legacy-projects.ts` answer with
 * the redirect this computes.
 *
 * A section was renamed twice by the owner, and its address moved with it (`lib/sections.ts` holds the names, `formerSlugs` the old ones):
 *
 *   - the poems' section was `/poems` (entries at `/poems/:slug`), now `/poetry` and `/poetry/:slug`;
 *   - the projects' section was `/projects` (entries at `/projects/:slug`), now `/software` and `/software/:slug`.
 *
 * Every address that was valid keeps working: a permanent redirect to the same path under the current section, the query string untouched
 * (`/projects?tag=rail` -> `/software?tag=rail`, `/poems/x?view=full` -> `/poetry/x?view=full`). Only these two shapes are redirected:
 * anything deeper (`/projects/a/b`) was a 404 and stays one, as the router matches nothing for it.
 */

/** The status of the redirect: permanent. `301` (not `308`): these are GET pages, and every crawler and cache treats it as a move. */
export const LEGACY_REDIRECT_STATUS = 301;

/**
 * Where a legacy address of the kind's section now lives, as a path plus the original query string; null for an address that is not one of
 * its legacy ones. The slug segment is passed through as the request carried it (already percent-encoded), so nothing is decoded or encoded
 * twice.
 */
export function legacySectionTarget(kind: ContentKind, pathname: string, search: string): string | null {
  const section = SECTIONS[kind];
  const parts = pathname.split("/").filter(Boolean);
  if (!parts[0] || !section.formerSlugs.includes(parts[0]) || parts.length > 2) return null;
  const rest = parts[1] ? `/${parts[1]}` : "";
  return `/${section.slug}${rest}${search}`;
}

/** `/poems` and `/poems/:slug` -> `/poetry...` */
export const legacyPoemsTarget = (pathname: string, search: string) => legacySectionTarget("poem", pathname, search);

/** `/projects` and `/projects/:slug` -> `/software...` */
export const legacyProjectsTarget = (pathname: string, search: string) => legacySectionTarget("project", pathname, search);
