import * as THREE from 'three'
import { Effect, EffectAttribute } from 'postprocessing'
import { wrapEffect } from '@react-three/postprocessing'

/**
 * Contour pass for the Fragments garden's "Pixel" style: a crisp, exactly-one-game-pixel outline
 * drawn where a nearer surface meets a farther one (depth discontinuity). It is stable frame to
 * frame — the inverted-hull ink's projected width crawled between texels at low resolution and
 * shimmered. Nothing else is done to the colours: the cel bands of the painted shader already give
 * flat game-like fills, and posterize / dither / palette snapping all read as a low-quality render
 * to Ana (2026-09-22). The outline is the surface's own colour pushed dark, like a sprite outline.
 */
const fragment = /* glsl */ `
  uniform float edgeScale;
  uniform float inkMix;

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
    // drawn on the NEARER side only, so the line hugs the object and never thickens into the background
    float jump = max(max(zl - zc, zr - zc), max(zd - zc, zu - zc));
    float thresh = edgeScale * (0.08 + zc * 0.05);
    float edge = step(thresh, jump);
    vec3 ink = inputColor.rgb * (1.0 - inkMix) + vec3(0.07, 0.055, 0.075) * inkMix;
    outputColor = vec4(mix(inputColor.rgb, ink, edge), inputColor.a);
  }
`

class PixelEdgeEffect extends Effect {
  constructor({ edgeScale = 1, inkMix = 0.8 }: { edgeScale?: number; inkMix?: number } = {}) {
    super('PixelEdgeEffect', fragment, {
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map<string, THREE.Uniform>([
        ['edgeScale', new THREE.Uniform(edgeScale)],
        ['inkMix', new THREE.Uniform(inkMix)],
      ]),
    })
  }
}

export const PixelEdge = wrapEffect(PixelEdgeEffect)
