// node scripts/compress-model.mjs <in.glb> <out.glb> [ratio=0.35] [texSize=1024] [quality=82] [lift=1]
// lift > 1 brightens the base colour textures (sharp modulate) — for dark models on the pastel site; sat (7th arg) scales saturation
// Strips normal / metallic-roughness / occlusion / emissive maps (the site renders these props unlit),
// simplifies with meshoptimizer, quantizes + draco-compresses, resizes textures and encodes them as webp.
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { simplify, weld, dedup, prune, textureCompress, draco, resample } from '@gltf-transform/functions'
import { MeshoptSimplifier } from 'meshoptimizer'
import draco3d from 'draco3dgltf'
import sharp from 'sharp'

const [, , inp, out, ratioArg = '0.35', sizeArg = '1024', qArg = '82', liftArg = '1', satArg = '1'] = process.argv
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'draco3d.encoder': await draco3d.createEncoderModule(),
})
await MeshoptSimplifier.ready
const doc = await io.read(inp)
for (const m of doc.getRoot().listMaterials()) {
  m.setNormalTexture(null); m.setMetallicRoughnessTexture(null); m.setOcclusionTexture(null); m.setEmissiveTexture(null)
}
if (Number(liftArg) !== 1 || Number(satArg) !== 1) {
  for (const t of doc.getRoot().listTextures()) {
    const img = t.getImage(); if (!img) continue
    const buf = await sharp(Buffer.from(img)).modulate({ brightness: Number(liftArg), saturation: Number(satArg) }).png().toBuffer()
    t.setImage(new Uint8Array(buf)).setMimeType('image/png')
  }
}
await doc.transform(
  dedup(), prune(), weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: Number(ratioArg), error: 0.01, lockBorder: false }),
  resample(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [Number(sizeArg), Number(sizeArg)], quality: Number(qArg) }),
  draco(),
)
await io.write(out, doc)
const prims = doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives())
const tris = prims.reduce((n, p) => n + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0)
console.log(`${out}: ${Math.round(tris)} tris, textures: ${doc.getRoot().listTextures().map((t) => t.getMimeType()).join(', ')}`)
