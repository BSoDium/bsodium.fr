/**
 * The cinematic interlude on request (engine/cinematic.ts): the app's search palette has a hidden entry that plays it, and the palette and the globe are two islands of the
 * page that know nothing of each other, so the request is a window event. Whoever holds the home globe (`globe-canvas.tsx`) answers it by marking the request handled.
 */
export const PLAY_INTERLUDE_EVENT = "site:play-interlude";

export interface PlayInterludeRequest {
  /** Set by the globe that took the request. */
  handled: boolean;
}

/** Ask the home globe to play the interlude now. True when a globe took the request (it may still be a moment before it can start). */
export function requestInterlude(): boolean {
  if (typeof window === "undefined") return false;
  const detail: PlayInterludeRequest = { handled: false };
  window.dispatchEvent(new CustomEvent<PlayInterludeRequest>(PLAY_INTERLUDE_EVENT, { detail }));
  return detail.handled;
}
