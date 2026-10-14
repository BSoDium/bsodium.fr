/**
 * The phone's credits: shown as a short line at load (the OSM Foundation's attribution guidelines do not allow the credit to be
 * hidden behind an icon by default), then collapsed to the "i" button, automatically after `CREDITS_SHOWN_MS` or on the first map
 * interaction, whichever is first. At most ONCE per page session per surface: the guard is written to `sessionStorage` when the line
 * is first shown, so a remount (the globe is unmounted under a phone's panel), a reload in the same tab or a handover never
 * brings it back. Pure and timer-injected (`setTimeout` is the global one: tests use fake timers); components/attribution-button.tsx
 * wires it. Documented in docs/design-system.md ("Map credits on a phone").
 */
export const CREDITS_SHOWN_MS = 5000;
export type CreditsSurface = "globe" | "street";
export const creditsGuardKey = (surface: CreditsSurface) => `credits-shown:${surface}`;

type GuardStorage = Pick<Storage, "getItem" | "setItem">;

export interface CreditsCollapse {
  /** Begin (idempotent: a second call re-arms the timer of a line that is shown, and does nothing else). */
  start(): void;
  /** The first pan, zoom or tap on the map: collapse now. */
  interact(): void;
  /** Stop the timer (unmount, or a StrictMode effect cleanup); the state is kept. */
  stop(): void;
  readonly state: "idle" | "shown" | "collapsed";
}

/** `storage` null (no storage) = the guard is the instance's own state only. A throwing storage is treated as absent. */
export function createCreditsCollapse(opts: { surface: CreditsSurface; storage: GuardStorage | null; onChange(shown: boolean): void; ms?: number }): CreditsCollapse {
  const { surface, storage, onChange, ms = CREDITS_SHOWN_MS } = opts;
  let state: CreditsCollapse["state"] = "idle";
  let timer: ReturnType<typeof setTimeout> | undefined;
  const clear = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  const collapse = () => {
    if (state !== "shown") return;
    clear();
    state = "collapsed";
    onChange(false);
  };
  return {
    get state() {
      return state;
    },
    start() {
      if (state === "shown") {
        clear();
        timer = setTimeout(collapse, ms);
        return;
      }
      if (state !== "idle") return;
      let seen = false;
      try {
        seen = storage?.getItem(creditsGuardKey(surface)) === "1";
        if (!seen) storage?.setItem(creditsGuardKey(surface), "1");
      } catch {
        // storage blocked: shown once per instance, which is the most it can promise
      }
      if (seen) {
        state = "collapsed";
        return;
      }
      state = "shown";
      onChange(true);
      timer = setTimeout(collapse, ms);
    },
    interact: collapse,
    stop: clear,
  };
}
