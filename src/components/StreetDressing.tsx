import { useMemo } from 'react'
import * as THREE from 'three'
import GlbProp, { LILIES_URL } from './GlbProp'

/**
 * Life for the middle of the Contact street (Ana, 2026-10-20: "essa parte da rua ficou muito vazia, coloque coisas"):
 * lit vertical shop signs, potted lilies and round bushes, a bicycle with a flower basket, a bench with flower crates,
 * a chalk A-board, a utility pole with its transformer, a sakura manhole cover and petals on the ground. No real lights —
 * the signs glow on their own (emissive) and the street's lights do the rest. Metres, y up, the street runs toward −z.
 */
type Layout = { R: number; L: number; KERB: number; road: [number, number] }

const canvasTex = (w: number, h: number, paint: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  paint(c.getContext('2d')!)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}
const JP = "'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif JP', 'Noto Serif CJK JP', serif"

/** a vertical lightbox sign sticking out of a facade, readable from up the street */
function Kanban({ x, y, z, dir, text, bg, fg, w = 0.3, h = 0.95 }: { x: number; y: number; z: number; dir: 1 | -1; text: string; bg: string; fg: string; w?: number; h?: number }) {
  const map = useMemo(() => canvasTex(160, 512, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, 160, 512)
    g.strokeStyle = fg; g.globalAlpha = 0.55; g.lineWidth = 5; g.strokeRect(12, 12, 136, 488); g.globalAlpha = 1
    const chars = [...text], step = Math.min(118, 470 / chars.length)
    g.fillStyle = fg; g.font = `700 ${Math.round(step * 0.86)}px ${JP}`; g.textAlign = 'center'; g.textBaseline = 'middle'
    chars.forEach((ch, i) => g.fillText(ch, 80, 256 + (i - (chars.length - 1) / 2) * step))
  }), [text, bg, fg])
  const arm = 0.18
  return (
    <group position={[x, y, z]}>
      <mesh position={[dir * (arm + w / 2), 0, 0]}>
        <boxGeometry args={[w, h, 0.05]} />
        <meshStandardMaterial map={map} emissiveMap={map} emissive="#ffffff" emissiveIntensity={0.85} roughness={0.5} />
      </mesh>
      {[h / 2 - 0.08, -h / 2 + 0.08].map((dy) => (
        <mesh key={dy} position={[dir * arm / 2, dy, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.01, 0.01, arm, 6]} /><meshStandardMaterial color="#3a3038" metalness={0.5} roughness={0.4} /></mesh>
      ))}
    </group>
  )
}

/** a round clipped bush in a glazed pot (leafy look from a noisy canvas + bump) */
function leafTex() {
  return canvasTex(256, 256, (g) => {
    g.fillStyle = '#4f7a4c'; g.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 2600; i++) {
      const v = Math.random()
      g.fillStyle = v < 0.33 ? '#3d6340' : v < 0.66 ? '#6a9a5f' : '#87b273'
      g.beginPath(); g.ellipse(Math.random() * 256, Math.random() * 256, 5, 2.6, Math.random() * Math.PI, 0, Math.PI * 2); g.fill()
    }
  })
}
function Bush({ x, z, top, r, pot, blossom, leaf }: { x: number; z: number; top: number; r: number; pot: string; blossom?: string; leaf: THREE.Texture }) {
  const dots = useMemo(() => blossom ? Array.from({ length: 14 }, (_, i) => {
    const a = i * 2.39996, yy = 0.15 + ((i * 0.618) % 1) * 0.75
    const rr = Math.sqrt(1 - yy * yy) * r * 0.98
    return [Math.cos(a) * rr, yy * r, Math.sin(a) * rr] as [number, number, number]
  }) : [], [blossom, r])
  const ph = r * 0.9
  return (
    <group position={[x, top, z]}>
      <mesh position={[0, ph / 2, 0]} castShadow receiveShadow><cylinderGeometry args={[r * 0.8, r * 0.62, ph, 20]} /><meshStandardMaterial color={pot} roughness={0.35} /></mesh>
      <mesh position={[0, ph + r * 0.75, 0]} castShadow><sphereGeometry args={[r, 20, 16]} /><meshStandardMaterial map={leaf} bumpMap={leaf} bumpScale={3} roughness={0.85} color="#e6f0dc" /></mesh>
      {dots.map((p, i) => <mesh key={i} position={[p[0], ph + r * 0.75 + p[1], p[2]]}><sphereGeometry args={[r * 0.11, 8, 6]} /><meshStandardMaterial color={blossom} roughness={0.6} emissive={blossom} emissiveIntensity={0.15} /></mesh>)}
    </group>
  )
}

