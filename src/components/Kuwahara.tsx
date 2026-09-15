import { Effect } from 'postprocessing'
import { wrapEffect } from '@react-three/postprocessing'

/**
 * Kuwahara filter: the classic "oil painting" post effect.
 * Splits the neighbourhood into 4 quadrants and keeps the mean of the least
 * noisy one, which turns smooth gradients into flat brush-like patches while
 * keeping edges sharp. RADIUS is a compile-time define (samples = 4*(R+1)^2).
 */
const fragment = /* glsl */ `
  void quadrant(const in vec2 uv, const in vec2 o, out vec4 mean, out float sigma) {
    vec4 m = vec4(0.0);
    vec4 s = vec4(0.0);
    for (int j = 0; j <= RADIUS; j++) {
      for (int i = 0; i <= RADIUS; i++) {
        vec4 c = texture2D(inputBuffer, uv + (vec2(float(i), float(j)) * o) * texelSize);
        m += c;
        s += c * c;
      }
    }
    float n = float((RADIUS + 1) * (RADIUS + 1));
    m /= n;
    s = abs(s / n - m * m);
    mean = m;
    sigma = s.r + s.g + s.b;
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec4 m0, m1, m2, m3;
    float s0, s1, s2, s3;
    quadrant(uv, vec2(-1.0, -1.0), m0, s0);
    quadrant(uv, vec2( 1.0, -1.0), m1, s1);
    quadrant(uv, vec2( 1.0,  1.0), m2, s2);
    quadrant(uv, vec2(-1.0,  1.0), m3, s3);
    vec4 best = m0; float bs = s0;
    if (s1 < bs) { bs = s1; best = m1; }
    if (s2 < bs) { bs = s2; best = m2; }
    if (s3 < bs) { bs = s3; best = m3; }
    outputColor = best;
  }
`

class KuwaharaEffect extends Effect {
  constructor({ radius = 4 }: { radius?: number } = {}) {
    super('KuwaharaEffect', fragment, {
      defines: new Map([['RADIUS', String(Math.max(1, Math.round(radius)))]]),
    })
  }
}

export const Kuwahara = wrapEffect(KuwaharaEffect)
