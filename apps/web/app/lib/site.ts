/**
 * The site's identity: what the head tags, the sitemap, the robots file and the share cards say about it. Pure (no environment access):
 * `site.server.ts` reads `CATALYST_SITE_URL` and calls these. Documented in docs/web-architecture.md, "Production readiness".
 *
 * ONE constant (`SITE`) holds what the site calls itself, and everything visible reads it: the home hero's name, the head tags, the
 * manifest, the error pages, the share image's alt text. Facts only: nothing here is a claim the owner did not make. The code name of
 * the project ("Catalyst") lives in the repository, the packages and the environment variables, and never in the site's own text
 * (`lib/identity.test.ts` renders the main routes and the built manifest and fails if it shows up).
 */
export const SITE = {
  /** The owner's name: the site's name, the home hero's headline, the title template's suffix. */
  name: "Elliot Négrel-Jerzy",
  /** The name's two halves: the hero sets the first at the heavy end of the weight axis (800) and the second at the thin end (200). */
  givenName: "Elliot",
  familyName: "Négrel-Jerzy",
  /** For tight spots (the home-screen label under an icon, 12 characters or fewer). */
  shortName: "Elliot N.-J.",
  /** Who: what the owner does, and where. The hero says "<role> based in <location>." */
  role: "Front-end and UX software engineer",
  location: "Paris",
  /** What: the fields, in the owner's order. A sentence of its own. */
  speciality: "Data visualisation, geospatial and cartography interfaces, design systems, computer graphics",
} as const;

/** Who the owner is, as a sentence: the first half of the line under the name on the home page (all that stays of it in a very short window). */
export const SITE_IDENTITY = `${SITE.role} based in ${SITE.location}.`;
/** What the owner works on, as a sentence: the second half. */
export const SITE_FOCUS = `${SITE.speciality}.`;
/** The sentence under the name on the home page: the same facts as the description, in the owner's words. */
export const SITE_TAGLINE = `${SITE_IDENTITY} ${SITE_FOCUS}`;

export const SITE_NAME = SITE.name;
export const SITE_DESCRIPTION = `${SITE.role} in ${SITE.location}. ${SITE.speciality}.`;
/** Where an entry or a list has no summary of its own: "Poetry from the archive of <name>." */
export const archiveLine = (what: string) => `${what} from the archive of ${SITE.name}.`;
/** The home page's title: the template (`<Page> · <name>`) has no page to put first, so it says who the site belongs to and what they do. */
export const SITE_TITLE = `${SITE_NAME} · ${SITE.role}`;
/** The temporary main domain of the new site; `CATALYST_SITE_URL` overrides it (the owner's move to the final domain is that one variable). */
export const DEFAULT_SITE_URL = "https://v2.bsodium.fr";

/**
 * What the home screen asks of the visitor, as the two short phrases that wrap the planet in capitals (`GlobeProps.captionPhrases`): what to do with
 * the globe. Interface copy, not a fact about the owner; the hero's how-to line says the same in the page as text (visually hidden while the caption
 * is there).
 */
export const SITE_CALL = ["Drag to explore", "Pick a place"] as const;

/** The role inside a sentence, as the share image's alt text says it: lower-cased where it starts a clause, but "UX" stays "UX" (never `role.toLowerCase()`). */
export const ROLE_IN_SENTENCE = "front-end and UX software engineer";

/** The share image of every page that has no entry cover of its own (`public/og-default.png`, drawn by `scripts/brand/build.mjs`). */
export const DEFAULT_SHARE_IMAGE = {
  path: "/og-default.png",
  width: 1200,
  height: 630,
  type: "image/png",
  alt: `${SITE.name}, ${ROLE_IN_SENTENCE} in ${SITE.location}: a wireframe globe with two places joined by a route.`,
} as const;

/** The page colours of the two schemes (`--background` in app.css; a test keeps them equal): the browser UI's `theme-color`. */
export const THEME_COLORS = { light: "#fbfbfb", dark: "#0a0a0a" } as const;

/**
 * The origin of the site from a raw `CATALYST_SITE_URL`: trimmed, an empty value counts as unset, only `https:` (or `http:` for
 * localhost, to test a production build) is accepted, and whatever follows the origin (path, query, credentials) is dropped. A bad
 * value reports once through `warn` and the default is used: a typo must never break the pages.
 */
export function resolveSiteUrl(raw: string | undefined, warn: (message: string) => void = () => {}): string {
  const value = raw?.trim();
  if (!value) return DEFAULT_SITE_URL;
  try {
    const u = new URL(value);
    const local = u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "[::1]";
    if (u.protocol === "https:" || (u.protocol === "http:" && local)) return u.origin;
    warn(`[site] CATALYST_SITE_URL ignored (only https is accepted); using ${DEFAULT_SITE_URL}`);
  } catch {
    warn(`[site] CATALYST_SITE_URL ignored (not an absolute URL); using ${DEFAULT_SITE_URL}`);
  }
  return DEFAULT_SITE_URL;
}

/**
 * Whether search engines may index what this server answers. Only the production site itself: the request must come in on the host of
 * `siteUrl` (so the `*.vercel.app` address of the same deployment, a preview URL or localhost are all kept out) and Vercel must not say
 * the deployment is a preview or a development one.
 */
export function isIndexableHost({ siteUrl, host, vercelEnv }: { siteUrl: string; host: string | null | undefined; vercelEnv?: string | undefined }): boolean {
  if (vercelEnv === "preview" || vercelEnv === "development") return false;
  if (!host) return false;
  try {
    return host.trim().toLowerCase() === new URL(siteUrl).host.toLowerCase();
  } catch {
    return false;
  }
}

/** The host a request was addressed to: the proxy's `x-forwarded-host` (first value) when present, else `host`. */
export function requestHost(headers: Pick<Headers, "get">): string | null {
  return headers.get("x-forwarded-host")?.split(",")[0]?.trim() || headers.get("host");
}
