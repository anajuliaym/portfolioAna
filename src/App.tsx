import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { I18nProvider } from './i18n'
import { TransitionProvider } from './components/Transition'
import { LangToggle } from './LangToggle'
import Game from './pages/Game'

/**
 * `VITE_ONLY=fragments` (npm run build:fragments / dev:fragments) publishes ONLY the Fragments
 * page — for the QR code on the presentation banner, while the rest of the portfolio stays
 * private. The condition is a build-time constant, so Rollup drops the lazy import below and
 * nothing else of the site (pages, desk, models, texts) ends up in that bundle.
 */
const ONLY_FRAGMENTS = import.meta.env.VITE_ONLY === 'fragments'
const FullSite = ONLY_FRAGMENTS ? null : lazy(() => import('./FullSite'))

/** Fragments alone at `/`: no menu, no back link, every other address comes back here. */
function FragmentsSite() {
  useEffect(() => { document.title = 'Fragments — Ana Julia' }, [])
  return (
    <>
      <div className="grain" />
      <nav className="nav">
        <span className="logo">Ana Julia</span>
        <div className="right"><LangToggle /></div>
      </nav>
      <Routes>
        <Route path="/" element={<Game only="fragments" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <TransitionProvider>
          {FullSite ? <Suspense fallback={null}><FullSite /></Suspense> : <FragmentsSite />}
        </TransitionProvider>
      </BrowserRouter>
    </I18nProvider>
  )
}
