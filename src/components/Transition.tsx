import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

export type Origin = { x: number; y: number }
type Phase = 'idle' | 'cover' | 'reveal'
type State = { phase: Phase; label: string; index: string; origin: Origin }

/** Timings (ms) shared with the desk camera dive */
export const COVER_MS = 850
export const REVEAL_MS = 800

const Ctx = createContext<{ go: (path: string, label: string, index: string, origin?: Origin) => void; busy: boolean }>({
  go: () => {},
  busy: false,
})

export const useTransition = () => useContext(Ctx)

export function TransitionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [state, setState] = useState<State>({ phase: 'idle', label: '', index: '', origin: { x: 0, y: 0 } })
  const busy = useRef(false)

  const go = useCallback(
    (path: string, label: string, index: string, origin?: Origin) => {
      if (busy.current) return
      busy.current = true
      const o = origin ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 }
      setState({ phase: 'cover', label, index, origin: o })
      window.setTimeout(() => {
        navigate(path)
        setState((s) => ({ ...s, phase: 'reveal' }))
      }, COVER_MS)
      window.setTimeout(() => {
        setState((s) => ({ ...s, phase: 'idle' }))
        busy.current = false
      }, COVER_MS + REVEAL_MS)
    },
    [navigate],
  )

  const { phase, label, index, origin } = state
  const full = `circle(160% at ${origin.x}px ${origin.y}px)`

  return (
    <Ctx.Provider value={{ go, busy: phase !== 'idle' }}>
      {children}
      <AnimatePresence>
        {phase !== 'idle' && (
          <motion.div
            key="wipe"
            className="wipe"
            initial={{ clipPath: `circle(0% at ${origin.x}px ${origin.y}px)`, y: 0 }}
            animate={phase === 'cover' ? { clipPath: full, y: 0 } : { clipPath: full, y: '-100%' }}
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
              animate={phase === 'cover' ? { opacity: 1, y: 0 } : { opacity: 1, y: -30 }}
              transition={{ delay: phase === 'cover' ? 0.25 : 0, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="meta">{index}</span>
              <h2>{label}</h2>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  )
}
