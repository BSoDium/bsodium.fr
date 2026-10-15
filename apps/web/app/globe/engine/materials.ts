/**
 * ShaderMaterials for the 1-bit look. All of them write raw sRGB (no lighting, no tone mapping), see the
 * `ColorManagement` note in renderer.ts. Visibility of borders is ordered-dither coverage, not alpha, so the
 * output never contains a blended pixel.
 */
import { Color, ShaderMaterial } from "three";
import { LEG_MODES, MODE_STYLE } from "../paths/modes";

const PASS_THROUGH_VERTEX = /* glsl */ `
  void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

/** The globe disc is a hair inside the lines (radius 1) so lines on the near side never z-fight with it. */
export const OCCLUDER_RADIUS = 0.998;

const DITHER_GLSL = /* glsl */ `
  float dither2(vec2 a) { return fract(a.x * 0.5 + a.y * a.y * 0.75); }
  float dither4(vec2 a) { return dither2(0.5 * a) * 0.25 + dither2(a); }
  // Discard fragments so that roughly \`coverage\` of pixels survive (ordered dither, stays 1-bit).
  void ditherDiscard(float coverage) { if (dither4(floor(gl_FragCoord.xy)) >= coverage) discard; }
`;

export function lineMaterial(coverage: number, stipple = 0): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uColor: { value: new Color() }, uCoverage: { value: coverage }, uStipple: { value: stipple } },
    vertexShader: PASS_THROUGH_VERTEX,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uCoverage; uniform float uStipple;
      ${DITHER_GLSL}
      void main() {
        ditherDiscard(uCoverage);
        // Regular stipple (every n-th pixel on the diagonal) reads as a dotted line at any angle.
        if (uStipple > 0.0 && mod(floor(gl_FragCoord.x) + floor(gl_FragCoord.y), uStipple) > 0.5) discard;
        gl_FragColor = vec4(uColor, 1.0);
      }
    `,
  });
}

/** The globe disc: writes the page colour and depth, so everything behind it is hidden and the ocean is invisible. */
export function occluderMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uColor: { value: new Color() } },
    vertexShader: PASS_THROUGH_VERTEX,
    fragmentShader: "uniform vec3 uColor; void main() { gl_FragColor = vec4(uColor, 1.0); }",
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
}

/**
 * Paths: every leg of every route, in one draw call (instanced: three copies of each segment, the second and third only for rail's
 * cross-ticks). Colours are SOLID palette tones, never an alpha: a faint tone per leg that steps up with the leg's length in art
 * pixels (`paths/lod.ts`, the same staircase as the borders' fade), and the ink for the legs of the selected place, up to the
 * draw-on front. Patterns run along the path in ART PIXELS (a buffer pixel is one: the buffer is the art grid), so they keep their
 * length at any zoom. Mode, leg and length ride in the vertex; the selection is a texel per leg (`uState`): changing it never
 * touches the geometry.
 *
 * Hidden behind the globe by the same analytic test as before (does the ray from the camera to this point enter the occluder
 * sphere first?), NOT by the depth buffer: a line one pixel wide would otherwise z-fight with the disc on a tilted surface, and the
 * test depends only on the position along the line, so a dash is cut across its length or not at all. Depth test and write are off.
 */
export const PATH_MAX_LEVELS = 12;

/** GLSL chain choosing a number by mode id `m` from the mode table (paths/modes.ts), so shader and style cannot drift. */
function modeChain(pick: (mode: (typeof LEG_MODES)[number]) => number): string {
  const f = (n: number) => n.toFixed(1);
  let out = f(pick(LEG_MODES[LEG_MODES.length - 1]!));
  for (let i = LEG_MODES.length - 2; i >= 0; i--) out = `m < ${f(MODE_STYLE[LEG_MODES[i]!].id + 0.5)} ? ${f(pick(LEG_MODES[i]!))} : ${out}`;
  return out;
}

