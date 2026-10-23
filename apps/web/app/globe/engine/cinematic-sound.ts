/**
 * The sound of the cinematic interlude (engine/cinematic.ts): a short parody of a studio's intro (`public/audio/universal-parody.mp3`, 14 s, trimmed
 * from the owner's file to a window round its stinger; the owner's own parody, supplied by them), played FAINTLY while the word is on the stage.
 *
 * Made so that nothing costs anything at the moment it starts: the file is fetched when the interlude is PLANNED (a few sessions in a hundred, and
 * only a returning visitor), long before it plays, into a plain audio element (no `AudioContext`: opening an audio device is a stall of 150 ms or
 * much more, on the main thread, in the frame the interlude begins in). Starting it is `play()` on an element that is already loaded.
 *
 * It only ever plays when the browser would let it (a page nobody has touched yet is not allowed a sound, and must not even try), when the tab is in
 * front, and unless the visitor asked for none (`?mute`, or sessionStorage "cinematic-mute" = "1"). It rises over `fadeInMs`, runs as long as the
 * interlude, and lets go over `fadeOutMs` at its end; cut short (a gesture, the globe going away) it fades at once (`SoundHandle.fade`).
 */

export const SOUND = {
  url: "/audio/universal-parody.mp3",
  /** The loudness, 0 to 1 of the element's volume: faint, a sound under the page's own (the file's own level is about -18 LUFS, loud). */
  volume: 0.22,
  /**
   * Where in the file it starts playing, seconds. The file is the source from 6.0 s on; the source's stinger (its loudest moment, the one hit
   * above its bed) is at 14.0 s, that is 8.0 s into the file, and it should fall when the word is landing, about 5 s into the interlude: so it
   * starts 3.0 s in (9.0 s of the source), at the interlude's own start. Move this to move the sound against the picture.
   */
  fromSec: 3.0,
  /** How long after the interlude begins it starts, ms. */
  delayMs: 0,
  fadeInMs: 800,
  fadeOutMs: 1200,
} as const;

export interface SoundHandle {
  /** Let go now, over `ms`. Safe to call twice, and after the end. */
  fade(ms?: number): void;
}

/** Whether a sound may be started now: asked for none, the tab behind, or no gesture yet are all a no. */
export function soundAllowed(): boolean {
  try {
    if (typeof document !== "undefined" && document.hidden) return false;
    if (new URLSearchParams(location.search).has("mute") || sessionStorage.getItem("cinematic-mute") === "1") return false;
    // A page nobody has touched may not play a sound, and trying logs a warning: where the browser says so (Chromium, Safari, Firefox), do not try.
    const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
    if (activation && !activation.hasBeenActive) return false;
    return true;
  } catch {
    return false;
  }
}

/** The part of an `HTMLAudioElement` this needs (a test gives a fake). */
export interface AudioLike {
  src: string;
  preload: string;
  volume: number;
  currentTime: number;
  readyState: number;
  load(): void;
  play(): Promise<void>;
  pause(): void;
  addEventListener(type: string, fn: () => void, o?: { once: boolean }): void;
}
type AudioFactory = () => AudioLike;
const browserAudio: AudioFactory = () => new Audio() as unknown as AudioLike;

let prepared: AudioLike | null = null;

/**
 * Fetch the file now (the interlude is planned): into an element that stays until it is used. Skipped where the visitor asked for none or the
 * connection saves data. Idempotent.
 */
export function prepareSound(make: AudioFactory = browserAudio): void {
  if (prepared) return;
  try {
    if (new URLSearchParams(location.search).has("mute") || sessionStorage.getItem("cinematic-mute") === "1") return;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (conn?.saveData) return;
    const el = make();
    el.preload = "auto";
    el.src = SOUND.url;
    el.volume = 0;
    el.load();
    prepared = el;
  } catch {
    prepared = null;
  }
}

/** Forget the prepared element (tests). */
export function forgetSound(): void {
  prepared = null;
}

/**
 * Play it for an interlude of `durationMs`. Null when no sound is to be made (see `soundAllowed`), else the handle that lets go of it. `make`
 * and `allowed` are for a test.
 */
export function startSound(durationMs: number, make: AudioFactory = browserAudio, allowed: boolean = soundAllowed()): SoundHandle | null {
  if (!allowed) return null;
  let el = prepared;
  prepared = null; // (an element plays once: the interlude is spent after it)
  if (!el) {
    try {
      el = make();
      el.preload = "auto";
      el.src = SOUND.url;
    } catch {
      return null;
    }
  }
  const audio = el;
  let done = false;
  let level = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  const timers: ReturnType<typeof setTimeout>[] = [];
  const set = (v: number) => {
    level = Math.max(0, Math.min(1, v));
    audio.volume = level;
  };
  const stop = () => {
    if (done) return;
    done = true;
    if (timer !== null) clearInterval(timer);
    for (const t of timers) clearTimeout(t);
    set(0);
    try {
      audio.pause();
    } catch {
      /* nothing to stop */
    }
  };
  /** Ramp the volume to `to` over `ms` (20 steps a second: a fade, not a frame loop). */
  const ramp = (to: number, ms: number, then?: () => void) => {
    if (timer !== null) clearInterval(timer);
    const from = level;
    const t0 = Date.now();
    timer = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / Math.max(1, ms));
      set(from + (to - from) * p);
      if (p >= 1) {
        if (timer !== null) clearInterval(timer);
        timer = null;
        then?.();
      }
    }, 50);
  };
  const begin = () => {
    if (done) return;
    try {
      audio.currentTime = SOUND.fromSec;
    } catch {
      /* not seekable yet: it starts from the top of the file, which is a few seconds early, not wrong */
    }
    set(0);
    // (refused, or the file is not there: silence, and nothing else)
    void audio.play().then(() => ramp(SOUND.volume, SOUND.fadeInMs), () => stop());
    timers.push(setTimeout(() => ramp(0, SOUND.fadeOutMs, stop), Math.max(0, durationMs - SOUND.delayMs - SOUND.fadeOutMs)));
  };
  const go = () => {
    // seeking needs the metadata: when the element has none yet (not fetched in time), wait for it
    if (audio.readyState >= 1) begin();
    else audio.addEventListener("loadedmetadata", begin, { once: true });
  };
  timers.push(setTimeout(go, SOUND.delayMs));
  return {
    fade(ms = 450) {
      if (done) return;
      for (const t of timers) clearTimeout(t);
      timers.length = 0;
      ramp(0, ms, stop);
      timers.push(setTimeout(stop, ms + 200));
    },
  };
}
