import { useProgress } from '@react-three/drei'
import { useEffect, useState } from 'react'

export default function Loader() {
  const { progress, active } = useProgress()
  const [done, setDone] = useState(false)
  useEffect(() => {
    // hide once nothing is loading (cached assets never report 100%)
    if (active) return
    const t = setTimeout(() => setDone(true), progress >= 100 ? 500 : 900)
    return () => clearTimeout(t)
  }, [active, progress])
  return (
    <div className={`loader ${done ? 'done' : ''}`} aria-hidden={done}>
      <div style={{ textAlign: 'center' }}>
        <div className="word">Ana Julia</div>
        <div className="bar"><i style={{ width: `${Math.max(6, progress)}%` }} /></div>
      </div>
    </div>
  )
}
