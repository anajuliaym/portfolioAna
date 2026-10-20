import { prefetch, prefetchWhenReady } from '../prefetch'
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { waitForPage } from './SceneReady'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

export type Origin = { x: number; y: number }
type Phase = 'idle' | 'cover' | 'hold' | 'reveal'
type State = { phase: Phase; label: string; index: string; origin: Origin }

/** Timings (ms) shared with the desk camera dive */
export const COVER_MS = 850
export const REVEAL_MS = 800

const Ctx = createContext<{ go: (path: string, label: string, index: string, origin?: Origin) => void; busy: boolean; covered: boolean }>({
  go: () => {},
  busy: false,
  covered: false,
})

export const useTransition = () => useContext(Ctx)

export function TransitionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  // opened straight on an inner page (a shared link): start under the curtain and lift it when the page is ready.
  // The home has its own loader.
  const direct = typeof window !== 'undefined' && window.location.pathname !== '/'
  const [state, setState] = useState<State>({ phase: direct ? 'hold' : 'idle', label: '', index: '', origin: { x: window.innerWidth / 2, y: window.innerHeight / 2 } })
  const busy = useRef(direct)
  const reveal = useCallback(() => {
    setState((s) => ({ ...s, phase: 'reveal' }))
    window.setTimeout(() => { setState((s) => ({ ...s, phase: 'idle' })); busy.current = false }, REVEAL_MS)
  }, [])
  useEffect(() => { if (direct) prefetchWhenReady(window.location.pathname).then(waitForPage).then(reveal) }, [direct, reveal])

  const go = useCallback(
    (path: string, label: string, index: string, origin?: Origin) => {
      if (busy.current) return
      busy.current = true
      const load = prefetch(path) // the page's chunk loads while the curtain covers the screen
      const o = origin ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 }
      setState({ phase: 'cover', label, index, origin: o })
      window.setTimeout(() => {
        navigate(path)
        // the curtain stays down (with a thin progress line) until the page's models and first frames are done
        setState((s) => ({ ...s, phase: 'hold' }))
        waitForPage(load).then(reveal)
      }, COVER_MS)
    },
    [navigate, reveal],
  )

  const { phase, label, index, origin } = state
  const full = `circle(160% at ${origin.x}px ${origin.y}px)`
  const covered = phase === 'cover' || phase === 'hold'

  return (
    <Ctx.Provider value={{ go, busy: phase !== 'idle', covered }}>
      {children}
      <AnimatePresence>
        {phase !== 'idle' && (
          <motion.div
            key="wipe"
            className="wipe"
            initial={{ clipPath: phase === 'hold' ? full : `circle(0% at ${origin.x}px ${origin.y}px)`, y: 0 }}
            animate={covered ? { clipPath: full, y: 0 } : { clipPath: full, y: '-100%' }}
            exit={{ opacity: 0, transition: { duration: 0 } }}
            transition={
              phase === 'cover'
                ? { duration: COVER_MS / 1000, ease: [0.76, 0, 0.24, 1] }
                : { duration: REVEAL_MS / 1000, ease: [0.83, 0, 0.17, 1] }
            }
          >
            <motion.div
              className="wipe-label"
              initial={{ opacity: 0, y: 40 }}
              animate={covered ? { opacity: 1, y: 0 } : { opacity: 1, y: -30 }}
              transition={{ delay: phase === 'cover' ? 0.25 : 0, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              {index && <span className="meta">{index}</span>}
              {label && <h2>{label}</h2>}
            </motion.div>
            <LoadLine show={phase === 'hold'} />
          </motion.div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  )
}

/** a hairline with a light running along it, while the page loads (only shows if it takes a moment) */
function LoadLine({ show }: { show: boolean }) {
  return (
    <motion.div className="wipe-load" initial={{ opacity: 0 }} animate={{ opacity: show ? 1 : 0 }} transition={{ delay: show ? 0.45 : 0, duration: 0.4 }} aria-hidden>
      <i />
    </motion.div>
  )
}
