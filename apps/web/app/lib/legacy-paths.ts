/**
 * Addresses that existed once and still must work. Pure (no `Response`): `routes/legacy-poems.ts` answers with the redirect this computes.
 *
 * The poems' section was `/poems` with its entries at `/poems/:slug`; the owner renamed the section "Poetry" and it moved to `/poetry` and
 * `/poetry/:slug` (`KIND_PATHS.poem`). Every address that was valid keeps working: a permanent redirect to the same path under `/poetry`,
 * the query string untouched (`/poems?tag=night` -> `/poetry?tag=night`, `/poems/x?view=full` -> `/poetry/x?view=full`). Only these two shapes
 * are redirected: anything deeper (`/poems/a/b`) was a 404 and stays one, as the router matches nothing for it.
 */

/** The status of the redirect: permanent. `301` (not `308`): these are GET pages, and every crawler and cache treats it as a move. */
export const LEGACY_REDIRECT_STATUS = 301;

/**
 * Where a legacy address now lives, as a path plus the original query string; null for an address that is not a legacy one. The slug
 * segment is passed through as the request carried it (already percent-encoded), so nothing is decoded or encoded twice.
 */
export function legacyPoemsTarget(pathname: string, search: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "poems" || parts.length > 2) return null;
  const rest = parts[1] ? `/${parts[1]}` : "";
  return `/poetry${rest}${search}`;
}
