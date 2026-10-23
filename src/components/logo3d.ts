import * as THREE from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { LOGOS, type LogoLayer } from './logoPaths'

/**
 * The skill logos as 3D badges for the claw machine: each 24×24 SVG path (logoPaths.ts) extruded into a 1-unit-wide
 * "inflated" badge, deep rounded bevels plus smoothed normals for the pillowy clay look (SVG y points down, so it is
 * flipped), and a glossy clearcoat material. Layered logos carry their colours as vertex colours.
 */
const BASE: THREE.ExtrudeGeometryOptions = { depth: 3, bevelEnabled: true, bevelThickness: 1.8, bevelSize: 1.1, bevelSegments: 8, curveSegments: 10 }
// raised parts: a thinner bevel, or it would close the gaps (Canva's lettering, the channel between Nomad's dunes)
const RAISED: THREE.ExtrudeGeometryOptions = { depth: 1, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.3, bevelSegments: 5, curveSegments: 10 }

function pathShapes(d: string, fillRule: string, inner = false) {
  const svg = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${d}" fill-rule="${fillRule}"/></svg>`)
  return svg.paths.flatMap((p) => {
    if (!inner) return SVGLoader.createShapes(p)
    // without its outer outline, the path's cut-outs (with their own counters, by even-odd) become the solid
    const sp = new THREE.ShapePath() as THREE.ShapePath & { userData?: object }
    sp.subPaths = p.subPaths.slice(1)
    sp.userData = { style: { fillRule: 'evenodd' } }
    return SVGLoader.createShapes(sp)
  })
}

/** one coloured layer, in 24-box coordinates (y down), with vertex colours along its gradient */
function layerGeometry(l: LogoLayer) {
  const raise = l.raise ?? 0
  const g = new THREE.ExtrudeGeometry(pathShapes(l.d, l.fillRule ?? 'nonzero', l.inner), raise > 0 ? RAISED : BASE)
  g.deleteAttribute('normal'); g.deleteAttribute('uv')
  // the base's front face is at z −1.8 (it turns to face the camera with the flip below); a raised part's front
  // stands `raise` in front of it, its back sunk into the base
  if (raise > 0) g.translate(0, 0, -(1.2 + raise))
  const stops = l.colors.map((c) => new THREE.Color(c))
  const [fx, fy] = l.from ?? [0, 0], [tx, ty] = l.to ?? [24, 24]
  const dx = tx - fx, dy = ty - fy, len2 = dx * dx + dy * dy || 1
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const t = THREE.MathUtils.clamp(((pos.getX(i) - fx) * dx + (pos.getY(i) - fy) * dy) / len2, 0, 1) * (stops.length - 1)
    const k = Math.min(stops.length - 2, Math.floor(t))
    if (stops.length === 1) c.copy(stops[0]); else c.copy(stops[k]).lerp(stops[k + 1], t - k)
    col.set([c.r, c.g, c.b], i * 3)
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  return g
}

export function logoGeometry(id: string) {
  const logo = LOGOS[id]
  let raw: THREE.BufferGeometry
  if (logo.layers) {
    const parts = logo.layers.map(layerGeometry)
    raw = mergeGeometries(parts)!
    parts.forEach((p) => p.dispose())
  } else {
    // no negative bevelOffset: shrinking thin strokes makes the bevel self-intersect and tear
    raw = new THREE.ExtrudeGeometry(pathShapes(logo.d!, logo.fillRule ?? 'nonzero'), BASE)
    raw.deleteAttribute('normal')
    raw.deleteAttribute('uv')
  }
  // flip with a rotation, not a negative scale: mirroring would invert the winding and cull the front faces
  const k = (logo.scale ?? 1) / 24
  raw.scale(k, k, k)
  raw.rotateX(Math.PI)
  raw.center()
  const geo = mergeVertices(raw)
  geo.computeVertexNormals()
  raw.dispose()
  return geo
}

/** the glossy clay material of a logo (shared with the claw machine) */
export function logoMaterial(id: string) {
  // layered logos carry their own colours (vertex colours, gradients included)
  if (LOGOS[id].layers) return new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.16, metalness: 0, reflectivity: 1, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.5,
    sheen: 0.2, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ffe9f0'),
  })
  const hsl = { h: 0, s: 0, l: 0 }
  new THREE.Color(LOGOS[id].color).getHSL(hsl)
  const base = new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s * 1.1), Math.min(0.55, hsl.l))
  return new THREE.MeshPhysicalMaterial({
    color: base, roughness: 0.14, metalness: 0, reflectivity: 1, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.7,
    sheen: 0.3, sheenRoughness: 0.5, sheenColor: new THREE.Color('#bcd8ff'),
  })
}
