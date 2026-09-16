import { useEffect, useMemo, useState } from 'react'
import { ThreeEvent } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { SelectFn } from './DeskScene'

/**
 * The monitor screen: a plane sitting on the monitor face showing the site's key photo,
 * so the tower/plants occlude it and it gets the same post-processing as the desk.
 *
 * Geometry (fitted from the mesh): the screen is a flat quad facing +z,
 * x -0.635..0.455, y -0.20..0.38 (centre [-0.09, 0.09], 1.09 × 0.58 units), surface at z ≈ -0.206.
 */
const W = 1.09
const H = 0.58
const IMAGE = '/wipe.jpg'

export default function ScreenPreview({ onSelect }: { onSelect: SelectFn }) {
  const texture = useTexture(IMAGE)
  const [hover, setHover] = useState(false)

  const map = useMemo(() => {
    const t = texture.clone()
    t.colorSpace = THREE.SRGBColorSpace
    // "object-fit: cover": crop whichever axis overflows the screen's aspect
    const img = t.image as { width: number; height: number }
    const screenAspect = W / H
    const imgAspect = img.width / img.height
    if (imgAspect > screenAspect) {
      t.repeat.set(screenAspect / imgAspect, 1)
      t.offset.set((1 - screenAspect / imgAspect) / 2, 0)
    } else {
      t.repeat.set(1, imgAspect / screenAspect)
      t.offset.set(0, (1 - imgAspect / screenAspect) / 2)
    }
    t.needsUpdate = true
    return t
  }, [texture])
  useEffect(() => () => map.dispose(), [map])

  useEffect(() => {
    document.body.style.cursor = hover ? 'pointer' : ''
    return () => { document.body.style.cursor = '' }
  }, [hover])

  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onSelect('projects', { x: e.clientX, y: e.clientY })
  }

  return (
    <mesh position={[-0.09, 0.09, -0.199]} onClick={click} onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)}>
      <planeGeometry args={[W, H]} />
      <meshBasicMaterial map={map} toneMapped={false} color={hover ? '#ffffff' : '#d8d8d8'} />
    </mesh>
  )
}

useTexture.preload(IMAGE)
