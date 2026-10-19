/**
 * The `?caption-fps` overlay: what the caption's own rAF loop is doing on THIS machine, for a person to read off (docs/performance.md, "Hitches"):
 * the interval between the display frames the caption was drawn on (a histogram in buckets of the display's period, p50 / p95 / max), the
 * share of frames that were late, the display's period as the governor derived it, the rung of the load ladder, and whether the page is held.
 * Debug only: nothing is created without the flag, and it costs a DOM text write twice a second while the caption moves.
 */
export interface OverlayStats {
  period: number | null;
  lateShare: number;
  rung: { level: number; skip: number; dpr: number; slices: number };
  held: boolean;
}

export class FpsOverlay {
  private el: HTMLPreElement;
  private deltas: number[] = [];
  private js: number[] = [];
  private frames = 0;
  private t0 = 0;
  private shownAt = 0;

  constructor(host: HTMLElement, private stats: () => OverlayStats) {
    this.el = document.createElement("pre");
    this.el.setAttribute("aria-hidden", "true");
    Object.assign(this.el.style, {
      position: "fixed",
      left: "8px",
      bottom: "8px",
      zIndex: "100",
      margin: "0",
      padding: "6px 8px",
      font: "11px/1.35 ui-monospace, Menlo, monospace",
      color: "#fff",
      background: "rgba(0,0,0,0.72)",
      pointerEvents: "none",
      whiteSpace: "pre",
    } satisfies Partial<CSSStyleDeclaration>);
    this.el.textContent = "caption-fps: waiting for the caption to move";
    document.body.append(this.el);
    void host;
  }

  /** One drawn frame: its timestamp, the time since the previous one (0 for the first) and the draw's JS ms. */
  frame(ts: number, since: number, js: number): void {
    if (this.t0 === 0) this.t0 = ts;
    this.frames++;
    if (since > 0) {
      this.deltas.push(since);
      this.js.push(js);
      if (this.deltas.length > 240) {
        this.deltas.shift();
        this.js.shift();
      }
    }
    if (ts - this.shownAt >= 500) {
      this.shownAt = ts;
      this.render(ts);
    }
  }

  private render(ts: number): void {
    const st = this.stats();
    const d = [...this.deltas].sort((a, b) => a - b);
    const q = (p: number) => (d.length ? d[Math.min(d.length - 1, Math.floor(d.length * p))]!.toFixed(1) : "-");
    const p = st.period ?? 16.7;
    // histogram in buckets of the display's period: on time (<= 1.25 periods), one late (to 2), two (to 3), worse
    const bins = [0, 0, 0, 0];
    for (const x of this.deltas) bins[x <= 1.25 * p ? 0 : x <= 2.1 * p ? 1 : x <= 3.1 * p ? 2 : 3]!++;
    const n = Math.max(1, this.deltas.length);
    const bar = (k: number) => "#".repeat(Math.round((bins[k]! / n) * 30)).padEnd(30, ".");
    const fps = this.frames / Math.max(0.001, (ts - this.t0) / 1000);
    const js = this.js.length ? (this.js.reduce((a, b) => a + b, 0) / this.js.length).toFixed(2) : "-";
    this.el.textContent = [
      `caption-fps   ${fps.toFixed(1)} frames/s   display ${st.period ? `${st.period.toFixed(1)} ms (${(1000 / st.period).toFixed(0)} Hz)` : "deriving"}`,
      `delta ms      p50 ${q(0.5)}   p95 ${q(0.95)}   p99 ${q(0.99)}   max ${d.length ? d[d.length - 1]!.toFixed(1) : "-"}   draw JS ${js} ms`,
      `on time       ${bar(0)} ${((bins[0]! / n) * 100).toFixed(0)}%`,
      `1 late        ${bar(1)} ${((bins[1]! / n) * 100).toFixed(0)}%`,
      `2 late        ${bar(2)} ${((bins[2]! / n) * 100).toFixed(0)}%`,
      `worse         ${bar(3)} ${((bins[3]! / n) * 100).toFixed(0)}%`,
      `late share ${(st.lateShare * 100).toFixed(0)}%   rung ${st.rung.level} (every ${st.rung.skip} frame, dpr ${st.rung.dpr}, ${st.rung.slices} slices)   ${st.held ? "HELD" : "moving"}`,
    ].join("\n");
  }

  dispose(): void {
    this.el.remove();
  }
}
