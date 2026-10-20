import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { SceneReady } from './SceneReady'
import { Canvas, useFrame, useLoader, useThree, type ThreeEvent } from '@react-three/fiber'
import { useAdaptiveDpr } from './AdaptiveDpr'
import { ContactShadows, Environment, Html, Lightformer, useGLTF } from '@react-three/drei'
import { AnimatePresence, motion } from 'framer-motion'
import * as THREE from 'three'
import { EffectComposer, Bloom, N8AO, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import { addWear } from './Wear'
import { makeSticker, warmStickers, type StickerSpec } from './Stickers'
import ClawScenery, { FLOOR_Y } from './ClawScenery'
import { logoGeometry, logoMaterial } from './SkillLogos'
import { useI18n } from '../i18n'
import type { Tool } from '../pages/content'
import lilyArt from '../assets/card/lily.webp'
import heartArt from '../assets/about/heart.webp'
import charmsArt from '../assets/badge/charms.webp'
import coinArt from '../assets/arcade/coin-face.webp'
import punchArt from '../assets/card/punchlines.webp'
import kittenArt from '../assets/posters/poster-08.webp'
import ramuneArt from '../assets/posters/poster-04.webp'
import goldfishArt from '../assets/posters/poster-11.webp'
import ramenArt from '../assets/posters/poster-06.webp'
import dokoArt from '../assets/posters/poster-07.webp'
import koiArt from '../assets/posters/poster-13.webp'
import fujiArt from '../assets/posters/poster-01.webp'
import bikeArt from '../assets/posters/poster-02.webp'
import radioArt from '../assets/posters/poster-12.webp'
import noodleArt from '../assets/posters/poster-03.webp'
import bunnyArt from '../assets/postcards/bunny-blue.webp'
import fragmentsArt from '../assets/fragments/01-titulo.webp'

/**
 * Skills = a claw machine full of Ana's 3D logos (2026-10-20: she picked "máquina de pelúcia" and sent
 * `claw_machine_with_textures.glb`, "mas dá uma mudada no visual exterior"). The model is Sketchfab's, stripped of
 * its plushies and of its texture atlas (third-party characters, a "STAR CATCHER" sign) by `scripts/prep-claw.mjs`;
 * every part is recoloured here in her palette (sage cabinet, cream frame, pink table, teal rails), with a sign
 * "Skills" on the top plate, and worn stickers made from her images (`Stickers.tsx`).
 *
 * Everything below works in the model's own units (cm; cabinet x −102…103, y −85…165, front at z ≈ 100).
 * The claw follows the pointer over the pit; a click (or Space) drops it; it grabs the logo underneath, carries it to
 * the chute (front-left) and the logo pops out of the prize door with its paper tag. A tiny sphere physics (no
 * library) keeps the logos piled, tumbling and occasionally slipping out of the claw.
 */

const MACHINE_URL = '/models/claw.glb'
const SCALE = 0.01
const FLOOR = -1.8 // pit floor
const CHUTE = { x0: -87.8, x1: -22.6, z0: 50.1, z1: 96.3, top: 35.4 }
const CHUTE_DROP = { x: -55, z: 73 }
const DOOR = new THREE.Vector3(-47.8, -48, 150) // in front of the prize door
const CLAW0 = { x: 18.2, z: 8.2, bottom: 85.4 }
const RAIL = { x0: -70, x1: 72, z0: -70, z1: 82 }
/** the cable hangs from the carriage box (bottom at y 133) into the top of the claw's dome */
const CABLE = { top: 133, r: 2.2, rib: 1.7, x: 0.3, z: 0.3 }
/** the claw rests 18 cm higher than in the model so it clears the shelf row (logo tops at 101) */
const LIFT = 18
const G = -980

const COLORS: [RegExp, string, ('plastic' | 'chrome' | 'felt')?][] = [
  [/^box_low/, '#a9c79f'], [/^frame_low/, '#f3ebdc'], [/^rails_low_boxblue2/, '#3f6b6a'], [/^rails_low_boxsilver/, '#e4e7ee', 'chrome'],
  [/^clawbox_low/, '#4f7f7b'], [/^wall_low/, '#efe6d6'], [/^table1_low_boxpink1/, '#f2a0b4'], [/^table1_low_boxpink2/, '#f7d2db'],
  [/^table2_low/, '#94b48b'], [/^plate_low/, '#f6c9d4'], [/^hole_low/, '#2b2226'], [/^controller_low_boxblue/, '#3f6b6a'],
  [/^controller_low_boxsilver/, '#e4e7ee', 'chrome'], [/^controller_low_controller/, '#f2a0b4'], [/^pipes_low/, '#e4e7ee', 'chrome'],
  [/^claw_low/, '#e4e7ee', 'chrome'], [/^ufo1?_low/, '#f2a0b4'], [/^yellowplane_low/, '#efe5d3', 'felt'],
]

type Phase = 'idle' | 'down' | 'close' | 'up' | 'carry' | 'open'
/**
 * The display (Ana, 2026-10-20: "logos muito pequenos; coloque num display mais organizado para ver todos"): every logo
 * has a slot, upright and facing the glass — four on the back shelf (`table2`, top at y 59), four in a back row and three
 * in a front row on the floor (staggered so none hides another, the front-left kept clear for the chute).
 */
const SIZE = 42 // logo width (cm); the cabinet is 205 wide
const HALF = SIZE / 2
const SHELF_TOP = 59
const STEP = { top: 22, z0: -48, z1: -2 } // a cream riser for the middle row, so the floor rows don't hide each other
const OX = -13 // the camera sits to the right: nudge the display left so the right column clears the frame
const SLOTS: [number, number, number][] = [
  [OX - 57, SHELF_TOP + HALF, -68], [OX - 19, SHELF_TOP + HALF, -68], [OX + 19, SHELF_TOP + HALF, -68], [OX + 57, SHELF_TOP + HALF, -68],
  [OX - 57, STEP.top + HALF, -25], [OX - 19, STEP.top + HALF, -25], [OX + 19, STEP.top + HALF, -25], [OX + 57, STEP.top + HALF, -25],
  [OX - 40, FLOOR + HALF, 28], [OX, FLOOR + HALF, 28], [OX + 40, FLOOR + HALF, 28],
]
type LogoState = 'home' | 'held' | 'drop' | 'fall' | 'won'
type Body = { id: string; home: THREE.Vector3; p: THREE.Vector3; vy: number; state: LogoState; spin: number; wait: number; pop: number }
/**
 * Where a logo appears (Ana, 2026-10-20: "ao spawnar têm que vir de dentro da máquina, de cima para baixo" — they used to
 * start 1.6 m up and fall in through the roof): just under the inner ceiling (LED strip at y 126), then straight down
 * into its slot. They come in one after another (`wait`) and grow in over a beat (`pop`) instead of all at once.
 */
const SPAWN_Y = 124 - HALF
const spawn = (b: Body, wait: number) => { b.p.set(b.home.x, SPAWN_Y, b.home.z); b.vy = 0; b.state = 'drop'; b.wait = wait; b.pop = 0 }

const rand = (a: number, b: number) => a + Math.random() * (b - a)

RectAreaLightUniformsLib.init()
/**
 * LED strips inside the display (Ana, 2026-10-20: "ficou muito escura; faça como se tivesse strip LED dentro dela"): a
 * glowing strip (HDR basic material, the bloom catches it) + a rect-area light facing into the display for each one —
 * along the top under the plate, both inner sides of the window and the bottom lip. Machine cm; the area light's size
 * is in metres (three ignores the parent's scale for it). `face` = direction the strip shines.
 */
const LED = new THREE.Color('#fff1de').multiplyScalar(2.6)
const STRIPS: { p: [number, number, number]; size: [number, number]; rot: [number, number, number]; power: number }[] = [
  { p: [0, 126.2, 90], size: [158, 1.4], rot: [-Math.PI / 2, 0, 0], power: 45 }, // top, shining down
  { p: [-80.5, 66, 90], size: [1.4, 112], rot: [0, -Math.PI / 2, 0], power: 20 }, // left side, shining right
  { p: [80.5, 66, 90], size: [1.4, 112], rot: [0, Math.PI / 2, 0], power: 20 }, // right side, shining left
  { p: [0, 7, 90], size: [158, 1.2], rot: [Math.PI / 2, 0, 0], power: 12 }, // bottom lip, shining up
]

/**
 * Stickers (Ana, 2026-10-20: "coloque uns adesivos nele — imagens de outras páginas — realistas, com dobras, sujeira").
 * Each one is placed by a ray (machine cm) onto a named part, so it sits on the real surface whatever its shape.
 */
type Spot = Omit<StickerSpec, 'img'> & { src: string; rot: number; on: RegExp; from: [number, number, number]; dir: [number, number, number] }
const FRONT = /^table1_low_boxpink1/, SIDE = /^box_low/, GLASS = /^glass2_low_glass2/, LEDGE = /^table1_low_boxpink2/, FRAME = /^frame_low/
const SPOTS: Spot[] = [
  // the pink front, right of the prize door (x −70…−25)
  { src: kittenArt, kind: 'rect', h: 40, rot: -6, age: 0.55, seed: 11, on: FRONT, from: [32, -46, 240], dir: [0, 0, -1], creases: [[0.08, 0.64, 0.96, 0.5]], peel: { corner: 2, len: 0.3 }, bubbles: 2 },
  { src: coinArt, kind: 'circle', h: 20, rot: 12, age: 0.75, seed: 4, on: FRONT, from: [-8, -30, 240], dir: [0, 0, -1], bubbles: 1 },
  { src: heartArt, kind: 'die', h: 19, rot: 14, age: 0.45, seed: 9, on: FRONT, from: [-4, -66, 240], dir: [0, 0, -1] },
  // the right side (the machine is turned so the camera sees it)
  { src: lilyArt, kind: 'die', h: 80, rot: -4, age: 0.35, seed: 21, on: SIDE, from: [240, 92, 22], dir: [-1, 0, 0], creases: [[0.06, 0.3, 0.72, 0.96]], bubbles: 3 },
  { src: ramuneArt, kind: 'rect', h: 52, rot: 7, age: 0.6, seed: 5, on: SIDE, from: [240, -18, 52], dir: [-1, 0, 0], creases: [[0.0, 0.56, 1.0, 0.62]], peel: { corner: 0, len: 0.34 } },
  { src: goldfishArt, kind: 'rect', h: 40, rot: -11, age: 0.85, seed: 31, on: SIDE, from: [240, -38, -30], dir: [-1, 0, 0], creases: [[0.2, 0.0, 0.42, 1.0], [0.0, 0.3, 1.0, 0.36]], bubbles: 1 },
  { src: charmsArt, kind: 'die', h: 42, rot: 6, age: 0.3, seed: 17, on: SIDE, from: [240, 130, -55], dir: [-1, 0, 0] },
  // one on the glass, top-right corner
  { src: punchArt, kind: 'die', h: 30, rot: 8, age: 0.25, seed: 2, on: GLASS, from: [60, 110, 240], dir: [0, 0, -1] },
  // more, Ana 2026-10-20 ("coloque mais adesivos"): the front is crowded the way real arcade machines are
  { src: ramenArt, kind: 'rect', h: 24, rot: 9, age: 0.65, seed: 41, on: FRONT, from: [68, -32, 240], dir: [0, 0, -1], creases: [[0.0, 0.42, 1.0, 0.47]] },
  { src: bunnyArt, kind: 'rect', h: 15, rot: -13, age: 0.5, seed: 43, on: FRONT, from: [64, -68, 240], dir: [0, 0, -1], peel: { corner: 1, len: 0.3 } },
  { src: dokoArt, kind: 'rect', h: 16, rot: 4, age: 0.9, seed: 47, on: FRONT, from: [-14, -72, 240], dir: [0, 0, -1], creases: [[0.1, 1.0, 0.6, 0.0]] },
  { src: fragmentsArt, kind: 'rect', h: 12, rot: -3, age: 0.4, seed: 53, on: FRONT, from: [-50, -19, 240], dir: [0, 0, -1] },
  { src: koiArt, kind: 'rect', h: 18, rot: 24, age: 0.7, seed: 59, on: LEDGE, from: [-62, 60, 122], dir: [0, -1, 0], creases: [[0.0, 0.7, 1.0, 0.55]] },
  { src: heartArt, kind: 'die', h: 9, rot: -18, age: 0.3, seed: 61, on: FRAME, from: [-84, 8, 240], dir: [0, 0, -1] },
  { src: bikeArt, kind: 'rect', h: 22, rot: -7, age: 0.35, seed: 71, on: GLASS, from: [-64, 112, 240], dir: [0, 0, -1], bubbles: 2 },
  { src: radioArt, kind: 'rect', h: 30, rot: 4, age: 0.55, seed: 73, on: SIDE, from: [240, 40, -66], dir: [-1, 0, 0], peel: { corner: 3, len: 0.25 } },
  { src: fujiArt, kind: 'rect', h: 24, rot: -8, age: 0.45, seed: 79, on: SIDE, from: [240, 140, 52], dir: [-1, 0, 0] },
  { src: noodleArt, kind: 'rect', h: 26, rot: 12, age: 0.75, seed: 83, on: SIDE, from: [240, -62, 78], dir: [-1, 0, 0], creases: [[0.3, 0.0, 0.5, 1.0]] },
]
/** the machine turns its right side a little toward the camera: more depth, and the side stickers show */
const YAW = -0.16 // −0.38 was "de lado demais" (Ana, 2026-10-20)

/* -------------------------------------------------------------------------------------------- the machine */
function Machine({ tools, onWin, dropRef, aimRef }: {
  tools: Tool[]
  onWin: (t: Tool) => void
  dropRef: React.MutableRefObject<(() => void) | null>
  aimRef: React.MutableRefObject<{ x: number; z: number; drop: boolean }>
}) {
  const { lang } = useI18n()
  const { scene } = useGLTF(MACHINE_URL)

  // clone + recolour + re-parent the moving parts
  const rig = useMemo(() => {
    const root = scene.clone(true)
    root.updateMatrixWorld(true)
    const find = (re: RegExp) => { let hit: THREE.Object3D | undefined; root.traverse((o) => { if (!hit && (o as THREE.Mesh).isMesh && re.test(o.name)) hit = o }); return hit }
    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.raycast = () => {} // the aim plane and the logos take the pointer, not the cabinet or the glass
      if (/glass/.test(m.name)) {
        // fingerprints and wiped smudges show up as roughness in the reflections
        m.material = addWear(new THREE.MeshPhysicalMaterial({ color: '#eef6f2', transparent: true, opacity: 0.06, roughness: 0.05, metalness: 0, envMapIntensity: 0.75, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide }), { scale: 3.2, rough: 0.2, grime: 0 })
        m.userData.isHull = true // no ink outline on the panes
        m.renderOrder = 5
        return
      }
      const rule = COLORS.find(([re]) => re.test(m.name))
      const color = rule?.[1] ?? '#f3ebdc'
      const kind = rule?.[2] ?? 'plastic'
      // realistic finishes: brushed chrome, painted cabinet with a thin lacquer, felt; all a little used
      m.material = kind === 'chrome'
        ? addWear(new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: 0.2, envMapIntensity: 1 }), { scale: 4, rough: 0.16, grime: 0.06 })
        : kind === 'felt'
          ? new THREE.MeshStandardMaterial({ color, roughness: 1 })
          : addWear(new THREE.MeshPhysicalMaterial({ color, roughness: 0.42, clearcoat: 0.3, clearcoatRoughness: 0.3, envMapIntensity: 0.9 }))
      m.castShadow = m.receiveShadow = true
      if (!m.geometry.attributes.normal) m.geometry.computeVertexNormals()
    })
    // where each sticker lands: first hit of its ray on its part (the parts' own raycast is switched off above)
    const rc = new THREE.Raycaster()
    const spots = SPOTS.map((sp) => {
      const targets: THREE.Mesh[] = []
      root.traverse((o) => { if ((o as THREE.Mesh).isMesh && sp.on.test(o.name)) targets.push(o as THREE.Mesh) })
      rc.set(new THREE.Vector3(...sp.from), new THREE.Vector3(...sp.dir).normalize())
      const hits: THREE.Intersection[] = []
      targets.forEach((t) => THREE.Mesh.prototype.raycast.call(t, rc, hits))
      hits.sort((a, b) => a.distance - b.distance)
      const h = hits[0]
      if (!h?.face) return null
      const n = h.face.normal.clone().transformDirection(h.object.matrixWorld)
      if (n.dot(rc.ray.direction) > 0) n.negate()
      return { point: h.point.clone(), normal: n }
    })
    // carriage (moves in x/z): carriage box + pipe + claw head; the claw head also moves in y
    const carriage = new THREE.Group(); carriage.position.set(CLAW0.x, 0, CLAW0.z); root.add(carriage); carriage.updateMatrixWorld(true)
    const head = new THREE.Group(); carriage.add(head); head.updateMatrixWorld(true)
    const box = find(/^clawbox_low/), pipe = find(/^pipes_low/), claw = find(/^claw_low/), ufo = find(/^ufo_low/), ufo1 = find(/^ufo1_low/)
    if (box) carriage.attach(box)
    for (const o of [claw, ufo, ufo1]) if (o) head.attach(o)
    // the model's pipe is one piece (ribbed cable + thin rod + collar): stretched, the thin rod turned into an
    // invisible thread and the claw looked cut loose. Our own cable spans carriage → dome, ribs repeated, not stretched.
    pipe?.removeFromParent()
    const domeTop = new THREE.Box3().setFromObject(head).max.y // in the head's rest frame (cm)
    const ribs = (() => {
      const c = document.createElement('canvas'); c.width = 4; c.height = 32
      const g = c.getContext('2d')!, gr = g.createLinearGradient(0, 0, 0, 32)
      gr.addColorStop(0, '#2a2730'); gr.addColorStop(0.45, '#8d8896'); gr.addColorStop(0.6, '#5c5866'); gr.addColorStop(1, '#2a2730')
      g.fillStyle = gr; g.fillRect(0, 0, 4, 32)
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace
      return t
    })()
    const cableGeo = new THREE.CylinderGeometry(CABLE.r, CABLE.r, 1, 12, 1, true).translate(0, -0.5, 0) // pivot at the top
    const cable = new THREE.Mesh(cableGeo, new THREE.MeshStandardMaterial({ map: ribs, bumpMap: ribs, bumpScale: 0.6, metalness: 0.6, roughness: 0.45 }))
    cable.position.set(CABLE.x, CABLE.top, CABLE.z); carriage.add(cable)
    return { root, carriage, head, cable, ribs, domeTop, claw, spots, clawScale: claw ? claw.scale.clone() : new THREE.Vector3(1, 1, 1) }
  }, [scene])
  // (no ink outline here: Ana asked for a realistic machine)

  const arts = useLoader(THREE.ImageLoader, SPOTS.map((s) => s.src)) as HTMLImageElement[]
  const stickers = useMemo(() => {
    const g = new THREE.Group()
    SPOTS.forEach((sp, i) => {
      const at = rig.spots[i]
      if (!at) return
      const st = makeSticker({ ...sp, img: arts[i] })
      st.position.copy(at.point).addScaledVector(at.normal, i * 0.03) // overlapping stickers stack, never z-fight
      st.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), at.normal).premultiply(new THREE.Quaternion().setFromAxisAngle(at.normal, THREE.MathUtils.degToRad(sp.rot)))
      g.add(st)
    })
    return g
  }, [rig, arts])

  // the sign on the top plate
  const sign = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 1600; c.height = 260
    const g = c.getContext('2d')!
    g.fillStyle = '#f6c9d4'; g.fillRect(0, 0, 1600, 260)
    g.fillStyle = '#1b1620'; g.font = "400 150px 'Butler', 'Instrument Serif', Georgia, serif"; g.textBaseline = 'middle'
    g.fillText('Skills', 70, 140)
    g.fillStyle = '#6b5a6e'; g.font = '600 38px Inter, system-ui, sans-serif'
    const sub = lang === 'pt' ? 'PEGUE UMA FERRAMENTA' : 'GRAB A TOOL'
    let x = 1530 - [...sub].reduce((a, ch) => a + g.measureText(ch).width + 8, 0)
    for (const ch of sub) { g.fillText(ch, x, 140); x += g.measureText(ch).width + 8 }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
    return t
  }, [lang])

  // logos in their display slots
  const geos = useMemo(() => tools.map((t) => logoGeometry(t.id)), [tools])
  const mats = useMemo(() => tools.map((t) => logoMaterial(t.id)), [tools])
  const bodies = useMemo<Body[]>(() => tools.map((t, i) => {
    const h = new THREE.Vector3(...(SLOTS[i] ?? SLOTS[SLOTS.length - 1]))
    return { id: t.id, home: h, p: h.clone().setY(SPAWN_Y), vy: 0, state: 'drop' as LogoState, spin: rand(0, 6), wait: 0.25 + i * 0.12, pop: 0 }
  }), [tools])
  const meshes = useRef<(THREE.Group | null)[]>([])
  const [hover, setHover] = useState<string | null>(null)

  // claw state
  const st = useRef({ phase: 'idle' as Phase, t: 0, drop: 0, depth: 0, held: -1 as number, slip: false, grabs: 0, cx: CLAW0.x, cz: CLAW0.z })
  const reduce = useMemo(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, [])

  const startDrop = () => { const s = st.current; if (s.phase === 'idle') { s.phase = 'down'; s.t = 0 } }
  useEffect(() => { dropRef.current = () => { aimRef.current.drop = true } }, [dropRef, aimRef])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 30)
    const s = st.current
    const aim = aimRef.current
    // ---- carriage
    let tx = aim.x, tz = aim.z
    // carrying: come forward first (out of the shelf row), then across to the chute
    if (s.phase === 'carry' || s.phase === 'open') { tz = CHUTE_DROP.z; tx = s.cz < -30 ? s.cx : CHUTE_DROP.x }
    if (s.phase === 'idle' || s.phase === 'carry') {
      s.cx = THREE.MathUtils.damp(s.cx, THREE.MathUtils.clamp(tx, RAIL.x0, RAIL.x1), 3.2, dt)
      s.cz = THREE.MathUtils.damp(s.cz, THREE.MathUtils.clamp(tz, RAIL.z0, RAIL.z1), 3.2, dt)
    }
    if (s.phase === 'idle' && aim.drop && Math.hypot(s.cx - tx, s.cz - tz) < 4) { aim.drop = false; startDrop() }
    rig.carriage.position.set(s.cx, 0, s.cz)

    // ---- claw head
    const bottom = () => CLAW0.bottom + LIFT - s.drop
    if (s.phase === 'down') {
      if (s.t === 0) {
        // how deep: the claw wraps the top of the logo under it, else it stops on the shelf / floor
        let top = s.cz < -48 ? SHELF_TOP + 4 : s.cz < STEP.z1 ? STEP.top + 4 : FLOOR + 6
        bodies.forEach((b) => { if (b.state === 'home' && Math.hypot(b.p.x - s.cx, b.p.z - s.cz) < HALF) top = Math.max(top, b.p.y + HALF - 10) })
        s.depth = CLAW0.bottom + LIFT - top
      }
      s.t += dt
      s.drop = Math.min(s.depth, s.drop + dt * 95)
      if (s.drop >= s.depth) { s.phase = 'close'; s.t = 0 }
    } else if (s.phase === 'close') {
      s.t += dt
      if (s.t > 0.35) {
        // grab the logo under the claw
        let best = -1, bd = Infinity
        bodies.forEach((b, i) => { const d = Math.hypot(b.p.x - s.cx, b.p.z - s.cz); if (b.state === 'home' && d < HALF && d < bd) { bd = d; best = i } })
        // the first grab always works; after that, 9 in 10
        if (best >= 0 && (s.grabs++ === 0 || Math.random() < 0.9)) { s.held = best; bodies[best].state = 'held'; s.slip = !reduce && s.grabs > 1 && Math.random() < 0.12 }
        s.phase = 'up'; s.t = 0
      }
    } else if (s.phase === 'up') {
      s.drop = Math.max(0, s.drop - dt * 75)
      if (s.slip && s.held >= 0 && s.drop < s.depth * 0.45) { const b = bodies[s.held]; b.state = 'drop'; b.vy = 0; s.held = -1; s.slip = false }
      if (s.drop <= 0) { s.phase = s.held >= 0 ? 'carry' : 'idle'; s.t = 0 }
    } else if (s.phase === 'carry') {
      if (Math.hypot(s.cx - CHUTE_DROP.x, s.cz - CHUTE_DROP.z) < 3) { s.phase = 'open'; s.t = 0 }
    } else if (s.phase === 'open') {
      s.t += dt
      if (s.t > 0.15 && s.held >= 0) { const b = bodies[s.held]; b.state = 'fall'; b.vy = -40; s.held = -1 }
      if (s.t > 0.6) { s.phase = 'idle'; aim.x = CHUTE_DROP.x + 30; aim.z = CHUTE_DROP.z - 40 }
    }
    rig.head.position.y = LIFT - s.drop
    // cable: from the carriage down to 4 cm inside the dome, wherever the head is
    const len = Math.max(0.5, CABLE.top - (rig.domeTop + rig.head.position.y - 4))
    rig.cable.scale.y = len
    rig.ribs.repeat.set(1, len / CABLE.rib)
    const closed = s.phase === 'close' || s.phase === 'up' || s.phase === 'carry'
    if (rig.claw) {
      // the prongs squeeze in (the claw is one mesh: a scale around its own centre reads as closing)
      const k = closed ? 0.8 : 1, base = rig.clawScale
      rig.claw.scale.x = THREE.MathUtils.damp(rig.claw.scale.x, base.x * k, 10, dt)
      rig.claw.scale.y = THREE.MathUtils.damp(rig.claw.scale.y, base.y * k, 10, dt)
    }

    // ---- logos
    const t = performance.now() / 1000
    bodies.forEach((b, i) => {
      if (b.state === 'held') {
        // gripped: the top of the logo sits inside the prongs
        b.p.set(s.cx, bottom() - HALF + 12, s.cz)
      } else if (b.state === 'drop') {
        // falling into its slot (start, slip, "grab another"): gravity + a small bounce
        if (b.wait > 0) b.wait -= dt
        else { b.pop = Math.min(1, b.pop + dt * 5); b.vy += G * dt; b.p.y += b.vy * dt }
        b.p.x = THREE.MathUtils.damp(b.p.x, b.home.x, 6, dt); b.p.z = THREE.MathUtils.damp(b.p.z, b.home.z, 6, dt)
        if (b.p.y <= b.home.y) { b.p.y = b.home.y; if (Math.abs(b.vy) > 120) b.vy *= -0.25; else { b.vy = 0; b.state = 'home' } }
      } else if (b.state === 'fall') {
        b.vy += G * dt; b.p.y += b.vy * dt
        b.p.x = THREE.MathUtils.clamp(b.p.x, CHUTE.x0 + HALF, CHUTE.x1 - HALF); b.p.z = THREE.MathUtils.clamp(b.p.z, CHUTE.z0 + HALF * 0.6, CHUTE.z1 - HALF * 0.6)
        if (b.p.y < -40) { b.state = 'won'; b.p.copy(DOOR); b.vy = 0; onWin(tools[i]) }
      }
      const g = meshes.current[i]; if (!g) return
      if (b.state === 'won') {
        g.position.set(DOOR.x, DOOR.y + Math.sin(t * 2) * 3, DOOR.z)
        g.rotation.set(0, Math.sin(t * 1.2) * 0.6, 0)
        return
      }
      g.position.copy(b.p)
      // not yet spawned: hidden; then it grows in at the top of the display (eased)
      g.visible = !(b.state === 'drop' && b.wait > 0)
      const k = b.pop < 1 ? 1 - (1 - b.pop) ** 3 : 1
      g.scale.setScalar(Math.max(0.001, k))
      // upright, facing the glass (a touch toward the camera, which sits to the right), breathing a little
      const idle = b.state === 'home' ? Math.sin(t * 0.8 + b.spin) * 0.18 : Math.sin(t * 6) * 0.08
      g.rotation.set(0, 0.22 + idle, b.state === 'home' ? Math.sin(t * 0.6 + b.spin) * 0.04 : 0)
    })
  })

  // pointer → aim (local cm), click → drop
  const toLocal = (e: ThreeEvent<PointerEvent | MouseEvent>) => { const p = e.point.clone(); rig.root.parent?.worldToLocal(p); return p }
  const onAim = (e: ThreeEvent<PointerEvent>) => { const p = toLocal(e); aimRef.current.x = p.x; aimRef.current.z = p.z }
  const onDrop = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); const p = toLocal(e); aimRef.current.x = p.x; aimRef.current.z = p.z; aimRef.current.drop = true }

  // respawn a won logo once its tag has been closed (parent bumps `respawn`)
  useEffect(() => {
    const onRespawn = (ev: Event) => {
      const id = (ev as CustomEvent<string>).detail
      const b = bodies.find((x) => x.id === id)
      if (b && b.state !== 'home') spawn(b, 0.1)
    }
    window.addEventListener('claw:respawn', onRespawn)
    return () => window.removeEventListener('claw:respawn', onRespawn)
  }, [bodies])

  return (
    <group scale={SCALE} rotation={[0, YAW, 0]}>
      <primitive object={rig.root} />
      <primitive object={stickers} />
      {/* the machine lights its own display: LED strips around the inside of the window, behind the glass (z 98) */}
      {STRIPS.map((st, i) => (
        <group key={i} position={st.p}>
          <mesh><boxGeometry args={[st.size[0], st.size[1], 1.2]} /><meshBasicMaterial color={LED} toneMapped={false} /></mesh>
          {/* area light: the strip's length (m) × 6 cm (a slim strip is a tiny area: it needs the power) */}
          <rectAreaLight rotation={st.rot} width={st.size[0] > st.size[1] ? st.size[0] * 0.01 : 0.06} height={st.size[1] > st.size[0] ? st.size[1] * 0.01 : 0.06} intensity={st.power} color="#ffeedd" />
        </group>
      ))}
      <pointLight position={[0, 110, 30]} color="#ffe9d2" intensity={1.2} distance={2.4} decay={1.6} />
      <pointLight position={[-30, 40, -50]} color="#dfeee8" intensity={0.3} distance={1.6} decay={1.8} />
      {/* sign on the plate's front face: a backlit panel */}
      <mesh position={[-0.8, 144, 105.8]}><planeGeometry args={[160, 26]} /><meshStandardMaterial map={sign} emissiveMap={sign} emissive="#ffffff" emissiveIntensity={0.55} roughness={0.35} /></mesh>
      {/* the riser under the middle row */}
      <mesh position={[0, (FLOOR + STEP.top) / 2, (STEP.z0 + STEP.z1) / 2]} castShadow receiveShadow>
        <boxGeometry args={[172, STEP.top - FLOOR, STEP.z1 - STEP.z0]} /><meshStandardMaterial color="#f3ebdc" roughness={0.6} />
      </mesh>
      {/* the aim plane (invisible) inside the glass */}
      <mesh position={[0, 55, 4]} rotation={[-Math.PI / 2, 0, 0]} onPointerMove={onAim} onClick={onDrop}>
        <planeGeometry args={[176, 176]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {tools.map((tool, i) => (
        <group key={tool.id} ref={(el) => { meshes.current[i] = el }}>
          <mesh
            geometry={geos[i]} material={mats[i]} scale={SIZE}
            onPointerOver={(e) => { e.stopPropagation(); setHover(tool.id); document.body.style.cursor = 'pointer' }}
            onPointerOut={() => { setHover((h) => (h === tool.id ? null : h)); document.body.style.cursor = '' }}
            onClick={(e) => { e.stopPropagation(); const b = bodies[i]; if (b.state !== 'home') return; aimRef.current.x = b.home.x; aimRef.current.z = b.home.z; aimRef.current.drop = true }}
          />
          {hover === tool.id && bodies[i].state === 'home' && (
            <Html center position={[0, HALF + 10, 0]} zIndexRange={[40, 0]} style={{ pointerEvents: 'none' }}><div className="logo-label">{tool.name}</div></Html>
          )}
        </group>
      ))}
    </group>
  )
}

