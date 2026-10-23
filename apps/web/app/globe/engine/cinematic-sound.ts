/**
 * The faint swell that comes in with the cinematic interlude's word (engine/cinematic.ts): synthesized with the Web Audio API, no file, nothing fetched,
 * and nothing of anyone's recording: a soft pad of stacked fifths (D and A, an octave apart) that opens up as it rises, holds, and lets go.
 *
 * It only ever plays when the browser would let it (a page that has not been touched yet is not allowed a sound, and must not even try: it would
 * log a warning), when the tab is in front, and unless the visitor asked for none (`?mute`, or sessionStorage "cinematic-mute" = "1"). It begins
 * `delayMs` after it is started (the word comes in after the rows have left), runs as long as the interlude does, and fades out when the interlude is
 * cut short (`SwellHandle.fade`). The context is made for it and closed after it: nothing is kept at rest.
 */

export const SWELL = {
  /** The master gain at its loudest: faint, a sound under the page's own, never over it. */
  peak: 0.045,
  /** The three parts of the swell, ms: it rises, holds, and lets go. */
  attackMs: 3400,
  holdMs: 1500,
  releaseMs: 2600,
  /** The pad: D2, A2, D3, A3, D4 (Hz), each as two oscillators a few cents apart (a pad, not a tone), the higher ones quieter. */
  notes: [
    { hz: 73.42, level: 1 },
    { hz: 110.0, level: 0.8 },
    { hz: 146.83, level: 0.7 },
    { hz: 220.0, level: 0.45 },
    { hz: 293.66, level: 0.25 },
  ],
  detuneCents: 5,
  /** The low-pass that opens with the swell (Hz): dark at first, bright at the top. */
  filter: { from: 320, to: 1900 },
} as const;

/** The swell's timeline in seconds from its start (a pure function of `SWELL`, for the schedule and its test). */
export function swellTimes(delayMs: number): { begin: number; peak: number; release: number; end: number } {
  const s = (ms: number) => ms / 1000;
  const begin = s(delayMs);
  const peak = begin + s(SWELL.attackMs);
  const release = peak + s(SWELL.holdMs);
  return { begin, peak, release, end: release + s(SWELL.releaseMs) };
}

/** What the swell needs of an audio context (a structural subset of `AudioContext`: a test gives a fake). */
export interface SwellContext {
  readonly currentTime: number;
  readonly state: string;
  readonly destination: unknown;
  resume(): Promise<void>;
  close(): Promise<void>;
  createGain(): { gain: SwellParam; connect(n: unknown): unknown; disconnect(): void };
  createBiquadFilter(): { type: string; frequency: SwellParam; Q: { value: number }; connect(n: unknown): unknown };
  createOscillator(): { type: string; frequency: { value: number }; detune: { value: number }; connect(n: unknown): unknown; start(t: number): void; stop(t: number): void };
}
export interface SwellParam {
  value: number;
  setValueAtTime(v: number, t: number): unknown;
  linearRampToValueAtTime(v: number, t: number): unknown;
  cancelScheduledValues(t: number): unknown;
}

export interface SwellHandle {
  /** Let go now, over `ms`, and release the context. Safe to call twice, and after the end. */
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

function browserContext(): SwellContext | null {
  const w = globalThis as unknown as { AudioContext?: new () => SwellContext; webkitAudioContext?: new () => SwellContext };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return null;
  try {
    return new Ctor();
  } catch {
    return null;
  }
}

/**
 * Start the swell `delayMs` from now. Returns null when no sound is to be made (see `soundAllowed`), else the handle that lets go of it.
 * `ctx` and `allowed` are for a test; a page gives neither.
 */
export function startSwell(delayMs: number, ctx: SwellContext | null = null, allowed: boolean = soundAllowed()): SwellHandle | null {
  if (!allowed) return null;
  const audio = ctx ?? browserContext();
  if (!audio) return null;
  const t0 = audio.currentTime;
  const at = swellTimes(delayMs);
  const master = audio.createGain();
  master.gain.setValueAtTime(0, t0);
  master.gain.setValueAtTime(0, t0 + at.begin);
  master.gain.linearRampToValueAtTime(SWELL.peak, t0 + at.peak);
  master.gain.setValueAtTime(SWELL.peak, t0 + at.release);
  master.gain.linearRampToValueAtTime(0, t0 + at.end);
  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 0.7;
  filter.frequency.setValueAtTime(SWELL.filter.from, t0 + at.begin);
  filter.frequency.linearRampToValueAtTime(SWELL.filter.to, t0 + at.peak);
  filter.frequency.linearRampToValueAtTime(SWELL.filter.from * 1.5, t0 + at.end);
  filter.connect(master);
  master.connect(audio.destination);
  const oscillators: { stop(t: number): void }[] = [];
  const total = SWELL.notes.reduce((a, n) => a + n.level, 0) * 2;
  for (const note of SWELL.notes) {
    for (const side of [-1, 1]) {
      const osc = audio.createOscillator();
      osc.type = note.hz < 200 ? "sawtooth" : "triangle";
      osc.frequency.value = note.hz;
      osc.detune.value = side * SWELL.detuneCents;
      const level = audio.createGain();
      level.gain.value = note.level / total;
      osc.connect(level);
      level.connect(filter);
      osc.start(t0 + at.begin);
      osc.stop(t0 + at.end + 0.1);
      oscillators.push(osc);
    }
  }
  void audio.resume().catch(() => {});
  let done = false;
  const release = () => {
    if (done) return;
    done = true;
    void audio.close().catch(() => {});
  };
  // the context is released a moment after the swell has ended (the page must keep nothing)
  const closer = setTimeout(release, (at.end + 0.5) * 1000);
  return {
    fade(ms = 450) {
      if (done) return;
      clearTimeout(closer);
      const now = audio.currentTime;
      const seconds = Math.max(0.05, ms / 1000);
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + seconds);
      for (const o of oscillators) o.stop(now + seconds + 0.05);
      setTimeout(release, (seconds + 0.15) * 1000);
    },
  };
}
