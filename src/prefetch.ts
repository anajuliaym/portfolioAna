/**
 * A seam between the page transition and the route table: `Transition.tsx` is shared with the stand-alone Fragments
 * build, and importing `routes.ts` from it pulled every page into that build. The full site registers the real
 * prefetcher; elsewhere this is a no-op.
 */
/** what the curtain needs to know about a page: its chunk (a promise) and whether it has a 3D scene to wait for */
export type PageLoad = { chunk?: Promise<unknown>; scene?: boolean }
let handler: (path: string) => PageLoad = () => ({})
let registered: () => void = () => {}
const ready = new Promise<void>((r) => { registered = r })
export const setPrefetch = (fn: (path: string) => PageLoad) => { handler = fn; registered() }
export const prefetch = (path: string): PageLoad => handler(path)
/** for a first visit straight onto an inner page: the full site (and its route table) is itself still loading */
export const prefetchWhenReady = (path: string): Promise<PageLoad> =>
  Promise.race([ready.then(() => handler(path)), new Promise<PageLoad>((r) => window.setTimeout(() => r({}), 4000))])
