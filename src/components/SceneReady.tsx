import { useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'

/**
 * The page-transition curtain stays down until the new page is really ready (Ana, 2026-10-20: "enquanto modelos/páginas
 * carregam, ficam na cortina até carregar, para uma experiência mais homogênea"). Ready =
 *   1. the page's chunk has arrived (React.lazy) and it has mounted,
 *   2. its scene's models and textures are in — <SceneReady/> sits inside the Canvas's Suspense, so it only mounts then
 *      (not drei's global `useProgress`: the idle prefetch of the other pages keeps that busy for seconds),
 *   3. every scene that asked for it (`<SceneReady/>`, placed inside a Canvas's Suspense) has drawn a few frames, so the
 *      shader compile and the first heavy frame happen under the curtain, not in front of the visitor.
 */
const holds = new Set<symbol>()
let mounted = 0 // scenes that have mounted so far (the curtain waits for a new one on pages that have a scene)

/** inside a Canvas, inside its Suspense: holds the curtain from mount until `frames` frames have rendered */
export function SceneReady({ frames = 3 }: { frames?: number }) {
  const id = useRef(Symbol('scene'))
  const n = useRef(0)
  useLayoutEffect(() => {
    const k = id.current
    holds.add(k)
    mounted++
    const safety = window.setTimeout(() => holds.delete(k), 2500) // a paused canvas (frameloop 'never') never draws
    return () => { holds.delete(k); window.clearTimeout(safety) }
  }, [])
  useFrame(() => { if (holds.has(id.current) && ++n.current >= frames) holds.delete(id.current) })
  return null
}

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms))
const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)))

/**
 * Resolves when the page that was just navigated to is ready (or after `max` ms, never leaving the curtain stuck).
 * `chunk`: the page's code; `scene`: it has a Canvas — then wait until its <SceneReady/> has mounted (i.e. its models
 * are in, since it sits inside the Suspense) before checking that everything is quiet.
 */
export async function waitForPage({ chunk, scene = false, min = 250, max = 10000 }: { chunk?: Promise<unknown>; scene?: boolean; min?: number; max?: number } = {}) {
  const t0 = performance.now()
  const before = mounted
  await sleep(min)
  if (chunk) await Promise.race([chunk.catch(() => null), sleep(max)])
  if (scene) while (mounted === before && performance.now() - t0 < max) await sleep(50)
  let calm = 0
  while (performance.now() - t0 < max) {
    const busy = holds.size > 0
    calm = busy ? 0 : calm + 1
    if (calm >= 2) break // a moment of quiet: a second Suspense that just resolved has had time to mount its scene
    await sleep(100)
  }
  await frame(); await frame()
}
if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__scenes = () => mounted // dev: lets a test see when a scene mounted
