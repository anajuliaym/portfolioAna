import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

export const LILIES_URL = '/models/lilies.glb'
useGLTF.preload(LILIES_URL)
/**
 * A GLB prop normalised at runtime: unlit with its own textures (untextured parts keep their colour),
 * no outline, measured with a Box3 so `height` is its world height, centred on x/z with its base at y 0.
 * Used for Ana's lilies (lilies.glb — Sketchfab bouquet with huge transforms: translation ~10 500, scale ~700).
 * `tint` recolours the petals only (where red clearly beats green — the leaves and stems stay green), keeping the
 * texture's own shading: white, peach, lilac lilies from the one pink bouquet (Contact's planter, 2026-10-20).
 */
export default function GlbProp({ url, x, z, top, height, rotation = [0, 0, 0], flat = false, tint }: { url: string; x: number; z: number; top: number; height: number; rotation?: [number, number, number]; flat?: boolean; tint?: string }) {
  const { scene } = useGLTF(url)
  const { root, scale, offset } = useMemo(() => {
    const r = scene.clone(true)
    r.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh || m.userData.isHull) return
      const src = m.material as THREE.MeshStandardMaterial
      if (m.userData.origMap === undefined) m.userData.origMap = src.map ?? null
      const mat = new THREE.MeshBasicMaterial({ map: m.userData.origMap as THREE.Texture | null, color: src.color ?? '#ffffff', side: THREE.DoubleSide, toneMapped: false })
      if (tint) {
        mat.onBeforeCompile = (sh) => {
          sh.uniforms.uTint = { value: new THREE.Color(tint) }
          sh.fragmentShader = sh.fragmentShader
            .replace('#include <common>', '#include <common>\nuniform vec3 uTint;')
            .replace('#include <map_fragment>', `#include <map_fragment>
  vec3 gpC = diffuseColor.rgb;
  float gpPetal = smoothstep(0.06, 0.22, gpC.r - gpC.g);
  float gpLum = dot(gpC, vec3(0.299, 0.587, 0.114));
  diffuseColor.rgb = mix(gpC, uTint * (0.42 + gpLum * 0.95), gpPetal);`)
        }
        mat.customProgramCacheKey = () => 'lily-tint'
      }
      m.material = mat
    })
    // pose first (so a bouquet laid flat is measured flat), then measure
    const posed = new THREE.Group(); posed.add(r); posed.rotation.set(...rotation); posed.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(posed)
    const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3())
    const sc = height / (flat ? Math.max(size.x, size.z) : size.y)
    posed.remove(r)
    return { root: r, scale: sc, offset: [-c.x, -box.min.y, -c.z] as [number, number, number] }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, height, flat, tint, rotation[0], rotation[1], rotation[2]])
  return (
    <group position={[x, top, z]} scale={scale}>
      <group position={offset} rotation={rotation}>
        <primitive object={root} />
      </group>
    </group>
  )
}
