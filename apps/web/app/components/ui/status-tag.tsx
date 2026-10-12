import { statusLabel, type Status } from "~/lib/labelling";
import { cn } from "~/lib/utils";

type StatusTone = "default" | "muted" | "signal" | "solid" | "signal-solid";

const DEFAULT_TONE: Record<Status, StatusTone> = {
  published: "muted",
  draft: "muted",
  live: "default",
  archived: "muted",
  pending: "muted",
  error: "solid",
};

interface StatusTagProps {
  status: Status | (string & {});
  tone?: StatusTone;
  className?: string;
}

/**
 * A status as one plain word ("Draft"). The WORD is the state; the tone (muted, foreground, signal, solid) only adds. Show it only when
 * it tells the reader something: a published entry does not need to say so.
 */
export function StatusTag({ status, tone, className }: StatusTagProps) {
  const resolved = tone ?? DEFAULT_TONE[status as Status] ?? "default";
  return (
    <span data-slot="status-tag" data-status={status} data-tone={resolved === "muted" ? undefined : resolved} className={cn("ds-status", className)}>
      {statusLabel(status)}
    </span>
  );
}
