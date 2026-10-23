import { useCallback, useState } from 'react'
import type { RootState } from '@react-three/fiber'

/**
 * WebGL context recovery for every 3D scene (Ana, 2026-10-23: the Skills page "ficou preto e nada, só apareceu com
 * refresh"). Browsers drop a WebGL context under GPU memory pressure (several heavy pages in a row, a phone in the
 * background) and r3f never gets it back: the canvas stays black until a reload. When that happens we remount the
 * Canvas (new `key`), which creates a fresh context and redraws the scene.
 */
export function useGLRecovery(extra?: (state: RootState) => void) {
  const [key, setKey] = useState(0)
  const onCreated = useCallback((state: RootState) => {
    const canvas = state.gl.domElement
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); window.setTimeout(() => setKey((k) => k + 1), 200) }, { once: true })
    extra?.(state)
  }, [extra])
  return { key, onCreated }
}

/**
 * Screen-space ambient occlusion (N8AO) is off on phones and touch tablets: on some mobile GPUs it reads the depth
 * buffer wrongly and darkens the whole scene (Ana's Android: the claw machine came out nearly black), and it is the
 * heaviest pass anyway.
 */
export const LOW_POWER = typeof window !== 'undefined' && (window.matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency ?? 8) <= 4)
