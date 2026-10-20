import { Suspense, useEffect, type ReactNode } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useI18n } from './i18n'
import { LangToggle } from './LangToggle'
import Hero from './components/Hero'
import DeskScene from './components/DeskScene'
import Loader from './components/Loader'
import { ROUTES } from './pages/content'
import { useTransition } from './components/Transition'
import type { HotspotId } from './components/DeskScene'
import { Pages, prefetchAll, prefetchRoute } from './routes'
import { setPrefetch } from './prefetch'

setPrefetch(prefetchRoute)

const { Projects, About, Contact, Skills, Games, Game } = Pages
/** a page chunk is usually already there (prefetched); if not, the transition curtain is still covering the screen */
const Lazy = ({ children }: { children: ReactNode }) => <Suspense fallback={null}>{children}</Suspense>

const INDEX: Record<HotspotId, string> = { projects: '01', about: '02', contact: '03', skills: '04', games: '05' }

function Nav() {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const { go } = useTransition()
  return (
    <nav className="nav">
      <Link className="logo" to="/">Ana Julia</Link>
      <div className="right">
        <div className="links">
          {(Object.keys(ROUTES) as (keyof typeof ROUTES)[]).map((id) => (
            <a
              key={id}
              href={ROUTES[id]}
              className={pathname === ROUTES[id] ? 'on' : ''}
              onPointerEnter={() => prefetchRoute(ROUTES[id])}
              onClick={(e) => {
                e.preventDefault()
                if (pathname !== ROUTES[id]) go(ROUTES[id], t(`hs_${id}` as const), INDEX[id], { x: e.clientX, y: e.clientY })
              }}
            >
              {t(`hs_${id}` as const)}
            </a>
          ))}
        </div>
        <LangToggle />
      </div>
    </nav>
  )
}

function Home() {
  const { go } = useTransition()
  const { t } = useI18n()
  const { hash } = useLocation()
  useEffect(() => {
    if (hash === '#desk') {
      const el = document.getElementById('desk')
      // land on the desk, already turned a bit into the section
      if (el) window.scrollTo({ top: el.offsetTop + window.innerHeight * 0.6 })
    }
  }, [hash])
  // once the home has loaded, fetch the other pages in the background (idle time only)
  useEffect(() => {
    const start = () => window.setTimeout(prefetchAll, 2500) // after the hero has settled
    if (document.readyState === 'complete') start(); else window.addEventListener('load', start, { once: true })
    return () => window.removeEventListener('load', start)
  }, [])
  return (
    <main id="top">
      <Loader />
      <Hero />
      <DeskScene onSelect={(id, origin) => go(ROUTES[id], t(`hs_${id}` as const), INDEX[id], origin)} />
    </main>
  )
}

/** The whole portfolio: home with the desk, and every page. */
export default function Site() {
  const location = useLocation()
  return (
    <>
      <div className="grain" />
      <Nav />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path={ROUTES.projects} element={<Lazy><Projects /></Lazy>} />
          <Route path={ROUTES.about} element={<Lazy><About /></Lazy>} />
          <Route path={ROUTES.contact} element={<Lazy><Contact /></Lazy>} />
          <Route path={ROUTES.skills} element={<Lazy><Skills /></Lazy>} />
          <Route path={ROUTES.games} element={<Lazy><Games /></Lazy>} />
          <Route path={`${ROUTES.games}/:n`} element={<Lazy><Game /></Lazy>} />
          <Route path="*" element={<Home />} />
        </Routes>
      </AnimatePresence>
    </>
  )
}