/** a mint city bicycle with a front basket of flowers, leaning on the left-hand wall */
function Bicycle({ x, z, top }: { x: number; z: number; top: number }) {
  const frame = '#a8dcc9', dark = '#2e2a30', R0 = 0.3
  const tube = (a: [number, number, number], b: [number, number, number], r = 0.016, col = frame) => {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), mid = va.clone().add(vb).multiplyScalar(0.5)
    const len = va.distanceTo(vb), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize())
    return <mesh key={a.join() + b.join()} position={mid} quaternion={q} castShadow><cylinderGeometry args={[r, r, len, 8]} /><meshStandardMaterial color={col} roughness={0.35} metalness={0.3} /></mesh>
  }
  // in the bike's own frame: x along the bike, y up; rear wheel at x −0.52, front at +0.52
  const rear: [number, number, number] = [-0.52, R0, 0], front: [number, number, number] = [0.52, R0, 0]
  const seat: [number, number, number] = [-0.2, 0.82, 0], head: [number, number, number] = [0.38, 0.86, 0], crank: [number, number, number] = [-0.05, 0.3, 0]
  return (
    <group position={[x, top, z]} rotation={[0, Math.PI / 2, 0.08]}>
      {[rear, front].map((p, i) => (
        <group key={i} position={p}>
          <mesh castShadow><torusGeometry args={[R0, 0.022, 10, 40]} /><meshStandardMaterial color={dark} roughness={0.7} /></mesh>
          <mesh><torusGeometry args={[R0 - 0.03, 0.006, 6, 40]} /><meshStandardMaterial color="#d8d6dc" metalness={0.9} roughness={0.25} /></mesh>
        </group>
      ))}
      {tube(rear, crank)}{tube(crank, seat)}{tube(seat, rear)}{tube(crank, head, 0.02)}{tube(head, front, 0.016)}
      {tube([-0.2, 0.82, 0], [-0.22, 0.92, 0], 0.012, '#c8c6cc')}
      <mesh position={[-0.23, 0.94, 0]} castShadow><boxGeometry args={[0.22, 0.05, 0.1]} /><meshStandardMaterial color="#5a4048" roughness={0.6} /></mesh>
      {tube([0.38, 0.86, 0], [0.34, 1.02, 0], 0.012, '#c8c6cc')}
      {tube([0.34, 1.02, -0.24], [0.34, 1.02, 0.24], 0.012, '#c8c6cc')}
      {/* the basket, with pink and white flowers */}
      <mesh position={[0.6, 0.9, 0]} castShadow><boxGeometry args={[0.28, 0.2, 0.32]} /><meshStandardMaterial color="#e9d9c4" roughness={0.8} /></mesh>
      {Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[0.5 + (i % 3) * 0.09, 1.02 + ((i * 7) % 3) * 0.015, -0.1 + Math.floor(i / 3) * 0.1]}><sphereGeometry args={[0.045, 10, 8]} /><meshStandardMaterial color={i % 3 === 1 ? '#fff6f1' : '#f4a6bf'} roughness={0.6} /></mesh>)}
    </group>
  )
}

