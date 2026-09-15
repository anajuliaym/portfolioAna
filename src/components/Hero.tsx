import { Suspense, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useI18n } from '../i18n'
import CharacterStage from './Character'
import PixelText from './PixelText'

export default function Hero() {
  const { t } = useI18n()
  const ref = useRef<HTMLElement>(null)
  const spin = useRef(0)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const typeY = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])
  const typeO = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  return (
    <section className="hero" ref={ref}>
      <motion.div className="hero-type" style={{ y: typeY, opacity: typeO }}>
        <h1 className="sr-only">{t('hero_title')} — {t('hero_name')}</h1>
        <motion.div
          className="name"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.75, duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <PixelText text={t('hero_name')} />
        </motion.div>
      </motion.div>

      <motion.div
        className="hero-canvas"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.6, delay: 0.3 }}
        onClick={() => { spin.current += Math.PI * 2 }}
        title={t('hero_hint')}
      >
        <Canvas
          camera={{ position: [0, 0.32, 2.35], fov: 30 }}
          dpr={[1, 1.75]}
          gl={{ antialias: false, alpha: true, toneMapping: 3 /* ACESFilmic */, premultipliedAlpha: false }}
          onCreated={({ camera }) => camera.lookAt(0, 0.32, 0)}
        >
          <Suspense fallback={null}>
            <CharacterStage scroll={scrollYProgress} spin={spin} />
          </Suspense>
        </Canvas>
      </motion.div>

      <div className="hero-foot">
        <div className="scroll-cue"><i /><span className="meta">scroll</span></div>
        <span className="meta">{t('hero_hint')}</span>
      </div>
    </section>
  )
}
