import { Link } from "react-router";
import { cn } from "~/lib/utils";

interface Tag {
  label: string;
  /** Makes the tag a link (internal links should use a path). */
  href?: string;
}

/**
 * Tags as plain muted text separated by middle dots (the dots are CSS, so the list reads as a list). Link tags keep a 44 px touch
 * target on phones (the line stays as tall as the text). No chips, no outlines.
 */
export function TagList({ tags, label, className }: { tags: readonly Tag[]; label: string; className?: string }) {
  if (tags.length === 0) return null;
  return (
    <ul aria-label={label} data-slot="tag-list" className={cn("ds-tags", className)}>
      {tags.map((tag) => (
        <li key={tag.label}>
          {tag.href ? (
            tag.href.startsWith("/") ? (
              <Link to={tag.href}>{tag.label}</Link>
            ) : (
              <a href={tag.href}>{tag.label}</a>
            )
          ) : (
            <span>{tag.label}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
