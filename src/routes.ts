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

export function prefetchRoute(path: string) {
  const p = path.split('?')[0].split('#')[0]
  if (p === ROUTES.projects) loaders.projects()
  else if (p === ROUTES.about) loaders.about()
  else if (p === ROUTES.contact) loaders.contact()
  else if (p === ROUTES.skills) loaders.skills()
  else if (p.startsWith(`${ROUTES.games}/`)) loaders.game()
  else if (p === ROUTES.games) loaders.games()
}

let prefetched = false
/** after the first screen is up and the main thread is quiet: fetch every page, one after the other */
export function prefetchAll() {
  if (prefetched) return
  prefetched = true
  const order = [loaders.projects, loaders.about, loaders.contact, loaders.skills, loaders.games, loaders.game]
  const ric = (window as unknown as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => void }).requestIdleCallback
  const idle = (cb: () => void) => (ric ? ric(cb, { timeout: 4000 }) : window.setTimeout(cb, 1500))
  const next = () => { const l = order.shift(); if (l) l().finally(() => idle(next)) }
  idle(next)
}
