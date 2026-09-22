import * as THREE from 'three'
import { Effect, EffectAttribute } from 'postprocessing'
import { wrapEffect } from '@react-three/postprocessing'

/**
 * Pixel-art finishing pass for the Fragments garden's "Pixel" style: a crisp 1-texel black
 * contour from depth discontinuities (stable — unlike the inverted-hull ink, whose projected
 * width crawls between texels at low resolution) plus a light colour posterize, so the low-res
 * render reads as a deliberate game look rather than a downscaled photo. Runs at the composer's
 * (already tiny) resolution, so the contour is exactly one on-screen "pixel" wide.
 */
const fragment = /* glsl */ `
  uniform float levels;
  uniform float edgeScale;

  float viewDepth(const in vec2 uv) {
    float d = readDepth(uv);
    return -getViewZ(d); // metres in front of the camera
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    float zc = viewDepth(uv);
    float zl = viewDepth(uv - vec2(texelSize.x, 0.0));
    float zr = viewDepth(uv + vec2(texelSize.x, 0.0));
    float zd = viewDepth(uv - vec2(0.0, texelSize.y));
    float zu = viewDepth(uv + vec2(0.0, texelSize.y));
    // a contour where a nearer surface meets a farther one: draw it on the NEARER side only, so the
    // line hugs the object and does not thicken into the background
    float jump = max(max(zl - zc, zr - zc), max(zd - zc, zu - zc));
    float thresh = edgeScale * (0.06 + zc * 0.045);
    float edge = step(thresh, jump);
    // posterize each channel into flat steps, like a limited palette
    vec3 col = floor(inputColor.rgb * levels + 0.5) / levels;
    outputColor = vec4(mix(col, vec3(0.07, 0.055, 0.07), edge), inputColor.a);
  }
`

class PixelEdgeEffect extends Effect {
  constructor({ levels = 14, edgeScale = 1 }: { levels?: number; edgeScale?: number } = {}) {
    super('PixelEdgeEffect', fragment, {
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map<string, THREE.Uniform>([
        ['levels', new THREE.Uniform(levels)],
        ['edgeScale', new THREE.Uniform(edgeScale)],
      ]),
    })
  }
}

export const PixelEdge = wrapEffect(PixelEdgeEffect)