/* -------------------------------------------------------------------------------------------- camera + page */
const BG = '#0c0d12' // exactly the page's --bg (no tone mapping on this canvas), so the canvas has no edge
function FitCamera() {
  const { camera, size, scene, gl } = useThree()
  useEffect(() => {
    const fit = () => {
      const cam = camera as THREE.PerspectiveCamera
      const t2 = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2)
      const W = size.width, H = size.height, aspect = W / H
      // the whole cabinet (2.5 tall + sign; turned by YAW it is ~2.6 wide) as big as the page allows (Ana: "aumenta o tamanho")
      let d = Math.max(2.75 / 0.84 / t2, 2.5 / 0.86 / (t2 * aspect))
      // the scene is the whole page and the title sits inside it (Ana, 2026-10-20). If the title would cover the machine:
      // 1) wide screens — keep it big and slide it right, into the room beside the title ("nesse tamanho a máquina já
      //    deveria ter aumentado": shrinking it under the header left a small machine on a laptop);
      // 2) only when even that doesn't fit (phones) — fit it between the header and the controls.
      let sx = 0, sy = 0
      const top = gl.domElement.getBoundingClientRect().top
      const head = document.querySelector('.page.skills .page-head')?.getBoundingClientRect()
      const h1 = document.querySelector('.page.skills .page-head h1')?.getBoundingClientRect()
      const ui = 96
      if (head && h1) {
        const halfPx = (1.33 / (t2 * d * aspect)) * W // the cabinet's half-width on screen
        const left = h1.right + 28
        if (left > W / 2 - halfPx) {
          const cx = left + halfPx
          if (cx + halfPx <= W - 12) sx = cx - W / 2
          else {
            const below = head.bottom - top, free = Math.max(0.3, (H - below - ui) / H)
            d = Math.max(2.75 / (0.9 * free) / t2, 2.5 / 0.86 / (t2 * aspect))
            sy = (below - ui) / 2
          }
        }
      }
      cam.position.set(d * 0.12, 0.38 + d * 0.13, d)
      cam.lookAt(0, 0.34, 0.1)
      if (sx || sy) cam.setViewOffset(W, H, -sx, -sy, W, H); else cam.clearViewOffset()
      cam.updateProjectionMatrix()
      // the far floor and the room dissolve into the page colour; scaled by d so phones (d larger) match
      scene.fog = new THREE.Fog(BG, d * 1.9, d * 3.8) // far enough that the wall keeps its colour
    }
    fit()
    const late = window.setTimeout(fit, 700) // again once the title's font and letters have settled
    return () => window.clearTimeout(late)
  }, [camera, size.width, size.height, scene, gl])
  return null
}