export function pathMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uInk: { value: new Color() },
      uRamp: { value: Array.from({ length: PATH_MAX_LEVELS }, () => new Color()) },
      uFinal: { value: 8 },
      uFront: { value: 2 },
      uMarch: { value: 0 },
      uCell: { value: 0.01 },
      uPixel: { value: [0.01, 0.01] },
      uLift: { value: 1 },
      uState: { value: null },
      uTexSize: { value: [1, 1] },
      uFadeFrom: { value: 2 },
      uFadeFull: { value: 14 },
    },
    depthTest: false,
    depthWrite: false,
    vertexShader: /* glsl */ `
      attribute float aDist; attribute vec3 aInfo; attribute vec3 aTan; attribute float aCopy;
      uniform vec2 uPixel; uniform float uLift; uniform float uCell; uniform sampler2D uState; uniform vec2 uTexSize;
      uniform vec3 uRamp[${PATH_MAX_LEVELS}]; uniform float uFinal; uniform float uFadeFrom; uniform float uFadeFull;
      varying float vDist; varying float vLen; varying float vMode; varying float vState; varying float vCopy; varying float vVis;
      varying vec3 vPos; varying vec3 vFaint;
      void main() {
        float leg = aInfo.x;
        vec2 uv = vec2((mod(leg, uTexSize.x) + 0.5) / uTexSize.x, (floor(leg / uTexSize.x) + 0.5) / uTexSize.y);
        float st = texture2D(uState, uv).r;     // 0 none, ~0.5 starts at the selected place, 1 ends there
        bool rail = abs(aInfo.y - 1.0) < 0.5;
        // faint tone: a palette level that steps up with the leg's length in cells (0 = hidden)
        float f = clamp((aInfo.z / uCell - uFadeFrom) / (uFadeFull - uFadeFrom), 0.0, 1.0);
        float level = f <= 0.0 ? 0.0 : clamp(ceil(f * uFinal), 1.0, uFinal);
        vec3 tone = uRamp[0];
        for (int k = 1; k < ${PATH_MAX_LEVELS}; k++) { if (float(k) <= level + 0.5 && float(k) > level - 0.5) tone = uRamp[k]; }
        vFaint = tone;
        vVis = level > 0.5 ? 1.0 : 0.0;
        vDist = aDist; vLen = aInfo.z; vMode = aInfo.y; vState = st; vCopy = aCopy;
        // the ticks of a rail are copies 1 and 2; any other mode draws copy 0 only, and a leg nothing shows is clipped away
        if ((aCopy > 0.5 && !rail) || (level < 0.5 && st < 0.25)) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
        // uLift scales the height above the surface: 1 = lifted arc, 0 = on the ground (street scale).
        vec3 p = normalize(position) * (1.0 + (length(position) - 1.0) * uLift);
        vPos = p;
        vec4 c = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        if (aCopy > 0.5) {
          // across the line by one buffer pixel: along the axis the path is more perpendicular to on screen
          vec4 c1 = projectionMatrix * modelViewMatrix * vec4(p + aTan * 0.0005, 1.0);
          vec2 d = (c1.xy / c1.w - c.xy / c.w) / abs(uPixel);
          vec2 off = abs(d.x) > abs(d.y) ? vec2(0.0, 1.0) : vec2(1.0, 0.0);
          c.xy += (aCopy < 1.5 ? 1.0 : -1.0) * off * uPixel * c.w;
        }
        gl_Position = c;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uInk; uniform float uFront; uniform float uMarch; uniform float uCell;
      varying float vDist; varying float vLen; varying float vMode; varying float vState; varying float vCopy; varying float vVis;
      varying vec3 vPos; varying vec3 vFaint;
      // True when the occluder sphere lies between the camera and p.
      bool behindGlobe(vec3 p) {
        vec3 v = p - cameraPosition;
        float len = length(v);
        vec3 u = v / len;
        float b = dot(cameraPosition, u);
        float disc = b * b - (dot(cameraPosition, cameraPosition) - ${(OCCLUDER_RADIUS * OCCLUDER_RADIUS).toFixed(6)});
        if (disc <= 0.0) return false;
        float t = -b - sqrt(disc); // first hit
        return t > 0.0 && t < len;
      }
      void main() {
        bool lit = vState > 0.25;
        float t = vLen > 0.0 ? vDist / vLen : 0.0;
        if (vState > 0.75) t = 1.0 - t;         // a leg that ends at the place draws on from the place
        bool inked = lit && t <= uFront;
        if (!inked && vVis < 0.5) discard;
        float cells = vDist / uCell - (lit ? uMarch : 0.0);
        // mode ids (paths/modes.ts): 0 road, 1 rail, 2 ferry, 3 flight, 4 walk, 5 unknown
        float m = floor(vMode + 0.5);
        float period = ${modeChain((k) => MODE_STYLE[k].period)};
        float on = ${modeChain((k) => MODE_STYLE[k].on)};
        if (period > 0.5) {
          float u = mod(cells, period);
          // the rail's tick: one cell across the line at the middle of each dash
          if (vCopy > 0.5) { if (!(u >= on * 0.5 - 0.5 && u < on * 0.5 + 0.5)) discard; }
          else if (u >= on) discard;
        } else if (vCopy > 0.5) discard;
        if (behindGlobe(vPos)) discard;
        gl_FragColor = vec4(inked ? uInk : vFaint, 1.0);
      }`,
  });
}

/** Horizon outline: a circle in view space, drawn without a depth test. */
export function silhouetteMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color() },
      uC: { value: [0, 0, 1] },
      uE: { value: [1, 0, 0] },
      uN: { value: [0, 1, 0] },
      uInvD: { value: 0.2 },
    },
    vertexShader: /* glsl */ `
      attribute float aAngle; uniform vec3 uC; uniform vec3 uE; uniform vec3 uN; uniform float uInvD;
      void main() {
        float rad = sqrt(max(0.0, 1.0 - uInvD * uInvD));
        vec3 p = uC * uInvD + rad * (cos(aAngle) * uE + sin(aAngle) * uN);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: "uniform vec3 uColor; void main() { gl_FragColor = vec4(uColor, 1.0); }",
    depthTest: false,
  });
}
