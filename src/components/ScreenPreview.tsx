import { Html } from '@react-three/drei'
import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import type { SelectFn } from './DeskScene'

/**
 * A live "screen" layered on the monitor of the desk model.
 * Shows a preview of the prototypes page (placeholder until that section exists).
 *
 * Geometry (fitted from the mesh): the screen is a flat quad facing +z,
 * measured from a rasterized depth map of the mesh: x -0.635..0.455, y -0.20..0.38
 * (centre [-0.09, 0.09], 1.09 × 0.58 units), surface at z ≈ -0.206.
 * In Html `transform` mode 1 px = distanceFactor / 400 units, so 880 px × 0.4955/400 = 1.09 units.
 */
const W = 880
const H = 468

export default function ScreenPreview({ onSelect }: { onSelect: SelectFn }) {
  const { t } = useI18n()
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 2600)
    return () => clearInterval(id)
  }, [])
  const active = tick % 3

  return (
    <Html
      transform
      position={[-0.09, 0.09, -0.2]}
      rotation={[0, 0, 0]}
      distanceFactor={0.4955}
      zIndexRange={[5, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <div className="screen" style={{ width: W, height: H }} onClick={(e) => onSelect('projects', { x: e.clientX, y: e.clientY })}>
        <div className="screen-bar">
          <span className="screen-logo">Ana Julia</span>
          <span className="screen-tabs">
            <b>{t('scr_tab1')}</b><i>{t('scr_tab2')}</i><i>{t('scr_tab3')}</i>
          </span>
          <span className="screen-meta">{t('scr_meta')}</span>
        </div>
        <div className="screen-body">
          <div className="screen-head">
            <span className="screen-kicker">{t('scr_kicker')}</span>
            <h4>{t('scr_title')}</h4>
          </div>
          <div className="screen-grid">
            {([0, 1, 2] as const).map((i) => (
              <div key={i} className={`screen-card c${i} ${active === i ? 'on' : ''}`}>
                <div className="thumb" />
                <div className="cap"><span>0{i + 1}</span>{t(`scr_card${(i + 1) as 1 | 2 | 3}`)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="screen-cursor" style={{ left: `${22 + active * 26}%` }} />
        <div className="screen-glare" />
      </div>
    </Html>
  )
}