/** a slatted bench with two crates of flowers beside it */
function Bench({ x, z, top, dir }: { x: number; z: number; top: number; dir: 1 | -1 }) {
  const wood = '#e2bcae'
  return (
    <group position={[x, top, z]} rotation={[0, dir * Math.PI / 2, 0]}>
      {[0, 1, 2].map((i) => <mesh key={i} position={[0, 0.44, -0.12 + i * 0.12]} castShadow receiveShadow><boxGeometry args={[1.1, 0.035, 0.1]} /><meshStandardMaterial color={wood} roughness={0.7} /></mesh>)}
      {[0, 1].map((i) => <mesh key={i} position={[0, 0.62 + i * 0.12, -0.2]} castShadow><boxGeometry args={[1.1, 0.07, 0.03]} /><meshStandardMaterial color={wood} roughness={0.7} /></mesh>)}
      {[-0.48, 0.48].map((dx) => <mesh key={dx} position={[dx, 0.22, 0]} castShadow><boxGeometry args={[0.05, 0.44, 0.34]} /><meshStandardMaterial color="#4a3c42" roughness={0.5} metalness={0.4} /></mesh>)}
      {[0.75, 0.75 + 0.36].map((dx, k) => (
        <group key={dx} position={[dx, 0, 0]}>
          <mesh position={[0, 0.13, 0]} castShadow receiveShadow><boxGeometry args={[0.32, 0.26, 0.28]} /><meshStandardMaterial color="#d8b49c" roughness={0.85} /></mesh>
          {Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[-0.1 + (i % 3) * 0.1, 0.3, -0.06 + Math.floor(i / 3) * 0.12]}><sphereGeometry args={[0.055, 10, 8]} /><meshStandardMaterial color={k ? (i % 2 ? '#ffd7a8' : '#fff4ef') : (i % 2 ? '#f49ab6' : '#d9b8f2')} roughness={0.6} /></mesh>)}
        </group>
      ))}
    </group>
  )
}

