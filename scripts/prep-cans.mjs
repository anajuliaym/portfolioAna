// "Cel Shaded Soda Cans" (bicho.salem, Sketchfab, CC BY 4.0) → public/models/can.glb
// The four cans share one geometry; keeps a single can at the origin (base on y 0, 1.867 tall), its painted atlas as the
// base colour (the cel look is painted into it, the model is shown unlit), textures to 1024 webp, draco geometry.
// node scripts/prep-cans.mjs <in.glb> <out.glb>
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, prune, draco, textureCompress } from '@gltf-transform/functions'
import draco3d from 'draco3dgltf'
import sharp from 'sharp'
const [inp, out] = process.argv.slice(2)
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule(),
})
const doc = await io.read(inp)
const root = doc.getRoot()
const keep = root.listNodes().find((n) => n.getName().startsWith('CherryCan'))
for (const n of root.listNodes()) if (n.getName().endsWith('Can_1') || n.getName().endsWith('Can_3') || n.getName().endsWith('Can_4')) n.dispose()
keep.setTranslation([0, 0, 0]).setRotation([0, 0, 0, 1])
for (const m of root.listMaterials()) {
  const sg = m.getExtension('KHR_materials_pbrSpecularGlossiness')
  const tex = sg?.getDiffuseTexture() ?? m.getEmissiveTexture()
  if (sg) m.setExtension('KHR_materials_pbrSpecularGlossiness', null)
  m.setBaseColorTexture(tex).setEmissiveTexture(null).setMetallicFactor(0).setRoughnessFactor(1)
}
for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) p.setAttribute('TEXCOORD_1', null)
for (const e of root.listExtensionsUsed()) if (e.extensionName === 'KHR_materials_pbrSpecularGlossiness') e.dispose()
await doc.transform(prune(), dedup(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 90 }), draco())
await io.write(out, doc)
console.log('wrote', out)
