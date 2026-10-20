import { lazy } from 'react'
import { ROUTES } from './pages/content'

/**
 * Route-level code splitting (optimisation round, 2026-10-20). Each page — and the 3D models it preloads at module
 * level (`useGLTF.preload`) — used to be in the home bundle, so opening the site downloaded the pond, the claw machine,
 * the arcade and the devices before the hero had finished. Now a page loads when it is needed:
 * - `prefetchRoute(path)` when a transition starts (the curtain covers the screen for a beat, enough for the chunk);
 * - `prefetchAll()` once the home is idle, so the next click is instant anyway.
 */
const loaders = {
  projects: () => import('./pages/Projects'),
  about: () => import('./pages/About'),
  contact: () => import('./pages/Contact'),
  skills: () => import('./pages/Skills'),
  games: () => import('./pages/Games'),
  game: () => import('./pages/Game'),
}

export const Pages = {
  Projects: lazy(loaders.projects),
  About: lazy(loaders.about),
  Contact: lazy(loaders.contact),
  Skills: lazy(loaders.skills),
  Games: lazy(loaders.games),
  Game: lazy(loaders.game),
}

/** starts loading a page's chunk; tells the curtain whether that page has a 3D scene to wait for */
export function prefetchRoute(path: string): { chunk?: Promise<unknown>; scene?: boolean } {
  const p = path.split('?')[0].split('#')[0]
  if (p === ROUTES.projects) return { chunk: loaders.projects(), scene: true }
  if (p === ROUTES.about) return { chunk: loaders.about(), scene: false }
  if (p === ROUTES.contact) return { chunk: loaders.contact(), scene: true }
  if (p === ROUTES.skills) return { chunk: loaders.skills(), scene: true }
  if (p === `${ROUTES.games}/1`) return { chunk: loaders.game(), scene: true } // the Fragments garden backdrop
  if (p.startsWith(`${ROUTES.games}/`)) return { chunk: loaders.game(), scene: false }
  if (p === ROUTES.games) return { chunk: loaders.games(), scene: true }
  return {}
}

let prefetched = false
/** after the first screen is up and the main thread is quiet: fetch every page, one after the other */
export function prefetchAll() {
  if (prefetched) return
  prefetched = true
  const order = [loaders.projects, loaders.about, loaders.contact, loaders.skills, loaders.games, loaders.game]
  // data-saver / 2G: don't fetch pages nobody asked for (the curtain loads them on demand)
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  if (conn?.saveData || /2g/.test(conn?.effectiveType ?? '')) return
  const ric = (window as unknown as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => void }).requestIdleCallback
  // only in real idle time, and with a pause between pages: parsing a page's models must not stutter the home's scenes
  const idle = (cb: () => void) => window.setTimeout(() => (ric ? ric(cb, { timeout: 6000 }) : cb()), 1200)
  const next = () => { const l = order.shift(); if (l) l().finally(() => idle(next)) }
  idle(next)
}
