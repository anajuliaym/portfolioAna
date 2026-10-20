import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import draco3d from 'draco3dgltf'
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule() })
const doc = await io.read(process.argv[2])
const root = doc.getRoot()
const walk = (n, d = 0) => {
  const m = n.getMesh()
  const t = n.getTranslation().map((v) => +v.toFixed(3)), s = n.getScale().map((v) => +v.toFixed(3)), r = n.getRotation().map((v) => +v.toFixed(3))
  let info = ''
  if (m) {
    const prims = m.listPrimitives()
    const tris = prims.reduce((a, p) => a + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0)
    const mats = prims.map((p) => p.getMaterial()?.getName()).join(',')
    const pos = prims[0].getAttribute('POSITION'); const mn = pos.getMin([]).map((v) => +v.toFixed(2)), mx = pos.getMax([]).map((v) => +v.toFixed(2))
    info = ` mesh=${m.getName()} tris=${tris} mats=[${mats}] bbox=${JSON.stringify(mn)}..${JSON.stringify(mx)}`
  }
  console.log(`${'  '.repeat(d)}- ${n.getName()} t=${JSON.stringify(t)} r=${JSON.stringify(r)} s=${JSON.stringify(s)}${info}`)
  n.listChildren().forEach((c) => walk(c, d + 1))
}
root.listScenes().forEach((sc) => sc.listChildren().forEach((n) => walk(n)))
console.log('materials:', root.listMaterials().map((m) => `${m.getName()}(${m.getBaseColorTexture() ? 'tex' : m.getBaseColorFactor().map((v) => v.toFixed(2)).join(',')}${m.getAlphaMode() !== 'OPAQUE' ? ' ' + m.getAlphaMode() : ''})`).join(' | '))
console.log('textures:', root.listTextures().map((t) => `${t.getName() || t.getURI()} ${t.getSize()?.join('x')} ${t.getMimeType()}`).join(' | '))
console.log('animations:', root.listAnimations().map((a) => a.getName()).join(', ') || 'none')
