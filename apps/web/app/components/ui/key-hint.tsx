import { useEffect, useState } from "react";
import { isMac } from "~/lib/platform";
import { cn } from "~/lib/utils";
import { Icon } from "./icon";

interface KeyHintProps {
  /** The key after the modifier (default K: the quick search). */
  keyName?: string;
  className?: string;
}

/**
 * The hint of a keyboard shortcut: the command key's icon (Mac) or the word "Ctrl" (elsewhere), then the key, as plain muted text: no
 * border, no background, no box (owner, 2026-10-13: a key cap drawn as a box, nested in a boxed row, was ugly). Decorative: the control
 * that holds it names the shortcut for assistive technology (`aria-keyshortcuts`). The platform is only known in the browser, so the
 * server and the first client render both draw an empty box of the final width (no layout shift, no hydration difference) and the
 * contents come after hydration.
 */
export function KeyHint({ keyName = "K", className }: KeyHintProps) {
  const [mac, setMac] = useState<boolean | null>(null);
  useEffect(() => setMac(isMac()), []);
  return (
    <kbd aria-hidden="true" className={cn("ds-kbd", className)}>
      {mac !== null && (
        <>
          {mac ? <Icon name="command" size="inline" /> : <span>Ctrl</span>}
          <span>{keyName}</span>
        </>
      )}
    </kbd>
  );
}
