import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import heartUrl from '../assets/about/heart.webp'

/**
 * Night-scene dressing shared by the claw machine's arcade corner (Skills) and the back street (Contact): paper
 * lanterns, a string of fairy lights, Ana's floating glass hearts and soft glints. None of them adds a real light —
 * they glow (emissive / additive sprites) and the bloom does the rest; each scene adds its own couple of washes.
 */
export const radial = (stops: [number, string][]) => {
  const c = document.createElement('canvas'); c.width = c.height = 256
  const g = c.getContext('2d')!
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128)
  stops.forEach(([o, col]) => r.addColorStop(o, col))
  g.fillStyle = r; g.fillRect(0, 0, 256, 256)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}

/**
 * Warm fairy lights hung between hooks, drooping in a swag between each pair (`sag`, and `bulge` toward +z for a string
 * along a wall); bulbs twinkle. `count` bulbs spread evenly over the whole string.
 */
export function StringLights({ hooks, sag = 0.42, bulge = 0, count = 34, r = 0.022 }: { hooks: [number, number, number][]; sag?: number; bulge?: number; count?: number; r?: number }) {
  const { curve, bulbs } = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let k = 0; k < hooks.length - 1; k++) {
      const [ax, ay, az] = hooks[k], [bx, by, bz] = hooks[k + 1]
      for (let i = 0; i <= 20; i++) {
        const t = i / 20, s = Math.sin(Math.PI * t)
        pts.push(new THREE.Vector3(ax + (bx - ax) * t, ay + (by - ay) * t - s * sag, az + (bz - az) * t + s * bulge))
      }
    }
    const curve = new THREE.CatmullRomCurve3(pts)
    const bulbs = Array.from({ length: count }, (_, i) => ({ p: curve.getPointAt((i + 0.5) / count), ph: i * 2.3 }))
    return { curve, bulbs }
  }, [hooks, sag, bulge, count])
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const base = useMemo(() => new THREE.Color('#ffc983'), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    refs.current.forEach((m, i) => {
      if (!m) return
      const k = 2.2 + Math.sin(t * 1.1 + bulbs[i].ph) * 0.8 + Math.pow(Math.max(0, Math.sin(t * 0.37 + bulbs[i].ph * 1.7)), 12) * 2
      ;(m.material as THREE.MeshBasicMaterial).color.copy(base).multiplyScalar(k)
    })
  })
  return (
    <group>
      <mesh><tubeGeometry args={[curve, 160, 0.006, 5, false]} /><meshStandardMaterial color="#2b2622" roughness={0.6} /></mesh>
      {bulbs.map((b, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el }} position={[b.p.x, b.p.y - 0.03, b.p.z]}>
          <sphereGeometry args={[r, 10, 8]} /><meshBasicMaterial color="#ffc983" toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

/** a paper lantern on a cord from `top`, lit from inside (bright enough to bloom) with a soft halo; sways a little */
export function Lantern({ x, y, z, color, top = 3.4, size = 0.26 }: { x: number; y: number; z: number; color: string; top?: number; size?: number }) {
  const map = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 256
    const g = c.getContext('2d')!
    g.fillStyle = color; g.fillRect(0, 0, 64, 256)
    g.fillStyle = 'rgba(70,40,40,.28)'; for (let yy = 6; yy < 256; yy += 14) g.fillRect(0, yy, 64, 2)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
  }, [color])
  const halo = useMemo(() => radial([[0, 'rgba(255,190,120,.7)'], [0.35, 'rgba(255,170,100,.24)'], [1, 'rgba(255,160,90,0)']]), [])
  const g = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (g.current) g.current.rotation.z = Math.sin(clock.elapsedTime * 0.6 + x) * 0.025 })
  const k = size / 0.26
  return (
    <group ref={g} position={[x, top, z]}>
      <mesh position={[0, (y - top) / 2, 0]}><cylinderGeometry args={[0.006, 0.006, top - y, 5]} /><meshStandardMaterial color="#2b2026" /></mesh>
      <group position={[0, y - top, 0]} scale={k}>
        <mesh scale={[1, 0.82, 1]}><sphereGeometry args={[0.26, 24, 18]} /><meshStandardMaterial map={map} emissiveMap={map} emissive="#ff9442" emissiveIntensity={2.8} roughness={0.9} /></mesh>
        <sprite scale={[1.9, 1.9, 1]}><spriteMaterial map={halo} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} /></sprite>
        <mesh position={[0, 0.23, 0]}><cylinderGeometry args={[0.07, 0.08, 0.05, 12]} /><meshStandardMaterial color="#2b2026" roughness={0.8} /></mesh>
        <mesh position={[0, -0.23, 0]}><cylinderGeometry args={[0.08, 0.07, 0.05, 12]} /><meshStandardMaterial color="#2b2026" roughness={0.8} /></mesh>
      </group>
    </group>
  )
}