export default function ClawMachine({ tools }: { tools: Tool[] }) {
  const [dpr, monitor] = useAdaptiveDpr(1.75)
  const { t, lang } = useI18n()
  const [won, setWon] = useState<Tool | null>(null)
  const [found, setFound] = useState<Set<string>>(() => new Set())
  const [list, setList] = useState(false)
  const dropRef = useRef<(() => void) | null>(null)
  const aimRef = useRef({ x: CLAW0.x, z: CLAW0.z, drop: false })
  const coarse = useMemo(() => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches, [])

  // a new prize sends the previous one (still bobbing at the door) back into the pit
  const onWin = (tool: Tool) => { setWon((prev) => { if (prev && prev.id !== tool.id) window.dispatchEvent(new CustomEvent('claw:respawn', { detail: prev.id })); return tool }); setFound((f) => new Set(f).add(tool.id)) }
  const close = () => { if (won) window.dispatchEvent(new CustomEvent('claw:respawn', { detail: won.id })); setWon(null) }

  // keyboard: arrows aim, space/enter drop, esc closes the tag
  useEffect(() => {
    const keys = new Set<string>()
    let raf = 0, last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const a = aimRef.current, v = 90 * dt
      if (keys.has('ArrowLeft')) a.x -= v
      if (keys.has('ArrowRight')) a.x += v
      if (keys.has('ArrowUp')) a.z -= v
      if (keys.has('ArrowDown')) a.z += v
      a.x = THREE.MathUtils.clamp(a.x, RAIL.x0, RAIL.x1); a.z = THREE.MathUtils.clamp(a.z, RAIL.z0, RAIL.z1)
      raf = requestAnimationFrame(loop)
    }
    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key.startsWith('Arrow')) { keys.add(e.key); e.preventDefault() }
      if ((e.key === ' ' || e.key === 'Enter') && !won) { aimRef.current.drop = true; e.preventDefault() }
      if (e.key === 'Escape') { setWon(null); setList(false) }
    }
    const up = (e: KeyboardEvent) => keys.delete(e.key)
    window.addEventListener('keydown', down); window.addEventListener('keyup', up)
    raf = requestAnimationFrame(loop)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); cancelAnimationFrame(raf) }
  }, [won])

  const shown = won
  return (
    <div className="cw">
      <div className="cw-stage">
        <Canvas shadows camera={{ position: [0.6, 1.2, 4.2], fov: 30 }} dpr={dpr} gl={{ antialias: true, alpha: false, toneMapping: THREE.NoToneMapping }}>
          {monitor}
          <color attach="background" args={[BG]} />
          <FitCamera />
          <Suspense fallback={null}>
            <SceneReady />{/* holds the page curtain until this scene has drawn */}
            {/* a room for the reflections: long ceiling panels, a warm wall lamp to the right, a dim cool one to the left */}
            <Environment resolution={256} frames={1} environmentIntensity={0.55}>
              <Lightformer form="rect" intensity={2.2} color="#fff6ea" position={[0, 5, 1]} rotation-x={Math.PI / 2} scale={[6, 0.6, 1]} />
              <Lightformer form="rect" intensity={1.6} color="#fff6ea" position={[0, 5, -2]} rotation-x={Math.PI / 2} scale={[6, 0.6, 1]} />
              <Lightformer form="rect" intensity={1.4} color="#ffd9b8" position={[5, 1.5, 1]} rotation-y={-Math.PI / 2} scale={[2, 3, 1]} />
              <Lightformer form="rect" intensity={0.6} color="#dde6f2" position={[-5, 1.5, 0]} rotation-y={Math.PI / 2} scale={[2, 3, 1]} />
            </Environment>
            {/* the key comes from above-right so the cabinet has a lit side and a shaded side (Ana: "faltam sombras, ficou muito
                claro" — the room stays bright from the lanterns, the machine keeps its form); weak fill, a rim from behind */}
            <hemisphereLight color="#fbeee6" groundColor="#2a201c" intensity={0.52} />
            <spotLight position={[2.6, 4.4, 2.8]} angle={0.62} penumbra={0.75} intensity={125} decay={2} color="#fff0de" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0002} shadow-normalBias={0.02} />
            <directionalLight position={[-3, 2, 3]} color="#e6e8f2" intensity={0.22} />
            <directionalLight position={[2.5, 3, -3]} color="#ffe2c4" intensity={0.8} />
            <ClawScenery />
            <Machine tools={tools} onWin={onWin} dropRef={dropRef} aimRef={aimRef} />
            {/* big plane, short reach: only the base darkens the floor, and the shadow fades out well inside the plane */}
            <ContactShadows position={[0, FLOOR_Y + 0.001, 0.05]} opacity={0.8} scale={6.5} blur={2.8} far={0.5} resolution={512} color="#030306" />
          </Suspense>
          {/* contact shadows in every crease (AO), a soft bloom on the tube and the glints, filmic tone mapping */}
          <EffectComposer multisampling={4}>
            <N8AO aoRadius={0.5} distanceFalloff={0.8} intensity={4} halfRes />
            <Bloom intensity={0.4} luminanceThreshold={0.9} luminanceSmoothing={0.2} mipmapBlur />
            <ToneMapping mode={ToneMappingMode.AGX} />
          </EffectComposer>
        </Canvas>
      </div>

      <div className="cw-ui">
        <p className="cw-hint">{coarse ? t('cw_hint_touch') : t('cw_hint')}</p>
        <div className="cw-side">
          <span className="cw-count">{t('cw_found').replace('{n}', String(found.size)).replace('{t}', String(tools.length))}</span>
          <button type="button" className="cw-list-btn" onClick={() => setList((v) => !v)} aria-expanded={list}>{list ? t('cw_hide_list') : t('cw_show_list')}</button>
        </div>
        <button type="button" className="cw-drop" onClick={() => { aimRef.current.drop = true }} aria-label={t('cw_drop')}>{t('cw_drop')}</button>
      </div>

      <AnimatePresence>
        {list && (
          <motion.ul className="cw-list" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
            {tools.map((tool) => (
              <li key={tool.id}><button type="button" className={found.has(tool.id) ? 'is-found' : ''} onClick={() => { setWon(tool); setFound((f) => new Set(f).add(tool.id)) }}>{tool.name}</button></li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {shown && (
          <motion.div className="cw-prize" role="dialog" aria-labelledby="cw-prize-name" initial={{ opacity: 0, y: 24, rotate: -4 }} animate={{ opacity: 1, y: 0, rotate: -1.5 }} exit={{ opacity: 0, y: 16 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
            <span className="cw-prize-kicker">{shown.area[lang]}</span>
            <h3 id="cw-prize-name">{shown.name}</h3>
            <div className="cw-level" aria-label={`${t('sk_level')} ${shown.level}/5`}>
              <small>{t('sk_level')}</small>
              {[1, 2, 3, 4, 5].map((k) => <i key={k} className={k <= shown.level ? 'on' : ''} />)}
            </div>
            <p>{shown.desc[lang]}</p>
            <button type="button" onClick={close}>{t('cw_again')}</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

useGLTF.preload(MACHINE_URL)

useLoader.preload(THREE.ImageLoader, SPOTS.map((s) => s.src)) // sticker art, fetched with the chunk
if (typeof window !== 'undefined') warmStickers(SPOTS) // …and the stickers themselves baked in idle time
