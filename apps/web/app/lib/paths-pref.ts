/**
 * The visitor's "Paths" switch (every route leg drawn on the map): kept per browser in `localStorage`, default ON. Storage can be
 * missing or throw (a private window, blocked site data), so every access is guarded and the page works without it.
 */
export const PATHS_STORAGE_KEY = "paths-layer";

/** The stored choice; `true` when nothing is stored or storage is unavailable. */
export function readPathsPref(storage?: Pick<Storage, "getItem">): boolean {
  try {
    const s = storage ?? window.localStorage;
    return s.getItem(PATHS_STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function writePathsPref(on: boolean, storage?: Pick<Storage, "setItem" | "removeItem">): void {
  try {
    const s = storage ?? window.localStorage;
    if (on) s.removeItem(PATHS_STORAGE_KEY);
    else s.setItem(PATHS_STORAGE_KEY, "off");
  } catch {
    // no storage: the choice lasts for this page view
  }
}
