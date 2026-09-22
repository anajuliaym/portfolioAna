import * as THREE from 'three'
import { Effect, EffectAttribute } from 'postprocessing'
import { wrapEffect } from '@react-three/postprocessing'

/**
 * Pixel-art finishing pass for the Fragments garden's "Pixel" style: a crisp 1-texel contour from
 * depth discontinuities (stable — unlike the inverted-hull ink, whose projected width crawls between
 * texels at low resolution) and a snap to a small curated palette. Per-channel posterize and dither
 * looked like a low-quality render (Ana, 2026-09-22); a limited palette is what reads as pixel art.
 * Runs at the composer's (already tiny) resolution, so the contour is exactly one game pixel wide.
 */
/** The garden's game palette: a handful of curated colours per family, like a real sprite sheet. */
export const PALETTE = [
  // sky & clouds
  '#d7ebf3', '#b3d8e9', '#8fc3dd', '#ffffff', '#eef2f3',
  // grass & leaves, light to shadow
  '#d3e6a0', '#a9cf7a', '#7fb56e', '#5c9a57', '#427a46', '#2e5b38',
  // earth, trunk
  '#b98f66', '#8a6444', '#5e4130', '#3a2820',
  // petals, lily
  '#f9d3de', '#f2a0b4', '#d97a94', '#a9506f', '#f6dc9a', '#e6b84a', '#e8734f',
  // paper, ink
  '#f6ecd8', '#e2d2ae', '#1e1a22',
]

const fragment = /* glsl */ `
  uniform vec3 palette[PALETTE_N];
  uniform float edgeScale;

  float viewDepth(const in vec2 uv) {
    float d = readDepth(uv);
    return -getViewZ(d); // metres in front of the camera
  }

  // nearest palette colour, with a perceptual weighting so greens do not snap to greys
  vec3 quantize(const in vec3 c) {
    vec3 best = palette[0];
    float bd = 1e9;
    const vec3 w = vec3(0.30, 0.59, 0.11);
    for (int i = 0; i < PALETTE_N; i++) {
      vec3 d = c - palette[i];
      float dist = dot(d * d, w) + 0.25 * dot(d, d);
      if (dist < bd) { bd = dist; best = palette[i]; }
    }
    return best;
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    float zc = viewDepth(uv);
    float zl = viewDepth(uv - vec2(texelSize.x, 0.0));
    float zr = viewDepth(uv + vec2(texelSize.x, 0.0));
    float zd = viewDepth(uv - vec2(0.0, texelSize.y));
    float zu = viewDepth(uv + vec2(0.0, texelSize.y));
    // a contour where a nearer surface meets a farther one, drawn on the NEARER side only
    float jump = max(max(zl - zc, zr - zc), max(zd - zc, zu - zc));
    float thresh = edgeScale * (0.08 + zc * 0.05);
    float edge = step(thresh, jump);
    // the outline is the surface's own colour pushed two shades darker, then everything snaps to the palette
    vec3 col = mix(inputColor.rgb, inputColor.rgb * 0.45, edge);
    outputColor = vec4(quantize(col), inputColor.a);
  }
`

class PixelEdgeEffect extends Effect {
  constructor({ edgeScale = 1 }: { edgeScale?: number } = {}) {
    const cols = PALETTE.map((h) => new THREE.Color(h).convertSRGBToLinear())
    super('PixelEdgeEffect', fragment, {
      attributes: EffectAttribute.DEPTH,
      defines: new Map([['PALETTE_N', String(PALETTE.length)]]),
      uniforms: new Map<string, THREE.Uniform>([
        ['palette', new THREE.Uniform(cols)],
        ['edgeScale', new THREE.Uniform(edgeScale)],
      ]),
    })
  }
}

export const PixelEdge = wrapEffect(PixelEdgeEffect)
