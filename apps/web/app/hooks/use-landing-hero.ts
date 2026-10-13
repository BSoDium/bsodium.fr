import { useCallback, useEffect, useMemo, useRef } from "react";
import type { GlobeViewState } from "~/globe";
import { createHeroMachine, HERO_IDLE_MS, isWorldView, type HeroMachine } from "~/lib/hero-machine";

/**
 * The idle delay. Test-only override, in debug mode only (`?globe-debug`, what the browser checks run in; the same convention as
 * `?spin-idle`): `?hero-idle=MS` (100 to 60000). Everywhere else it is `HERO_IDLE_MS`.
 */
function idleMs(): number {
  if (typeof window === "undefined") return HERO_IDLE_MS;
  try {
    const q = new URLSearchParams(location.search);
    const debug = q.has("globe-debug") || sessionStorage.getItem("globe-debug") === "1";
    const ms = Number(q.get("hero-idle") ?? sessionStorage.getItem("hero-idle"));
    return debug && ms >= 100 && ms <= 60_000 ? ms : HERO_IDLE_MS;
  } catch {
    return HERO_IDLE_MS;
  }
}

export interface LandingHero {
  machine: HeroMachine;
  /** `GlobeProps.onInteract`: a gesture started on the globe. Stable. */
  onInteract(): void;
  /** `GlobeProps.onViewChange`'s companion: feed it every reported view (cheap: a comparison, and a notification only when the world view is left or reached). Stable. */
  onView(view: GlobeViewState): void;
}

/**
 * The landing hero's state (`lib/hero-machine.ts`) wired to the shell: the globe's gestures and its reported views go in, and the
 * hero reads the machine as an external store, so only the hero re-renders when it changes (not the shell, not the globe).
 *
 * `open` is whether a place or an entry is open (the panel): the hero is not the page then, and the world view is not "the world view".
 */
export function useLandingHero(open: boolean): LandingHero {
  const machine = useMemo(() => createHeroMachine({ idleMs: idleMs() }), []);
  const zoomAtWorld = useRef(true);
  const openRef = useRef(open);

  const sync = useCallback(() => machine.setWorld(zoomAtWorld.current && !openRef.current), [machine]);
  const onInteract = useCallback(() => machine.interact(), [machine]);
  const onView = useCallback(
    (view: GlobeViewState) => {
      const atWorld = isWorldView(view);
      if (atWorld === zoomAtWorld.current) return;
      zoomAtWorld.current = atWorld;
      sync();
    },
    [sync],
  );

  useEffect(() => {
    openRef.current = open;
    sync();
  }, [open, sync]);
  useEffect(() => () => machine.stop(), [machine]);

  return useMemo(() => ({ machine, onInteract, onView }), [machine, onInteract, onView]);
}
