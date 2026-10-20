/**
 * Pixel ratio cap per canvas. (2026-10-20: this used drei's PerformanceMonitor to step the ratio up and down; every step
 * resized the canvas and reallocated every post-processing buffer, and on a busy page it flip-flopped — the whole site
 * stuttered, "parece um jogo a 2 fps". A fixed cap is smooth.) Kept as a hook so every canvas declares its cap in one place.
 */
export function useAdaptiveDpr(max: number) {
  return [[1, max] as [number, number], null] as const
}
