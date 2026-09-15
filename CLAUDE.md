# Portfolio 3D — Ana Julia Yaguti Matilha

Site de portfólio premium em 3D. Responder à Ana em português (PT-BR). Ela dirige o visual por esboços e prints e itera em passos pequenos; perguntar bastante antes de assumir.

## Stack
Vite + React 18 + TypeScript, @react-three/fiber, @react-three/drei, @react-three/postprocessing, framer-motion, react-router-dom.

```bash
npm install
npx vite          # http://localhost:5173
npx tsc --noEmit  # type-check
```

## Direção visual (decidida pela Ana, não reabrir)
- Escuro editorial: fundo `#0c0d12`, texto creme `#f3eee4`, acento vermelho `#ff3b2f`. A primeira versão pastel foi rejeitada.
- Fonte Instrument Serif itálica para títulos/rótulos, Inter para textos pequenos. O nome completo no hero é renderizado pixelado via canvas (`PixelText.tsx`), fonte reta.
- Modelos 3D com shader "pintado" (`PainterlyMaterial.ts`: faixas de luz quantizadas, luz quente + fill frio, rim vermelho, normais perturbadas por Voronoi) + contorno tipo solidify (`Outline.tsx`) + filtro Kuwahara (`Kuwahara.tsx`) + Bloom. Efeito mais leve na personagem, mais forte na mesa.
- **Nada é arrastável.** Modelos reagem a scroll e clique (clique no hero = uma volta da personagem).

## Estrutura
- `src/components/Hero.tsx` + `Character.tsx`: hero com a palavra "PORTFOLIO" em 3D (`public/models/portfolio.glb`, parada) atrás da personagem (`character.glb`, torso para cima, deslocada à direita em telas largas).
- `src/components/DeskScene.tsx`: mesa 3D (`desk.glb`) em seção sticky; câmera orbita com o scroll. Hotspots por coordenada:
  monitor = Projetos (com `ScreenPreview.tsx`, tela HTML colada na face do monitor), livros = Sobre, teclado = Contato, torre do PC = Skills, controle = Jogos.
- `src/components/Transition.tsx`: transição de página (câmera mergulha no objeto + cortina vermelha circular a partir do clique + revelação).
- `src/pages/*`: páginas reais nas rotas `/projetos /sobre /contato /skills /jogos`. Todo o conteúdo (ainda de exemplo) está em `src/pages/content.ts` em PT e EN.
- `src/i18n.tsx`: toggle PT/EN.

## Modelos
Os GLB em `public/models/` já estão otimizados (Draco + WebP via `@gltf-transform/cli`). Os originais da Ana ficam fora do repo (Downloads/Documents). Para um modelo novo: `npx @gltf-transform/cli optimize in.glb out.glb --compress draco --texture-compress webp --texture-size 2048` (adicionar `--simplify true --simplify-ratio 0.05` se tiver milhões de triângulos).

## Armadilhas conhecidas
- `patch` é palavra reservada em GLSL; não usar como nome de uniform.
- A tela do monitor foi medida por mapa de profundidade da malha: x -0.635..0.455, y -0.20..0.38, z ≈ -0.206. Em `Html transform`, 1 px = distanceFactor/400 unidades.
- O `launch.json` do app desktop falha com espaço em "Program Files"; rodar `npx vite` manualmente e usar um `launch.json` só com `url`.
- Deploy previsto na Vercel (`vercel.json` já tem o rewrite de SPA).
