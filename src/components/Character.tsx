import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing'
import { Kuwahara } from './Kuwahara'
import { useOutline } from './Outline'
import * as THREE from 'three'
import type { MotionValue } from 'framer-motion'
import { usePainterly } from './PainterlyMaterial'

const URL = '/models/character.glb'
const WORD_URL = '/models/portfolio.glb'
const caOffset = new THREE.Vector2(0.0008, 0.0008)
const flags = new URLSearchParams(window.location.search)
const NO_FX = flags.has('nofx')
const NO_OUTLINE = flags.has('nooutline')
const NO_KUWA = flags.has('nokuwa')

type Props = {
  scroll: MotionValue<number> // 0..1 progress of the hero leaving the viewport
  spin: React.MutableRefObject<number> // extra turns requested by clicks (radians)
}

export function CharacterModel({ scroll, spin }: Props) {
  const { scene } = useGLTF(URL)
  usePainterly(scene, { keyDir: [1.4, 1.5, 1.2], bands: 3, paint: 0.1, patch: 0.1, patchScale: 22, spec: 0.12, rimStrength: 0.45, keyColor: '#f6e2c6' })
  useOutline(scene, NO_OUTLINE ? 0 : 0.0024, '#120d12')
  const ref = useRef<THREE.Group>(null)
  const rotY = useRef(-0.35)

  useFrame((state, dt) => {
    if (!ref.current) return
    // target: base pose + scroll-driven turn + click spins + a tiny mouse parallax
    const target = -0.35 + scroll.get() * 1.4 + spin.current + state.pointer.x * 0.08
    rotY.current = THREE.MathUtils.damp(rotY.current, target, 1.7, dt)
    ref.current.rotation.y = rotY.current
    // slow breathing
    ref.current.position.y = -0.55 + Math.sin(state.clock.elapsedTime * 0.9) * 0.012
    // hero slides the model down slightly as you scroll away
    ref.current.position.y -= scroll.get() * 0.35
    // push her to the right on wide screens; keep centered on narrow ones
    const aspect = state.size.width / state.size.height
    ref.current.position.x = Math.max(0, aspect - 0.7) * 0.65
  })

  return (
    <group ref={ref} position={[0, -0.55, 0]} scale={1.4}>
      <primitive object={scene} />
    </group>
  )
}

/** The 3D "PORTFOLIO" word, sitting behind the character, sized to the viewport. */
export function PortfolioWord({ scroll }: { scroll: MotionValue<number> }) {
  const { scene } = useGLTF(WORD_URL)
  usePainterly(scene, { keyDir: [1.4, 1.5, 1.2], bands: 4, paint: 0.08, patch: 0.06, patchScale: 8, spec: 0.5, rimStrength: 0.6 })
  useOutline(scene, NO_OUTLINE ? 0 : 0.0022, '#120d12')
  const ref = useRef<THREE.Group>(null)
  const Z = -0.45

  useFrame((state, dt) => {
    if (!ref.current) return
    const cam = state.camera as THREE.PerspectiveCamera
    const dist = cam.position.z - Z
    const halfH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * dist
    const aspect = state.size.width / state.size.height
    const halfW = halfH * aspect
    const wide = aspect >= 1
    // wide: the word spans ~62% of the screen width with a 6% left margin (model is 1.9 units wide);
    // narrow/mobile: nearly full width, centred above the character
    const s = ((wide ? 1.45 : 1.7) * halfW) / 1.9
    const x = wide ? -halfW + 0.08 * halfW + 0.95 * s : 0
    ref.current.scale.setScalar(THREE.MathUtils.damp(ref.current.scale.x, s, 6, dt) || s)
    ref.current.position.x = x
    ref.current.position.y = (wide ? 0.3 : 0.78) + scroll.get() * 0.6
    ref.current.position.z = Z
    // the word stays still (only the character moves)
    ref.current.rotation.set(0, 0, 0)
  })

  return (
    <group ref={ref}>
      <primitive object={scene} />
    </group>
  )
}

export default function CharacterStage(props: Props) {
  return (
    <>
      <PortfolioWord scroll={props.scroll} />
      <CharacterModel {...props} />
      {!NO_FX && (
        <EffectComposer multisampling={0}>
          {NO_KUWA ? <></> : <Kuwahara radius={2} />}
          <Bloom intensity={0.25} luminanceThreshold={0.85} luminanceSmoothing={0.3} mipmapBlur />
          <ChromaticAberration offset={caOffset} radialModulation modulationOffset={0.4} />
        </EffectComposer>
      )}
    </>
  )
}

useGLTF.preload(URL)
useGLTF.preload(WORD_URL)