/** a chalkboard A-frame on the pavement: today's special */
function ABoard({ x, z, top, yaw }: { x: number; z: number; top: number; yaw: number }) {
  const map = useMemo(() => canvasTex(300, 400, (g) => {
    g.fillStyle = '#3b3a3c'; g.fillRect(0, 0, 300, 400)
    g.strokeStyle = '#c99d8a'; g.lineWidth = 18; g.strokeRect(0, 0, 300, 400)
    g.fillStyle = '#fdf3ec'; g.textAlign = 'center'
    g.font = `700 44px ${JP}`; g.fillText('本日', 150, 80)
    g.font = "italic 400 40px 'Pinyon Script', 'Instrument Serif', cursive"; g.fillStyle = '#f7b9cb'; g.fillText('ichigo', 150, 160); g.fillText('parfait', 150, 210)
    g.fillStyle = '#fdf3ec'; g.font = '600 24px Inter, system-ui, sans-serif'; g.fillText('♡  ¥ 680  ♡', 150, 290)
    g.strokeStyle = 'rgba(253,243,236,.7)'; g.lineWidth = 3; g.beginPath(); g.moveTo(70, 330); g.lineTo(230, 330); g.stroke()
  }), [])
  const h = 0.72, tilt = 0.2
  return (
    <group position={[x, top, z]} rotation={[0, yaw, 0]}>
      {[1, -1].map((s) => (
        <mesh key={s} position={[0, h / 2 * Math.cos(tilt), s * h / 2 * Math.sin(tilt)]} rotation={[s * tilt, s < 0 ? Math.PI : 0, 0]} castShadow>
          <boxGeometry args={[0.46, h, 0.025]} />
          <meshStandardMaterial map={map} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

/** a concrete utility pole with a crossarm and a transformer drum — the Japanese street's vertical */
function Pole({ x, z }: { x: number; z: number }) {
  const grey = '#a9a5ad'
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 3.3, 0]} castShadow><cylinderGeometry args={[0.085, 0.12, 6.6, 16]} /><meshStandardMaterial color={grey} roughness={0.8} /></mesh>
      <mesh position={[0, 5.6, 0]}><boxGeometry args={[0.08, 0.08, 1.1]} /><meshStandardMaterial color="#6f6b74" roughness={0.6} /></mesh>
      <mesh position={[0.22, 4.7, 0]}><cylinderGeometry args={[0.16, 0.16, 0.5, 16]} /><meshStandardMaterial color="#8f8c96" roughness={0.5} metalness={0.3} /></mesh>
      {/* the yellow-and-black guard band and a little pink notice */}
      <mesh position={[0, 1.2, 0]}><cylinderGeometry args={[0.115, 0.118, 1.2, 16, 1, true]} /><meshStandardMaterial color="#efe3a8" roughness={0.7} /></mesh>
      <mesh position={[0.12, 1.75, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[0.16, 0.24]} /><meshStandardMaterial color="#f6c3d1" roughness={0.8} /></mesh>
    </group>
  )
}

/** a cast-iron manhole cover with a sakura relief (Japan's decorated covers) */
function Manhole({ x, z }: { x: number; z: number }) {
  const map = useMemo(() => canvasTex(512, 512, (g) => {
    g.fillStyle = '#5c5a64'; g.beginPath(); g.arc(256, 256, 256, 0, Math.PI * 2); g.fill()
    g.strokeStyle = '#7c7884'; g.lineWidth = 14; g.beginPath(); g.arc(256, 256, 236, 0, Math.PI * 2); g.stroke()
    const flower = (cx: number, cy: number, r: number, col: string) => {
      g.fillStyle = col
      for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5; g.beginPath(); g.ellipse(cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * 0.75, r * 0.5, a, 0, Math.PI * 2); g.fill() }
      g.fillStyle = '#f6e2a0'; g.beginPath(); g.arc(cx, cy, r * 0.35, 0, Math.PI * 2); g.fill()
    }
    flower(256, 256, 62, '#f2a7bd')
    ;[[150, 150], [362, 160], [160, 365], [360, 360], [256, 110], [110, 256], [400, 256], [256, 405]].forEach(([cx, cy], i) => flower(cx, cy, 26, i % 2 ? '#f7c6d4' : '#ef9fb6'))
  }), [])
  return (
    <mesh position={[x, 0.004, z]} rotation={[-Math.PI / 2, 0, 0.4]} receiveShadow>
      <circleGeometry args={[0.32, 48]} />
      <meshStandardMaterial map={map} bumpMap={map} bumpScale={2} metalness={0.6} roughness={0.35} transparent />
    </mesh>
  )
}

/** fallen sakura petals on the pavements and the road: one instanced mesh */
function Petals({ R, L, KERB, road }: Layout) {
  const { geo, mat, mats } = useMemo(() => {
    const map = canvasTex(64, 64, (g) => {
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(32, 4); g.bezierCurveTo(60, 14, 56, 50, 32, 60); g.bezierCurveTo(8, 50, 4, 14, 32, 4); g.fill()
      g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(26, 0); g.lineTo(32, 12); g.lineTo(38, 0); g.fill()
    })
    const mat = new THREE.MeshStandardMaterial({ map, alphaTest: 0.5, color: '#f7b8c9', roughness: 0.6, side: THREE.DoubleSide })
    const n = 160, mats: THREE.Matrix4[] = [], o = new THREE.Object3D()
    let seed = 11; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    for (let i = 0; i < n; i++) {
      const side = r()
      const x = side < 0.35 ? road[1] + r() * (R - road[1]) : side < 0.7 ? L + r() * (road[0] - L) : road[0] + r() * (road[1] - road[0])
      const y = x > road[1] || x < road[0] ? KERB + 0.003 : 0.006
      o.position.set(x, y, 2.5 - Math.pow(r(), 0.7) * 13); o.rotation.set(-Math.PI / 2, 0, r() * Math.PI * 2); o.scale.setScalar(0.035 + r() * 0.025)
      o.updateMatrix(); mats.push(o.matrix.clone())
    }
    return { geo: new THREE.PlaneGeometry(1, 1), mat, mats }
  }, [R, L, KERB, road])
  return (
    <instancedMesh args={[geo, mat, mats.length]} receiveShadow
      ref={(m) => { if (m) { mats.forEach((mx, i) => m.setMatrixAt(i, mx)); m.instanceMatrix.needsUpdate = true } }} />
  )
}

export default function StreetDressing(layout: Layout) {
  const { R, L, KERB, road } = layout
  const leaf = useMemo(leafTex, [])
  return (
    <group>
      {/* shop signs, both sides, reading down the street */}
      <Kanban x={R} y={1.85} z={-3.6} dir={-1} text="喫茶さくら" bg="#fff3ea" fg="#d36f8f" />
      <Kanban x={R} y={1.8} z={-6.9} dir={-1} text="花屋" bg="#f6c3d1" fg="#5a3646" h={0.7} />
      <Kanban x={R} y={1.85} z={-10.2} dir={-1} text="甘味処" bg="#fde7b8" fg="#7a4a3a" h={0.8} />
      <Kanban x={L} y={1.8} z={-2.6} dir={1} text="古本" bg="#d9cdf0" fg="#43355e" h={0.7} />
      <Kanban x={L} y={1.8} z={-5.8} dir={1} text="ゆめや" bg="#fff3ea" fg="#6a4f8a" h={0.75} />
      <Kanban x={L} y={1.85} z={-9.4} dir={1} text="手紙" bg="#f6c3d1" fg="#5a3646" h={0.7} />

      {/* the left pavement: an A-board, the bicycle, potted lilies, bushes, the pole */}
      <ABoard x={-1.5} z={-1.9} top={KERB} yaw={0.5} />
      <Bicycle x={L + 0.22} z={-4.3} top={KERB} />
      <GlbProp url={LILIES_URL} x={L + 0.22} z={-2.0} top={KERB + 0.34} height={0.5} rotation={[0, 1.2, 0]} tint="#fff8f2" />
      <mesh position={[L + 0.22, KERB + 0.17, -2.0]} castShadow><cylinderGeometry args={[0.15, 0.12, 0.34, 18]} /><meshStandardMaterial color="#f3e6de" roughness={0.35} /></mesh>
      <Bush x={L + 0.24} z={-6.8} top={KERB} r={0.22} pot="#e9b7c4" blossom="#fff4ef" leaf={leaf} />
      <Bush x={L + 0.24} z={-7.5} top={KERB} r={0.18} pot="#d8cdea" leaf={leaf} />
      <Pole x={L + 0.32} z={-8.4} />
      <Bush x={L + 0.24} z={-11.2} top={KERB} r={0.2} pot="#f3e6de" blossom="#f4a6bf" leaf={leaf} />

      {/* the right pavement, past the vending machine: a bench with flower crates, bushes, potted lilies */}
      <Bush x={R - 0.24} z={-3.3} top={KERB} r={0.2} pot="#f3e6de" blossom="#f4a6bf" leaf={leaf} />
      <Bench x={R - 0.3} z={-6.0} top={KERB} dir={1} />
      <GlbProp url={LILIES_URL} x={R - 0.22} z={-7.8} top={KERB + 0.34} height={0.5} rotation={[0, -0.6, 0]} tint="#ffad85" />
      <mesh position={[R - 0.22, KERB + 0.17, -7.8]} castShadow><cylinderGeometry args={[0.15, 0.12, 0.34, 18]} /><meshStandardMaterial color="#e9b7c4" roughness={0.35} /></mesh>
      <Bush x={R - 0.24} z={-9.0} top={KERB} r={0.22} pot="#d8cdea" blossom="#d9b8f2" leaf={leaf} />
      <Bush x={R - 0.24} z={-12} top={KERB} r={0.18} pot="#f3e6de" leaf={leaf} />

      <Manhole x={(road[0] + road[1]) / 2 + 0.15} z={-2.2} />
      <Petals {...layout} />
    </group>
  )
}
