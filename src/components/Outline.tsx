import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

/**
 * Ink outline via inverted hull ("solidify" trick from Blender): a back-facing
 * copy of every mesh, pushed out along its normals by a screen-constant width.
 */
const vertex = /* glsl */ `
  uniform float width;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normal);
    mv.xyz += n * width * max(-mv.z, 0.6);
    gl_Position = projectionMatrix * mv;
  }
`
const fragment = /* glsl */ `
  uniform vec3 color;
  void main() {
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`

export function useOutline(object: THREE.Object3D, width = 0.0035, color = '#130e12') {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: { width: { value: width }, color: { value: new THREE.Color(color) } },
        side: THREE.BackSide,
        depthWrite: true,
      }),
    [width, color],
  )

  useEffect(() => {
    const hulls: THREE.Mesh[] = []
    object.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh || mesh.userData.isHull) return
      const hull = new THREE.Mesh(mesh.geometry, mat)
      hull.userData.isHull = true
      hull.renderOrder = -1
      hulls.push(hull)
    })
    // add as children so they follow the original transforms
    hulls.forEach((h) => {
      const parentMesh = object.getObjectByProperty('geometry', h.geometry) as THREE.Mesh | undefined
      parentMesh?.add(h)
    })
    return () => hulls.forEach((h) => h.parent?.remove(h))
  }, [object, mat])
}
