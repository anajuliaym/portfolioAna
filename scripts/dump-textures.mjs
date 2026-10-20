// dump every texture of a glTF/GLB and which materials use it (dev helper)
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import draco3d from 'draco3dgltf'
import fs from 'node:fs'
import path from 'node:path'
const [inp, outDir] = process.argv.slice(2)
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule() })
const doc = await io.read(inp)
fs.mkdirSync(outDir, { recursive: true })
doc.getRoot().listTextures().forEach((t, i) => {
  const users = doc.getRoot().listMaterials().filter((m) => [m.getBaseColorTexture(), m.getNormalTexture(), m.getMetallicRoughnessTexture(), m.getEmissiveTexture(), m.getOcclusionTexture()].includes(t)).map((m) => m.getName())
  const ext = t.getMimeType() === 'image/png' ? 'png' : 'jpg'
  fs.writeFileSync(path.join(outDir, `tex${i}.${ext}`), t.getImage())
  console.log(i, t.getSize(), users.join(','))
})
doc.getRoot().listMaterials().forEach((m) => console.log(m.getName(), 'base', m.getBaseColorTexture() ? doc.getRoot().listTextures().indexOf(m.getBaseColorTexture()) : '-', 'normal', m.getNormalTexture() ? doc.getRoot().listTextures().indexOf(m.getNormalTexture()) : '-', 'mr', m.getMetallicRoughnessTexture() ? doc.getRoot().listTextures().indexOf(m.getMetallicRoughnessTexture()) : '-', 'factor', m.getBaseColorFactor().map((v) => +v.toFixed(2))))
