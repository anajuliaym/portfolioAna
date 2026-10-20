// claw_machine_with_textures.glb (Sketchfab) → public/models/claw.glb for the Skills page (2026-10-20):
// drops the four plush stars (Ana's logos fill the pit instead) and every texture (the atlas carries third-party
// characters and a "STAR CATCHER" sign; the site recolours each part itself), keeps every node separate so the
// claw, carriage and joystick can be animated, then draco-compresses.
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { prune, dedup, draco } from '@gltf-transform/functions'
import draco3d from 'draco3dgltf'
const [inp, out] = process.argv.slice(2)
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule(),
})
const doc = await io.read(inp)
const root = doc.getRoot()
for (const n of root.listNodes()) if (/^(blue|green|pink|yellow)_low$/.test(n.getName())) n.dispose()
for (const m of root.listMaterials()) { m.setBaseColorTexture(null); m.setNormalTexture(null); m.setMetallicRoughnessTexture(null); m.setOcclusionTexture(null); m.setEmissiveTexture(null) }
await doc.transform(prune(), dedup(), draco())
// world-space bounding boxes per mesh node, to place things in the scene
const wb = []
for (const n of root.listNodes()) {
  const m = n.getMesh(); if (!m) continue
  const M = n.getWorldMatrix()
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]
  for (const p of m.listPrimitives()) {
    const a = p.getAttribute('POSITION'); const v = [0, 0, 0]
    for (let i = 0; i < a.getCount(); i++) {
      a.getElement(i, v)
      const x = M[0] * v[0] + M[4] * v[1] + M[8] * v[2] + M[12], y = M[1] * v[0] + M[5] * v[1] + M[9] * v[2] + M[13], z = M[2] * v[0] + M[6] * v[1] + M[10] * v[2] + M[14]
      mn[0] = Math.min(mn[0], x); mn[1] = Math.min(mn[1], y); mn[2] = Math.min(mn[2], z); mx[0] = Math.max(mx[0], x); mx[1] = Math.max(mx[1], y); mx[2] = Math.max(mx[2], z)
    }
  }
  wb.push(`${n.getName().padEnd(30)} min ${mn.map((v) => v.toFixed(1)).join(',')}  max ${mx.map((v) => v.toFixed(1)).join(',')}`)
}
console.log(wb.join('\n'))
await io.write(out, doc)
