import * as THREE from 'three'
import { Effect, EffectAttribute } from 'postprocessing'
import { wrapEffect } from '@react-three/postprocessing'

/**
 * Contour pass for the Fragments garden's "Pixel" style: a crisp, exactly-one-game-pixel outline
 * drawn where a nearer surface meets a farther one (depth discontinuity). It is stable frame to
 * frame — the inverted-hull ink's projected width crawled between texels at low resolution and
 * shimmered. Nothing else is done to the colours: the cel bands of the painted shader already give
 * flat game-like fills, and posterize / dither / palette snapping all read as a low-quality render
 * to Ana (2026-09-22). The outline is solid near-black ink, one game pixel, continuous (Ana asked for
 * black, static, homogeneous lines without breaks).
 */
const fragment = /* glsl */ `
  uniform float edgeScale;
  uniform vec3 inkColor;

  float viewDepth(const in vec2 uv) {
    float d = readDepth(uv);
    return -getViewZ(d); // metres in front of the camera
  }

  // Silhouette test along one axis. A slanted surface makes one neighbour nearer and the other farther
  // by about the same amount; a real edge makes one side jump far while the other stays put. Testing
  // the asymmetry (not just the jump) lets the threshold sit low enough to keep lines continuous
  // without painting stripes over the hills.
  float axisEdge(const in float zc, const in float za, const in float zb, const in float thresh) {
    float a = za - zc, b = zb - zc;
    float far = max(a, b), near = min(a, b);
    return step(thresh, far) * step(2.5 * abs(near), far);
  }

  // A one-texel-wide sliver (a grass tip, a hair-thin stem) has FAR surfaces on both sides of some axis:
  // outlining it leaves a lone black speck, so it is skipped entirely.
  float sliver(const in float zc, const in float za, const in float zb, const in float thresh) {
    return step(thresh, min(za, zb) - zc);
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    float zc = viewDepth(uv);
    vec2 t = texelSize;
    // threshold ≈ 0.12 m near, growing with distance: grass tufts and small flowers (a few cm above the
    // ground) fall below it and get no line — half-outlined tufts read as broken, speckled lines —
    // while the plant, the hills against each other and the sky are always well past it
    float thresh = edgeScale * (0.12 + zc * 0.03);
    float l = viewDepth(uv - vec2(t.x, 0.0)), r = viewDepth(uv + vec2(t.x, 0.0));
    float d = viewDepth(uv - vec2(0.0, t.y)), u = viewDepth(uv + vec2(0.0, t.y));
    float dl = viewDepth(uv - t), ur = viewDepth(uv + t);
    float ul = viewDepth(uv + vec2(-t.x, t.y)), dr = viewDepth(uv + vec2(t.x, -t.y));
    float e = 0.0;
    // 4 axes: horizontal, vertical and both diagonals, so slanted silhouettes close up too
    e = max(e, axisEdge(zc, l, r, thresh));
    e = max(e, axisEdge(zc, d, u, thresh));
    e = max(e, axisEdge(zc, dl, ur, thresh * 1.2));
    e = max(e, axisEdge(zc, ul, dr, thresh * 1.2));
    float thin = max(sliver(zc, l, r, thresh), sliver(zc, d, u, thresh));
    e *= 1.0 - thin;
    outputColor = vec4(mix(inputColor.rgb, inkColor, e), inputColor.a);
  }
`

class PixelEdgeEffect extends Effect {
  constructor({ edgeScale = 1, ink = '#0e0c12' }: { edgeScale?: number; ink?: string } = {}) {
    super('PixelEdgeEffect', fragment, {
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map<string, THREE.Uniform>([
        ['edgeScale', new THREE.Uniform(edgeScale)],
        ['inkColor', new THREE.Uniform(new THREE.Color(ink).convertSRGBToLinear())],
      ]),
    })
  }
}

export const PixelEdge = wrapEffect(PixelEdgeEffect)
