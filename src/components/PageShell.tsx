import { ReactNode, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useI18n } from '../i18n'
import { ui } from '../pages/content'
import { REVEAL_MS } from './Transition'

const ease = [0.16, 1, 0.3, 1] as const
// content starts appearing while the curtain is still lifting
const T0 = (REVEAL_MS / 1000) * 0.35

export default function PageShell({
  index, title, children, aside, backTo = '/#desk', backLabel, className = '',
}: {
  index: string; title: string; children: ReactNode; aside?: ReactNode; backTo?: string; backLabel?: string; className?: string
}) {
  const { lang } = useI18n()
  useEffect(() => { window.scrollTo({ top: 0 }) }, [])
  return (
    <motion.main className={`page ${className}`} initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.25 } }}>
      <header className="page-head">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: T0 + 0.5, duration: 0.6 }}>
          <Link to={backTo} className="back meta">← {backLabel ?? ui[lang].back}</Link>
        </motion.div>
        <div className="page-title-row">
          <div>
            <motion.span className="meta" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: T0, duration: 0.5, ease }}>
              {index}
            </motion.span>
            <h1 aria-label={title}>
              {title.split('').map((ch, i) => (
                <span className="ch" key={i}>
                  <motion.span
                    initial={{ y: '110%', rotate: 6 }}
                    animate={{ y: 0, rotate: 0 }}
                    transition={{ delay: T0 + 0.05 + i * 0.04, duration: 0.9, ease }}
                  >
                    {ch === ' ' ? ' ' : ch}
                  </motion.span>
                </span>
              ))}
            </h1>
          </div>
        </div>
        {aside && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: T0 + 0.55, duration: 0.6, ease }}>
            {aside}
          </motion.div>
        )}
      </header>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: T0 + 0.6, duration: 0.8, ease }}>
        {children}
      </motion.div>
    </motion.main>
  )
}
