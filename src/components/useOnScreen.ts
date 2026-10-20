import { RefObject, useEffect, useState } from 'react'

/**
 * Is this element (about to be) on screen? Canvases use it as `frameloop={onScreen ? 'always' : 'never'}`: the home's
 * hero and desk used to render 60 fps each even when scrolled away (two WebGL contexts, one with a full-screen Kuwahara),
 * which is what made phones stutter. The margin wakes a scene up a little before it scrolls in, so nothing pops.
 */
export function useOnScreen(ref: RefObject<Element>, margin = '200px') {
  const [on, setOn] = useState(true)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { rootMargin: margin })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, margin])
  return on
}
