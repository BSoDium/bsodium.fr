/**
 * Where the nodes of the semantic zoom are on screen for the frame being drawn, per node index of the `LodTree`: filled by
 * whichever renderer draws (the Three.js globe, the street overlay) and read by the label layers and by picking, so
 * drawing, labels and hit areas can never disagree. Container CSS px. Only the entries of the tree's visible nodes are
 * meaningful.
 */
export class NodeScreen {
  /** Centre of the node's snapped art-pixel cell (a place) or of its box (a group). */
  readonly x: Float64Array;
  readonly y: Float64Array;
  /** 0 at the limb, 1 at the view centre (labels near the limb are dropped). */
  readonly facing: Float32Array;
  /** 1 when the node is drawn: its centre passed the whole-or-nothing visibility rule (front hemisphere, clear of the limb). */
  readonly shown: Uint8Array;
  /** A group's box: the outer edges in container CSS px (whole art cells, `snapBox`); unused for places. */
  readonly bx0: Float64Array;
  readonly by0: Float64Array;
  readonly bx1: Float64Array;
  readonly by1: Float64Array;
  /**
   * The same box as the projection puts it, NOT snapped to art cells (container CSS px; NaN when the renderer did not fill it). The drawn box
   * is `bx0..by1`, a whole number of cells that steps as the camera moves; a label follows THIS rectangle, so it moves smoothly
   * (engine/box-scene.ts, docs/web-architecture.md "Labels move smoothly").
   */
  readonly fx0: Float64Array;
  readonly fy0: Float64Array;
  readonly fx1: Float64Array;
  readonly fy1: Float64Array;

  constructor(size: number) {
    const n = Math.max(1, size);
    this.x = new Float64Array(n);
    this.y = new Float64Array(n);
    this.facing = new Float32Array(n);
    this.shown = new Uint8Array(n);
    this.bx0 = new Float64Array(n);
    this.by0 = new Float64Array(n);
    this.bx1 = new Float64Array(n);
    this.by1 = new Float64Array(n);
    this.fx0 = new Float64Array(n).fill(NaN);
    this.fy0 = new Float64Array(n).fill(NaN);
    this.fx1 = new Float64Array(n).fill(NaN);
    this.fy1 = new Float64Array(n).fill(NaN);
  }
}