/** her glass hearts drifting slowly: [x, y, z, size] */
export function Hearts({ items }: { items: [number, number, number, number][] }) {
  const heart = useTexture(heartUrl)
  const list = useMemo(() => items.map(([x, y, z, s], i) => ({ x, y, z, s, ph: i * 1.9 })), [items])
  const refs = useRef<(THREE.Sprite | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    refs.current.forEach((sp, i) => {
      if (!sp) return
      const it = list[i]
      sp.position.set(it.x + Math.sin(t * 0.21 + it.ph) * 0.05, it.y + Math.sin(t * 0.5 + it.ph) * 0.07, it.z)
      sp.material.rotation = Math.sin(t * 0.4 + it.ph) * 0.2
    })
  })
  return (
    <>
      {list.map((it, i) => (
        <sprite key={i} ref={(el) => { refs.current[i] = el }} position={[it.x, it.y, it.z]} scale={[it.s, it.s * 0.89, 1]}>
          <spriteMaterial map={heart} transparent depthWrite={false} fog={false} />
        </sprite>
      ))}
    </>
  )
}
useTexture.preload(heartUrl)

/** soft glints twinkling in the air (bright enough for the bloom), spread over a box: x = cx ± hx, y0…y1, z0…z1 */
export function Glints({ n = 22, box = [0, 2, -0.5, 2.2, -1, 1.6] }: { n?: number; box?: [number, number, number, number, number, number] }) {
  const [cx, hx, y0, y1, z0, z1] = box
  const tex = useMemo(() => radial([[0, 'rgba(255,250,240,1)'], [0.18, 'rgba(255,240,225,.75)'], [1, 'rgba(255,240,225,0)']]), [])
  const seeds = useMemo(() => Array.from({ length: n }, (_, i) => ({
    x: cx + Math.sin(i * 12.9898) * hx, y: y0 + ((i * 0.618) % 1) * (y1 - y0), z: z0 + ((i * 0.37) % 1) * (z1 - z0),
    sp: 0.2 + (i % 4) * 0.07, ph: i * 1.7, s: 0.02 + (i % 3) * 0.012,
    tint: ['#fff3e0', '#ffd6e2', '#e6fff4'][i % 3],
  })), [n, cx, hx, y0, y1, z0, z1])
  const refs = useRef<(THREE.Sprite | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    refs.current.forEach((sp, i) => {
      if (!sp) return
      const s = seeds[i]
      sp.position.set(s.x + Math.sin(t * s.sp + s.ph) * 0.1, s.y + Math.sin(t * s.sp * 0.7 + s.ph * 2) * 0.12, s.z)
      // a slow twinkle: mostly dim, now and then a bright flash
      const k = Math.max(0, Math.sin(t * (0.6 + (i % 5) * 0.15) + s.ph))
      sp.material.opacity = 0.15 + Math.pow(k, 6) * 0.85
      sp.scale.setScalar(s.s * (0.7 + Math.pow(k, 6) * 0.8))
    })
  })
  return (
    <>
      {seeds.map((s, i) => (
        <sprite key={i} ref={(el) => { refs.current[i] = el }} scale={[s.s, s.s, 1]}>
          <spriteMaterial map={tex} color={s.tint} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} />
        </sprite>
      ))}
    </>
  )
}
