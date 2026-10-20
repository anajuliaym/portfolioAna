import { useState } from 'react'
import { PerformanceMonitor } from '@react-three/drei'

/**
 * Full quality where the device keeps up, smooth where it doesn't (optimisation round, 2026-10-20): every canvas starts
 * at its maximum pixel ratio and only steps down (0.25 at a time, never below 1) when the frame rate stays under the
 * refresh rate's bounds; it climbs back when there is headroom. A fast laptop never leaves the maximum.
 * Usage: `const [dpr, monitor] = useAdaptiveDpr(1.75)` → `<Canvas dpr={dpr}>{monitor}…`.
 */
export function useAdaptiveDpr(max: number) {
  const [dpr, setDpr] = useState(max)
  const monitor = (
    <PerformanceMonitor
      flipflops={4}
      onDecline={() => setDpr((d) => Math.max(1, Math.round((d - 0.25) * 100) / 100))}
      onIncline={() => setDpr((d) => Math.min(max, Math.round((d + 0.25) * 100) / 100))}
      onFallback={() => setDpr(1)}
    />
  )
  // [min, max]: r3f clamps to the device's own ratio, so a 1× screen is never upscaled
  return [[1, dpr] as [number, number], monitor] as const
}
