// Ana's mailbox (Meshy "Vintage Brass Mailbox") → public/models/mailbox.glb
// Keeps colour, normal and metal/roughness (the relief lives in the normal map), textures to 1024 webp, draco geometry.
// node scripts/prep-mailbox.mjs <in.glb> <out.glb>
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, prune, weld, draco, textureCompress } from '@gltf-transform/functions'
import draco3d from 'draco3dgltf'
import sharp from 'sharp'
const [inp, out] = process.argv.slice(2)
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule(),
})
const doc = await io.read(inp)
await doc.transform(dedup(), prune(), weld(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 88 }), draco())
await io.write(out, doc)
console.log('wrote', out)
