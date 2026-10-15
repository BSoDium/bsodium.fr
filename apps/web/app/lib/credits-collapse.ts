/**
 * The phone's credits: shown as a short line at load (the OSM Foundation's attribution guidelines do not allow the credit to be
 * hidden behind an icon by default), then collapsed to the "i" button, automatically after `CREDITS_SHOWN_MS` or on the first map
 * interaction, whichever is first. At most once per surface per PAGE LOAD: the "already shown" guard lives in memory only (a
 * module-level set), so a remount in the same load (StrictMode, the globe unmounted under a phone's panel, a handover) and an
 * in-app (client-side) navigation never bring it back, while a reload or a new document load shows it again for 5 s: a visitor
 * arriving on a view always sees the credit by default. Nothing is stored. Pure and timer-injected (`setTimeout` is the global one:
 * tests use fake timers); components/attribution-button.tsx wires it. Documented in docs/design-system.md ("Map credits on a phone").
 */
export const CREDITS_SHOWN_MS = 5000;
export type CreditsSurface = "globe" | "street";

/** Surfaces whose line has been shown in this page load (module state: reset by a document load, kept by a client-side navigation). */
const shownThisLoad = new Set<CreditsSurface>();
/** Tests only: forget what has been shown, as a new document load does. */
export const resetCreditsShown = () => shownThisLoad.clear();

export interface CreditsCollapse {
  /** Begin (idempotent: a second call re-arms the timer of a line that is shown, and does nothing else). */
  start(): void;
  /** The first pan, zoom or tap on the map: collapse now. */
  interact(): void;
  /** Stop the timer (unmount, or a StrictMode effect cleanup); the state is kept. */
  stop(): void;
  readonly state: "idle" | "shown" | "collapsed";
}

export function createCreditsCollapse(opts: { surface: CreditsSurface; onChange(shown: boolean): void; ms?: number }): CreditsCollapse {
  const { surface, onChange, ms = CREDITS_SHOWN_MS } = opts;
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
      const seen = shownThisLoad.has(surface);
      shownThisLoad.add(surface);
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
