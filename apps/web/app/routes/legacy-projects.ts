import { redirect } from "react-router";
import { LEGACY_REDIRECT_STATUS, legacyProjectsTarget } from "~/lib/legacy-paths";
import { STATIC_SECURITY_HEADERS } from "~/lib/security-headers";

/**
 * `/projects` and `/projects/:slug` (a resource route: no UI, mounted twice in `routes.ts`): the section's previous addresses, now `/software`
 * and `/software/:slug`. A permanent redirect that keeps the query string (`?tag=`, `?view=full`), answered by the server before any page is
 * built. A day at the browser and the CDN: long enough to be a saving, short enough to correct a mistake. Same shape as `legacy-poems.ts`.
 */
export function loader({ request }: { request: Request }) {
  const { pathname, search } = new URL(request.url);
  const target = legacyProjectsTarget(pathname, search);
  if (!target) throw new Response("Not Found", { status: 404 });
  return redirect(target, {
    status: LEGACY_REDIRECT_STATUS,
    headers: { ...STATIC_SECURITY_HEADERS, "Cache-Control": "public, max-age=3600, s-maxage=86400" },
  });
}
