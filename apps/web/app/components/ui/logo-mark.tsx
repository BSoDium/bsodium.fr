import type { SVGProps } from "react";
import { SITE_NAME } from "~/lib/site";
import { cn } from "~/lib/utils";

/**
 * The mark's outline: a 16 x 16 grid of square pixels, one path (scripts/brand/mark.mjs is the source; `logo-mark.test.ts` fails if this
 * string and `public/favicon.svg` ever differ from it).
 */
export const MARK_PATH =
  "M0 0h10v1h-10zM0 1h10v1h-10zM0 2h10v1h-10zM0 3h10v1h-10zM0 4h8v1h-8zM10 4h2v1h-2zM0 5h6v1h-6zM10 5h4v1h-4zM0 6h5v1h-5zM10 6h5v1h-5zM0 7h5v1h-5zM10 7h5v1h-5zM0 8h4v1h-4zM10 8h6v1h-6zM0 9h4v1h-4zM10 9h6v1h-6zM4 10h12v1h-12zM4 11h12v1h-12zM5 12h10v1h-10zM5 13h10v1h-10zM6 14h8v1h-8zM8 15h4v1h-4z";

interface LogoMarkProps extends Omit<SVGProps<SVGSVGElement>, "viewBox" | "children"> {
  /** Rendered size in CSS px. A whole multiple of 16 keeps every pixel of the mark crisp (default 32). */
  size?: number;
  /** An accessible name. Without it the mark is decorative (`aria-hidden`), which is right next to the site's name. */
  title?: string;
}

/**
 * The site's mark: a square and a disc overlapping, the overlap knocked out, in the current text colour (so it follows both colour
 * schemes). It is not in the header (the header carries the site's name as text); it is for the places that want the brand and nothing
 * else: the styleguide, and `LogoWordmark` below.
 */
export function LogoMark({ size = 32, title, ...rest }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="currentColor"
      shapeRendering="crispEdges"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...rest}
    >
      <path d={MARK_PATH} />
    </svg>
  );
}

/**
 * The mark and the name side by side: the name in the display weight of the site's type (semibold, tight), the mark at the height of
 * its capitals. The name is text, not an image, so it is read, selected and translated like any other. `size` is the mark's (a multiple
 * of 16); the type follows it.
 */
export function LogoWordmark({ size = 16, name = SITE_NAME, className }: { size?: number; name?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-[0.5em] font-semibold tracking-tight text-foreground", className)} style={{ fontSize: size * 1.25 }}>
      <LogoMark size={size} />
      <span>{name}</span>
    </span>
  );
}
