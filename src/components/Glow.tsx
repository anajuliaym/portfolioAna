import { useMemo } from 'react'
import * as THREE from 'three'

/**
 * a soft radial glow sprite (the moon, a lilac halo); fades to the page colour at its edge.
 * `backdrop`: painted first, additively, with no depth test, so a floor in front never cuts it on a straight line
 * (it stays in the opaque pass — `transparent: false` — so everything else is drawn over it).
 */
export default function Glow({ x, y, z, s, inner, outer, backdrop = false }: { x: number; y: number; z: number; s: number; inner: string; outer: string; backdrop?: boolean }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 512
    const g = c.getContext('2d')!
    const r = g.createRadialGradient(256, 256, 0, 256, 256, 256)
    r.addColorStop(0, inner); r.addColorStop(0.35, outer); r.addColorStop(1, 'rgba(12,13,18,0)')
    g.fillStyle = r; g.fillRect(0, 0, 512, 512)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
  }, [inner, outer])
  return (
    <sprite position={[x, y, z]} scale={[s, s, 1]} renderOrder={backdrop ? -100 : 0}>
      {backdrop
        ? <spriteMaterial map={tex} blending={THREE.AdditiveBlending} depthTest={false} depthWrite={false} toneMapped={false} fog={false} />
        : <spriteMaterial map={tex} transparent depthWrite={false} toneMapped={false} fog={false} />}
    </sprite>
  )
}
