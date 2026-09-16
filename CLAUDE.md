# Portfolio 3D — Ana Julia Yaguti Matilha

Site de portfólio premium em 3D. Responder à Ana em português (PT-BR). Ela dirige o visual por esboços e prints e itera em passos pequenos; perguntar bastante antes de assumir.

## Stack
Vite + React 18 + TypeScript, @react-three/fiber, @react-three/drei, @react-three/postprocessing, framer-motion, react-router-dom.

```bash
npm install
npx vite          # http://localhost:5175 (porta fixa; 5173/5174 são de outros projetos)
npx tsc --noEmit  # type-check
```

## Direção visual (decidida pela Ana, não reabrir)
- Escuro editorial: fundo `#0c0d12`, texto creme `#f3eee4`, acento sage `#a6c69a` + teal profundo `#3f6b6a` (tirados da foto de flores/vidro molhado usada na transição). **Vermelho não faz parte da paleta** — a versão vermelha e a primeira pastel foram rejeitadas.
- Fonte Instrument Serif itálica para títulos/rótulos, Inter para textos pequenos. O nome completo no hero é renderizado pixelado via canvas (`PixelText.tsx`), fonte reta.
- Modelos 3D com shader "pintado" (`PainterlyMaterial.ts`: faixas de luz quantizadas, luz quente + fill frio, rim teal claro, normais perturbadas por Voronoi) + contorno tipo solidify (`Outline.tsx`) + filtro Kuwahara (`Kuwahara.tsx`) + Bloom. Personagem e mesa usam os mesmos parâmetros (bands 3, patch 0.1, Kuwahara raio 2); só a palavra "PORTFOLIO" tem spec/rim mais fortes.
- **Nada é arrastável.** Modelos reagem a scroll e clique (clique no hero = uma volta da personagem).

## Estrutura
- `src/components/Hero.tsx` + `Character.tsx`: hero com a palavra "PORTFOLIO" em 3D (`public/models/portfolio.glb`, parada) atrás da personagem (`character.glb`, torso para cima, deslocada à direita em telas largas).
- `src/components/DeskScene.tsx`: mesa 3D (`desk.glb`) em seção sticky; câmera orbita com o scroll. Hotspots por coordenada:
  monitor = Projetos (com `ScreenPreview.tsx`: a tela é um plano na face do monitor com a foto `public/wipe.jpg` como textura em modo "cover" — assim torre/plantas a ocluem de verdade e ela recebe o mesmo pós-processamento; **não** usar `drei/Html` para isso, HTML fica sempre por cima do 3D), livros = Sobre, teclado = Contato, torre do PC = Skills, controle = Jogos.
