/**
 * A seam between the page transition and the route table: `Transition.tsx` is shared with the stand-alone Fragments
 * build, and importing `routes.ts` from it pulled every page into that build. The full site registers the real
 * prefetcher; elsewhere this is a no-op.
 */
let handler: (path: string) => void = () => {}
export const setPrefetch = (fn: (path: string) => void) => { handler = fn }
export const prefetch = (path: string) => handler(path)
