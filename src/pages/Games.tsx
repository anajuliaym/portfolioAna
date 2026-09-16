import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import GameWorld from '../components/GameWorld'
import { useI18n } from '../i18n'
import { games, ui } from './content'

export default function Games() {
  const { lang } = useI18n()
  return (
    <motion.main className="page world-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.25 } }}>
      <Link to="/#desk" className="back meta">← {ui[lang].back}</Link>
      <GameWorld games={games[lang]} />
    </motion.main>
  )
}