- `src/components/Transition.tsx`: transição de página (câmera mergulha no objeto + cortina circular a partir do clique com a foto `public/wipe.jpg` + revelação).
- `src/pages/*`: páginas reais nas rotas `/projetos /sobre /contato /skills /jogos`. Todo o conteúdo (ainda de exemplo) está em `src/pages/content.ts` em PT e EN.
- `src/components/SkillLogos.tsx` (página Skills): logos das ferramentas (`tools` em `content.ts`) extrudados em 3D a partir de caminhos SVG (`logoPaths.ts` — cinco vêm do simple-icons, CC0; Azure, Java, SQL, Canva, Procreate e Nomad Sculpt são marcas simplificadas desenhadas à mão, trocáveis). Diferente do resto do site, os logos **não** usam o shader pintado: são "inflados" (bevel fundo + normais suavizadas) com `MeshPhysicalMaterial` brilhante (clearcoat + sheen azulado), iluminados por `Environment` com `Lightformer`s gerados na cena — referência: tipografia clay/gummy brilhante. Sem Kuwahara neste canvas (borraria os reflexos). O modo `sketch` do `makeOutlineMaterial` continua disponível, mas não é usado aqui. Hover: zoom + nome. Clique: o logo vem ao centro, os outros saem voando e um HUD 2D (`Hud`, SVG dentro de `drei/Html`) desenha linhas saindo dele com Domínio, Área e descrição; abaixo de 1000px o HUD empilha na vertical. Sem GLB por logo (peso). O `.panel` não é mais usado aqui.
- `src/components/GameWorld.tsx` + `Arcade.tsx` (página Jogos): **fliperama numa cobertura à noite** (referência: sala de pé-direito alto com janelas de vidro do chão ao teto em esquadria de ferro sobre a cidade iluminada). Sala com **materiais padrão e luzes reais** (não o shader pintado — em paredes lisas ele parece camuflagem): piso fosco simples (`MeshStandardMaterial` escuro — o piso espelhado e o tapete de luz negra com confetes foram rejeitados pela Ana em 2026-09-16), parede-janela de vidro com grade de aço, abajures de latão com `pointLight` quente entre as máquinas, luz fria da cidade entrando. Fundo = `public/models/city.glb` (Sketchfab low-poly, 1,35 MB): o globo do céu do asset é usado uma vez, gigante; os prédios são clonados em 3 fileiras com névoa e janelas com emissão forçada; chão do diorama descartado. **Armadilha**: o `GLTFLoader` remove pontos dos nomes dos nós (`Sphere_Material.010_0` → `Sphere_Material010_0`) — comparar por prefixo. Decoração de fliperama: trilho de neon teal e rodapé lilás, letreiro neon "ARCADE" (HTML com glow/flicker), varal de lâmpadas, pinball e máquina de refrigerante nas pontas; tudo baixado para y ≤ 8 porque a câmera lateral não vê acima disso. Uma máquina de arcade por item de `games` (corpo escuro, laterais na cor do jogo, manete/botões, tela emissiva, letreiro emissivo, `pointLight` colorida própria que acende ao aproximar). A personagem da Ana (`public/models/player.glb`, ~790 KB, Meshy rigada no Mixamo, clipes `Idle`/`Walk`) usa **exatamente o shader do hero** (`usePainterly` com os mesmos parâmetros + contorno 0.0024) — decisão da Ana; um shader próprio de personagem foi tentado e descartado. Kuwahara raio 1 + Bloom neste canvas. Ela anda só no eixo X (A/D ou setas) em frente às máquinas; câmera lateral fixa em altura/profundidade seguindo em X. Parar em frente acende a tela ("Inserir ficha"); E ou clique na tela abre: câmera se inclina para a tela e o painel `.world-detail` mostra o jogo com Jogar. Teclado só é capturado depois de clicar no palco (Esc solta). Histórico: tabuleiro com projeções e jardim etéreo (com malha de ondas do Sketchfab) foram construídos e descartados em 2026-09-15 — a Ana não gostou do conceito.
- `src/i18n.tsx`: toggle PT/EN.

## Modelos
Os GLB em `public/models/` já estão otimizados (Draco + WebP via `@gltf-transform/cli`). Os originais da Ana ficam fora do repo (Downloads/Documents). Para um modelo novo: `npx @gltf-transform/cli optimize in.glb out.glb --compress draco --texture-compress webp --texture-size 2048` (adicionar `--simplify true --simplify-ratio 0.05` se tiver milhões de triângulos).

Personagem animado (`player.glb`): fonte = GLB texturizado do Meshy + FBX do Mixamo **com skin** (Walking) + FBX de animação (Idle). Sem Blender na máquina, a junção foi feita no browser com os loaders do three (`FBXLoader` → aplicar `map` do Meshy à SkinnedMesh **com `map.flipY = true`**, porque UVs de FBX usam a convenção invertida em relação a texturas de GLB — sem isso a textura sai embaralhada → `GLTFExporter` com `animations: [Walk, Idle]`), depois `gltf-transform optimize --compress draco --texture-compress webp --texture-size 1024 --simplify false --join false --flatten false` (não simplificar/juntar malhas com skin). Novos clipes do Mixamo: baixar "Without Skin" e repetir a exportação incluindo o clipe.

## Armadilhas conhecidas
- `patch` é palavra reservada em GLSL; não usar como nome de uniform.
- A tela do monitor foi medida por mapa de profundidade da malha: x -0.635..0.455, y -0.20..0.38, z ≈ -0.206. Em `Html transform`, 1 px = distanceFactor/400 unidades.
- O `launch.json` do app desktop falha com espaço em "Program Files"; rodar `npx vite` manualmente e usar um `launch.json` só com `url`.
- Deploy previsto na Vercel (`vercel.json` já tem o rewrite de SPA).
