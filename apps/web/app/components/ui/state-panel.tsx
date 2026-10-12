import type { ReactNode } from "react";
import { cn } from "~/lib/utils";
import { Frame } from "./frame";
import { StatusTag } from "./status-tag";

/** A grey block with a slow scan sweep (`.ds-skeleton`). Sized by `className`. Decorative: the parent announces the loading. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" data-slot="skeleton" className={cn("ds-skeleton h-4", className)} />;
}

interface StatePanelProps {
  state: "loading" | "empty" | "error";
  /** The headline. Required for empty and error; loading defaults to "Loading". */
  title?: string;
  /** One calm sentence: what happened and what to do. */
  description?: ReactNode;
  /** A short code worth keeping on an error page (`500`, `404`), set in the mono face above the headline. Empty states have none. */
  code?: string;
  /** A recovery action (a retry button, a link home). */
  action?: ReactNode;
  /** The headline's level (default 3); pick the one that fits the page's outline, so a page whose h1 is followed by this panel uses 2, and a panel that is the page's content uses 1. */
  headingLevel?: 1 | 2 | 3 | 4;
  /** Gives the headline an id and makes it focusable by script (`tabIndex -1`), for a panel whose focus goes to its heading. */
  titleId?: string;
  className?: string;
}

/**
 * The three non-content states of a data view (docs/design-system.md, "States"). Loading is a polite live region with a skeleton of
 * the content's shape; empty is one muted line (no box, no icon, no code: nothing is wrong); error is an alert with a plain sentence
 * and a way out. None of them blames the user, and none relies on colour.
 */
export function StatePanel({ state, title, description, code, action, headingLevel = 3, titleId, className }: StatePanelProps) {
  const Heading = `h${headingLevel}` as "h1" | "h2" | "h3" | "h4";
  if (state === "loading") {
    return (
      <div role="status" aria-busy="true" data-state="loading" className={cn("flex flex-col gap-3", className)}>
        <span className="sr-only">{title ?? "Loading"}</span>
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-6 w-4/5" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-11/12" />
        <Skeleton className="h-3 w-3/5" />
      </div>
    );
  }
  if (state === "empty") {
    return (
      <div data-state="empty" className={cn("flex flex-col items-start gap-3", className)}>
        <Heading id={titleId} tabIndex={titleId ? -1 : undefined} className={cn("m-0 outline-offset-4", headingLevel === 1 ? "text-2xl font-semibold tracking-tight" : "text-base font-normal text-muted-foreground")}>
          {title}
        </Heading>
        {description && <p className="m-0 text-base text-muted-foreground">{description}</p>}
        {action}
      </div>
    );
  }
  return (
    <Frame role="alert" data-state="error" variant="active" padding="lg" className={cn("flex flex-col items-start gap-3", className)}>
      <div className="flex w-full items-center justify-between gap-3">
        {code ? <span className="ds-meta">{code}</span> : <span />}
        <StatusTag status="error" />
      </div>
      <Heading id={titleId} tabIndex={titleId ? -1 : undefined} className="m-0 text-2xl font-semibold tracking-tight outline-offset-4">
        {title}
      </Heading>
      {description && <p className="m-0 text-base text-muted-foreground">{description}</p>}
      {action}
    </Frame>
  );
}
