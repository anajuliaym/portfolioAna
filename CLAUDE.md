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
- **Documento de estética para consultar antes de qualquer decisão visual**: `docs/estetica/index.html` (abre em
  `localhost:5175/docs/estetica/` ou direto no arquivo; imagens em `docs/estetica/img`). Enviado para aprovação em
  2026-10-20 — quando a Ana responder, atualizar o documento e esta seção.
- Escuro editorial: fundo `#0c0d12`, texto creme `#f3eee4`, acento sage `#a6c69a` + teal profundo `#3f6b6a` (tirados da foto de flores/vidro molhado usada na transição). **Vermelho não é a cor principal** do site — a versão vermelha da paleta e a primeira pastel foram rejeitadas; mas vermelho como detalhe é permitido (Ana, 2026-09-18: "vermelho não é proibido, eu só não queria que fosse a cor principal"), ex.: pôsteres e a máquina de bebidas do fliperama.
- Fonte Instrument Serif itálica para títulos/rótulos, Inter para textos pequenos. O nome completo no hero é renderizado pixelado via canvas (`PixelText.tsx`), fonte reta.
- Modelos 3D com shader "pintado" (`PainterlyMaterial.ts`: faixas de luz quantizadas, luz quente + fill frio, rim teal claro, normais perturbadas por Voronoi) + contorno tipo solidify (`Outline.tsx`) + filtro Kuwahara (`Kuwahara.tsx`) + Bloom. Personagem e mesa usam os mesmos parâmetros (bands 3, patch 0.1, Kuwahara raio 2); só a palavra "PORTFOLIO" tem spec/rim mais fortes.
- **Nada é arrastável.** Modelos reagem a scroll e clique (clique no hero = uma volta da personagem).

## Estrutura
- `src/components/Hero.tsx` + `Character.tsx`: hero com a palavra "PORTFOLIO" em 3D (`public/models/portfolio.glb`, parada) atrás da personagem (`character.glb`, torso para cima, deslocada à direita em telas largas).
- `src/components/Badge.tsx` (página **Sobre**, 2026-09-22): o crachá que a Ana desenhou, remontado em HTML por camadas para cada uma se mexer sozinha. **Unidades da folha = pixels do `holder.webp` (527×1055) deslocados por `OX=239`** para caber a corrente de pingentes à esquerda (caixa 766×1055). Camadas, de trás para frente: **cordão = `strap.webp`**, tile 48×96 recortado das 12 primeiras linhas do cordão da própria foto do porta-crachá e empilhado espelhado (a última linha do tile é a linha 0 da foto, então a emenda com o `lanyard.webp` é exata; `background-position: 0 100%`, o elemento termina em y=0), **`lanyard.webp`** (cordão + laço de tecido, recorte x 230–370 / y 0–130 da foto **separado do gancho pela borda curva do laço** — polígono `pts` no script, não por linha reta: cortar reto partia o metal em dois no balanço; o `holder.webp` fica com o gancho inteiro, que gira com o crachá em `CLIP` = 300,120, onde o olho do gancho entra no laço). O laço é desenhado **depois** do `.badge-body` no DOM com `translateZ(30px)` (cordão idem) para ficar na frente do gancho como o laço real; o `.badge-rig` tem `perspective-origin: 70.4% 11.4%` (= o clipe), então o z-offset não desloca a emenda. **A folha (`.badge-scale`) é composta FLAT, só o `.badge-body` tem `preserve-3d`** (2026-09-22, a causa real do "corte" em alguns ângulos): com preserve-3d na folha, os planos do keychain/laço (não inclinados) atravessavam o plano do corpo inclinado e o navegador dividia as camadas na linha de interseção — uma borda reta clara cruzando o plástico onde a corrente passa. Agora corpo, laço e pingentes pintam em ordem de DOM; a `perspective: 1500px` fica na folha com `perspective-origin: 539px 120px` (o clipe, em unidades da folha), e ninguém fora do corpo usa `translateZ`. **Sem `mix-blend-mode` dentro do corpo 3D**: o Chrome achata/recorta elementos com blend mode dentro de `preserve-3d` e em certos ângulos aparecia uma borda reta clara cortando o plástico. O blend foi **assado nas texturas** (exato para cinza): `plastic.webp` = branco com alpha = luminância × 0,85 (≡ screen), `paper.webp` = quase-preto com alpha = (1 − luminância) × 0,5 (≡ multiply); o brilho é um radial branco normal (0,3) mascarado. **Papel, plástico e brilho ficam no mesmo plano do holder (sem `translateZ`)**: qualquer z-offset neles fazia as bordas/realces deslizarem sobre o plástico quando o crachá inclina com o mouse ("em alguns ângulos trava", Ana 2026-09-22); só foto/cargo/assinatura (9px) e pingentes (26px) têm profundidade. O `plastic.webp` tem as bordas esmaecidas em 46 px (senão a borda reta do retângulo aparece sobre o topo do plástico) e o brilho `.badge-sheen` cobre exatamente o holder com `mask-image: url(holder.webp)` (senão o gradiente aparecia como um retângulo claro fora da silhueta), `holder.webp` (porta-crachá **com o cartão creme já impresso**, imagem recortada que a Ana mandou), `paper.webp` (papel amassado em multiply sobre a caixa do cartão, x 66–488 / y 344–1006), `photo.webp` (foto + adesivos + nome, **uma imagem só** da Ana, 380 de largura em 87,400), `role.webp` ("Product Designer", 210 em 162,836) e `signature.webp` (assinatura, 180 em 177,872) centrados sob o nome, `plastic.webp` (rugas de plástico em screen), brilho radial (CSS), `charms.webp` (keychain, recorte do export do Figma em `~/Downloads/Nova Pasta Com Itens`; **fica fora do `.badge-body`**, irmão do `lanyard`, porque o gancho em S dele prende no braço esquerdo do anel do clipe (holder x≈260, y≈100) e o anel é estático — `CHARMS = {x: OX-123, y: 55, w: 420, origem 358,7}`, rotação própria = spring atrasado do balanço × 0,9 + sway; posição conferida sobrepondo o render ao composite da Ana). Não reconstruir adesivos/nome/assinatura em camadas separadas: a Ana prefere mandar a arte pronta do interior. Escala `--bs` calculada em JS pela largura da coluna (CSS não divide comprimento em número): desktop até 0,75, mobile até 0,6. Fica na **coluna esquerda** (`.about-cols` .95fr/1.05fr; texto, fatos e timeline à direita). Animações (framer-motion): cai do topo (spring), balança no clipe (spring frouxo iniciando em 26°, pivô `CLIP` = anel do clipe), cordão pivota 1700px acima com fator 0,16, pingentes com spring atrasado (girando pela diferença), balanço ocioso por `useAnimationFrame`, tilt 3D + brilho seguindo o ponteiro, e dá para agarrar e balançar (pointer capture, 0,28°/px, solta → spring). Substituiu o placeholder `.portrait`. A página Sobre **não tem título** (`PageShell` sem `index/title` renderiza só o link de voltar; `.page.about` com padding-top menor): o crachá e o texto começam logo abaixo do "Voltar", pedido da Ana em 2026-09-22. A queda só começa depois de todas as camadas decodificarem (cap 5 s), senão o keychain caía antes do porta-crachá.
- `src/pages/About.tsx` — o texto do Sobre é uma **colagem editorial** (referências da Ana, 2026-09-22: posters de designer com serif display + script + chips, papel pautado com clipe, janela de navegador, tickets, estrelas glitter, fita adesiva; "mais organizado porque é muito texto"). O copy vive em `about.collage` (`content.ts`, tipo `AboutCollage`, PT/EN) já **quebrado em peças curtas**; o layout foi feito para esses tamanhos. Peças, em ordem: `.ab-hero` (frase pequena → lockup "design" serif itálico gigante + "&" em **Instrument Serif itálico** rosa (o & da Pinyon Script é uma ligadura "Et" que parecia um E quebrado; trocado em 2026-09-22) + chip sálvia "TECNOLOGIA"), `.ab-row` com `.ab-note` (papel pautado creme com textura `paper.webp`, clipe em CSS; o texto é **uma frase só** — `note.title` entra inline em serif via `.ab-lead` seguido do `body`, porque como título separado "parecia cortar no meio", Ana 2026-09-22; **sem** a tag à mão — "meu processo favorito ♥" e "mão na massa!" foram removidas a pedido da Ana em 2026-09-23; os campos `tag` continuam no `content.ts` sem uso) e `.ab-win` (janela de navegador: bolinhas, barra de URL "figma → código"), `.ab-mix` (tickets `.ab-ticket` sálvia/rosa com furos por `mask` radial e número serif + lockup "ter liberdade para criar," serif / chip escuro "MAS TAMBÉM SABER CONSTRUIR."), `.ab-sticky` (post-it amarelo-creme com duas fitas `.ab-tape` e o **"e se a gente..." circulado**, o único acento sobrevivente de todas as versões), `.ab-facts` (fatos como pílulas) e `.ab-journey` (timeline como linha pontilhada com bolinhas; vira vertical no mobile). **Fatos em pílulas e a linha "Trajetória" foram removidos** (Ana, 2026-09-22). Depois das duas colunas vem `<Timeline>` (`src/components/Timeline.tsx`), a seção **Experiências**, de propósito FORA do grid para o crachá sticky não acompanhar essa parte. Conteúdo em `about.experiences` (`Experience[]`: period, title, org, desc, tags, more) — dados **reais do LinkedIn da Ana** (2026-09-22): estágio PCA Engenharia de Software (mai 2025—hoje), bolsa CNPq/PIBITI Fragments (set 2025—set 2026), CC Mackenzie (fev 2024—dez 2027), e a Escola Internacional de Alphaville entra **só como Certificado IB** (2021—2023), não como formação — pedido dela. Timeline = **cartões-postais** — 4.ª versão, 2026-09-22, inspirada nas referências de postais vintage da Ana (renda, selo, carimbo, verso escrito à mão). Rejeitadas antes: linha genérica com cards vidro, etiquetas penduradas no cordão, trança design×tecnologia ("horrível"). **Conceito**: de cada lugar por onde passou, um postal — a frente diz onde estava, o verso conta o que fez lá. **Sem texto explicando o conceito**: kicker "Trajetória profissional", título "Experiências", `xpIntro` vazio (a Ana tirou "Postais da trajetória" + intro em 2026-09-22). **Continua sendo uma timeline** (a Ana insistiu): `<ol class=pc-list>` é uma coluna com uma **rota postal** no meio (`.pc-route`, linha tracejada apagada; `.pc-route-fill` rosa cresce com o scroll via `useScroll`+`useSpring`, ponto brilhante na ponta), **ordem cronológica crescente** (IB 2021 → CC 2024 → PCA mai 2025 → CNPq set 2025; a ordem é a do array em `content.ts`), cada parada é um **carimbo postal na rota** (`.pc-mark`: círculos tracejados rosa com mês pequeno + ano em serif, entra "carimbando" com spring) ligado ao card por um tracinho (`.pc-tie`); cards alternam lado (`.pc-item.l/.r`, `grid-template-columns: minmax(0,1fr) ×2` — `minmax(0)` é obrigatório porque as linhas de endereço são `nowrap`), cada card com rotação própria `rot`, cards 3:2 com `perspective` e flip `rotateY` no clique (`backface-visibility`). **Frente**: **as capas de postal da Ana** (`src/assets/postcards/*.webp`, recortadas da folha que ela mandou em 2026-09-22 por flood do fundo: bunny-blue, lily-green (com selo de coração), lily-pink, lily-purple, flowers-blue; campo `cover` do `Experience`; a `Lace` procedural foi removida) como `background-size: cover`, **todos os cards com `aspect-ratio: 725/466`** (o tamanho do coelho) e capa em `background-size: 100% 100%` — as três capas quase quadradas ficam esticadas, foi pedido explícito da Ana; no mobile (altura fixa 440) volta a `cover`, título serif + org em tipo escuro no centro creme, etiquetas brancas tipo fita (período no canto, "virar o postal" embaixo). Atribuição: IB → bunny-blue, CC → lily-purple, PCA → lily-green, CNPq/Fragments → lily-pink (o jogo tem lírio); flowers-blue sobra para uma próxima. **Verso**: papel creme, "Postcard" em Pinyon Script, e o **conteúdo profissional em Inter** — cargo (serif), org · período, descrição, "o que eu fiz" + `design`/`tech` como lista (a Ana: "o postal é só o visual; o texto é da minha experiência profissional" — nada de "Querida Ana"/assinatura), **selo** perfurado (mask radial) com o coração de vidro e o ano que **carimba** com spring 0,45 s depois do flip, **carimbo postal** circular (cidade = último trecho do `org` após ' · ', ano) que aparece em seguida, linhas de endereço com título/org. **Sem adesivos na seção**: a Ana mandou a folha de adesivos aquarela, testamos duas composições (espalhada e em cantos) e ela pediu para tirar e apagar tudo (2026-09-22) — `src/assets/stickers/` foi removida; não reintroduzir. Mobile: rota à esquerda (30px), carimbos menores, 1 coluna com `padding-left: 74px`, `.pc-faces` com `aspect-ratio: auto; height: 440px` (min-height + aspect-ratio transferia para um min-width de 570px e o card estourava a tela), verso empilhado. `mix` do `Experience` ficou sem uso visual. Estrelas `Star` = SVG com filtro `feTurbulence` de brilho (glitter) em sálvia/rosa (a preta/`ink` no post-it foi removida: "estrela estática não tá legal"). **`.about-side` é `position: sticky; top: 0` no desktop**: o crachá acompanha a rolagem da colagem. Tudo entra com `drop(delay, rot)` (spring leve, uma vez). Fontes extras no `index.html`: Nanum Pen Script, Pinyon Script. Histórico rejeitado (não repetir): marca-texto em caixa, wavy, apartes serif maiores, só tipografia, sublinhados SVG à mão, adesivos arrastáveis + notas no hover (Caveat/verde). Assets que a Ana ofereceu mandar se precisar: estrelas glitter, fita, ticket, clipe reais em PNG.
- `src/components/PixelEdge.tsx` (2026-09-22, terceira versão — **a que ficou**) — passe de pós para o estilo **Pixel** do jardim do Fragments: **só contorno**, 1 texel, **preto sólido** (`ink` #0e0c12; a Ana pediu preto, estático e homogêneo, 2026-09-22), por descontinuidade de profundidade (`readDepth`/`getViewZ`, `EffectAttribute.DEPTH`), desenhado do lado mais próximo. Continuidade: o teste é de **assimetria** por eixo (`axisEdge`: um vizinho salta para longe e o outro fica — um plano inclinado tem os dois vizinhos simétricos e não risca), em 4 eixos (h, v, 2 diagonais) para fechar silhuetas inclinadas; limiar `0,12 + z·0,03` m, alto o bastante para **tufos de grama e florzinhas não receberem linha** (meio-riscados viravam pontilhado quebrado) e baixo para planta, morros e céu sempre fecharem; fatias de 1 texel (ponta de tufo, haste fina — vizinhos longe dos dois lados de um eixo) não recebem linha (`sliver`), senão sobrava um pontinho preto solto. Nada de posterize, dither ou paleta: a Ana rejeitou as três ("parece qualidade baixa, dói os olhos"); o cel de 3 bandas do shader pintado já dá o preenchimento chapado. Motivo do passe: a casca invertida (`useOutline`) tinha largura projetada variando entre texels e tremia. No estilo pixel também: `paint`/`patch` 0, `outline: 0` (`useOutline` retorna cedo com largura ≤ 0), `sway` 0, sem `group.rotation.z`, sem parallax do mouse (`Rig still`), **sem Bloom**. **Escala inteira exata**: `FragmentsBackdrop` dimensiona a caixa do canvas para múltiplo de N e renderiza a 1/N (N = 3 se largura ≥ 1600, senão 2), com `image-rendering: pixelated` — fração não inteira dava pixels de tamanhos desiguais. 0,26 (≈375 px de largura) foi considerado grosseiro demais; 2× (~720 px num laptop) é o "pixel HD" que ela aceitou.
- **Jogos 02 e 03** (2026-09-23): `Memorize It!` e `Kardec’s House`, os dois projetos solo em GameMaker do portfólio Canva da Ana (`anamatilha.my.canva.site`; `Escolha Certa` e `My work, your beauty` ficaram de fora por não serem GameMaker). Descrições copiadas do site (PT) e traduzidas (EN); **ano 2025 é estimativa**; sem `link`/`embed`. Telas de título baixadas do Canva em `src/assets/titles/02-memorize.jpg` e `03-kardec.jpg` (1024×576) — o glob `TITLE_URLS` ordena por nome, então o prefixo numérico = índice do jogo. `Game.tsx`: jogo **sem embed** mostra a tela de título como `.game-poster` (16:9) em vez de "Em breve"; "Em breve" só aparece se não houver imagem. `PageShell` renderiza espaços do título como `\u00A0` (senão "Memorize It!" virava "MemorizeIt!").
- **Projetos = protótipos** (`src/pages/Projects.tsx`, 2026-09-23, pedido da Ana): dois aparelhos 3D pintados flutuam num `Canvas` (`src/components/Devices.tsx`) — **o celular dela** (`usePhoneModel()` de `Phone.tsx`, que agora também pinta o modelo; em pé com `rotation.x = +90°` → face para +z) com etiqueta "Aplicações mobile", e um **notebook em primitivas** (base + tampa articulada aberta a 106°, `LAP`) com "Aplicações web". Etiquetas = `drei/Html` com `.dv-tag` (mesma linguagem das etiquetas da mesa, coração de vidro). A tela de cada aparelho é uma **CanvasTexture** de wallpaper (`wallpaper()`: categoria em serif + "0N · N protótipos"). Clicar no aparelho ou na etiqueta → `mode: 'mobile' | 'web'` (estado em Projects.tsx): a câmera (`Rig`, damp) voa até o aparelho, o outro fica a 35% de opacidade, e **`DeviceDock.tsx`** cobre a cena com um **painel em forma de aparelho em CSS** (celular rosa com notch / notebook creme com base), onde fica a lista de protótipos e cada um abre no lugar: `embed` (iframe do Figma, URL de Compartilhar → Incorporar; link "abrir no Figma" extraído do `url=`), `shots` (tira de imagens, vertical no celular) ou placeholder "Protótipo em breve". Esc ou "voltar aos aparelhos" fecha. **Tentativa descartada**: tela como `drei/Html transform` dentro do 3D — a projeção ficou deslocada/escala errada e a lista não aparecia; o dock em CSS é confiável e o iframe fica interativo. Conteúdo em `protos` (`content.ts`, tipo `Proto`, PT/EN) — **placeholders** até a Ana mandar os links do Figma ou as telas (em `src/assets/protos`). Layout: `narrow` (< 760 px) empilha celular em cima e notebook embaixo, câmera mais longe. A lista antiga de projetos (`projects` em content.ts, `.grid/.card`) ficou sem uso.
- `src/components/DeskScene.tsx`: mesa 3D (`desk.glb`) em seção sticky; câmera orbita com o scroll. **Hotspots são etiquetas de papel** (2026-09-22, a Ana achou o ponto+linha+texto claro ilegível sobre a cena pintada): `Html` ancorado no objeto = **pino** (bolinha com anel pulsando), **cordinha** de 22px para cima e a **etiqueta** creme com tipo escuro (índice em Inter + nome em serif itálico + seta), a **tachinha é o coração de vidro rosa da Ana** (`src/assets/about/heart.webp`, recorte do JPG dela com flood fill do fundo branco; `.label::before` 30×28 **centrado no topo da etiqueta** (onde ficava a bolinha; a Ana pediu no meio), inclinado −8°, brilho rosa; `.label::after` é um **glint** — gradiente branco deslizando a cada 5,5 s, mascarado pela silhueta do coração — para parecer vidro 3D), rotação alternada por `--rot`, sombra; hover endireita, sobe, o coração cresce e o pino fica rosa. A etiqueta fica ACIMA do pino, então o `pos` do about está no topo do cavalete (y 0,2) para não cobrir a foto. Hotspots por coordenada:
  `Easel.tsx` = mini cavalete de pintura feito de primitivas (pernas em "A" a partir de um pino no topo + perna de trás inclinada, travessa, moldura, paleta e pincel) com o mesmo `usePainterly` + `useOutline` da mesa, em `[-0.84, -0.33, 0.06]`, escala 1,3 (tampo em y ≈ -0,33), no vazio à esquerda dos livros. A foto no cavalete é `src/assets/about/ana.webp` (retrato P&B da Ana, recortado com Pillow para cabeça e ombros em proporção 0,77, 600 px, 17 KB; qualquer imagem nessa pasta serve). **Ela é um plano texturizado desenhado num segundo passe depois do EffectComposer** (`Photo` em `Easel.tsx`: cena própria via `createPortal`, `useFrame` prioridade 2, `clearDepth` + `gl.render(overlay, camera)`, matriz copiada de um grupo-âncora no cavalete a cada frame). Assim escapa do Kuwahara e sai nítida, mas fica presa à placa em qualquer ângulo da câmera — a versão anterior em `drei/Html transform` escorregava da placa quando a mesa girava (2026-09-22). Nada na mesa fica na frente do cavalete, então desenhar por cima não perde oclusão. O plano é o alvo de clique (eventos funcionam dentro do portal). Escala 1,7, em `[-0.82, -0.33, 0.08]`, pernas de 0,28; a perna de trás usa `rotation.x = +0.5` (negativo jogava o pé para a frente, cruzando a foto). Sem arquivo, cai num **retrato da personagem renderizado ao vivo** (`drei/RenderTexture` 396×512, 240 frames, câmera [0, 0.6, 1.5] fov 32, `character.glb` com a **textura original + luzes de estúdio** — o shader pintado não desenha dentro de RenderTexture, testado em 2026-09-18). **O cavalete é o hotspot Sobre** (clicar na foto abre /sobre); os livros deixaram de ser.
  **Recorte da malha da mesa** (`CUTS` + `cutDesk` em `DeskScene.tsx`, 2026-09-18): o `desk.glb` é uma malha única, e a Ana pediu para sumir com o vaso de suculentas e o tablet chato da frente direita. No carregamento, `cutDesk` descarta os triângulos cujo centroide cai dentro das caixas em `CUTS` (coordenadas locais do modelo) e cuja maior aresta é menor que o `size` da caixa (0,12 para o vaso, 0,2 para o tablet — as faces dele chegam a 0,17; o tampo tem triângulos enormes com centroide fora dessas regiões, então não abre buraco). Para tirar outro objeto: medir a caixa no `plain.gltf` descomprimido (`npx @gltf-transform/cli dedup/decompress`) e acrescentar uma entrada. Não editar o `.glb`.
  `Phone.tsx` (2026-09-23) = **celular deitado na frente-direita da mesa**, onde estavam o vaso e o tablet (`[0.68, -0.367, 0.5]`, yaw −0,38), **é o hotspot Contato** (o teclado deixou de ser). Modelo = **`public/models/phone.glb`, o low-poly da Ana** (Sketchfab, `low_poly_mobile_phone.glb`, otimizado com gltf-transform draco → 8,7 KB; materiais chapados sem textura: PhoneCase_Mat azul, PhoneFace_Mat preto, PhoneButton_Mat, Camera_Light1). **Normalização em runtime** no `useMemo`: decompõe o `matrixWorld` do mesh `Phone_Case_PhoneCase_Mat_0` e **cancela a rotação** da cadeia de nós do FBX (a geometria do case é autorada deitada: local 30×5×60 = x largura, y espessura, z comprimento), centraliza no pivot e escala para 0,285 de comprimento (60 × escala mundial). A 1.ª tentativa por bbox (eixo mais fino → Y) errava porque a rotação do arquivo não é alinhada aos eixos e o bbox saía (0,31 × 0,46 × 0,46) — o celular ficava em pé e a tela torta. Cores por **nome de material** em `COLORS` (case rosa-claro #e9b7c3, botões #6b6570, face #15121a, luz da câmera #f6dc9a) gravadas em `userData.color` para o `usePainterly` + `useOutline`. A tela é um plano unlit com **CanvasTexture** de lock screen (data, "21:07", card "1 nova mensagem" = `t('phone_msg')` + e-mail de contato — se mudar o e-mail em `content.ts`, mudar aqui também) posicionado no **topo** da bbox do mesh `Phone_Case_PhoneFace_Mat_0` (a geometria da face é uma casca de y −3,7 a +1,98 — no centro o plano ficava dentro do case e o topo aparecia só rosa), 97% do tamanho, 0,6 mm acima; um grupo interno com `offset` = (−centro x/z do case, −min y) centraliza a pegada e assenta o fundo no tampo. **Só case + face ficam**: câmera traseira (`Phone_Camera`, `Camera_1/2`, `Camera_Light`), botões laterais (`Power_Button`, `Volume_Up/Down`) e `Camera_Front` são removidos do clone — a câmera ficava embaixo e os botões, posicionados pelos próprios nós, apareciam como lascas flutuando fora da borda (Ana, 2026-09-23). Não é sobra da mesa: o que resta perto do celular na malha do desk é a planta/trepadeira ao lado da torre (x 0,85–0,95, z 0,2–0,3), que deve ficar. A normalização roda num **clone** do gltf (`scene.clone(true)`): o `useMemo` precisa ser idempotente (StrictMode roda 2×, HMR re-roda) e mutar a cena cacheada quebrava a posição. Clique na tela → `select('contact')`. A versão anterior em primitivas (RoundedBox) foi substituída a pedido dela.
  monitor = Projetos (com `ScreenPreview.tsx`: a tela é um plano na face do monitor com a foto `public/wipe.jpg` como textura em modo "cover" — assim torre/plantas a ocluem de verdade e ela recebe o mesmo pós-processamento; **não** usar `drei/Html` para isso, HTML fica sempre por cima do 3D), cavalete/retrato = Sobre (antes eram os livros), **celular = Contato** (antes era o teclado), torre do PC = Skills, controle = Jogos.
- `src/components/Transition.tsx`: transição de página (câmera mergulha no objeto + cortina circular a partir do clique com a foto `public/wipe.jpg` + revelação).
- `src/pages/*`: páginas reais nas rotas `/projetos /sobre /contato /skills /jogos /jogos/:n`. Todo o conteúdo (ainda de exemplo) está em `src/pages/content.ts` em PT e EN.
- `src/components/SkillLogos.tsx` (página Skills): logos das ferramentas (`tools` em `content.ts`) extrudados em 3D a partir de caminhos SVG (`logoPaths.ts` — cinco vêm do simple-icons, CC0; Azure, Java, SQL, Canva, Procreate e Nomad Sculpt são marcas simplificadas desenhadas à mão, trocáveis). Diferente do resto do site, os logos **não** usam o shader pintado: são "inflados" (bevel fundo + normais suavizadas) com `MeshPhysicalMaterial` brilhante (clearcoat + sheen azulado), iluminados por `Environment` com `Lightformer`s gerados na cena — referência: tipografia clay/gummy brilhante. Sem Kuwahara neste canvas (borraria os reflexos). O modo `sketch` do `makeOutlineMaterial` continua disponível, mas não é usado aqui. Hover: zoom + nome. Clique: o logo vem ao centro, os outros saem voando e um HUD 2D (`Hud`, SVG dentro de `drei/Html`) desenha linhas saindo dele com Domínio, Área e descrição; abaixo de 1000px o HUD empilha na vertical. Sem GLB por logo (peso). O `.panel` não é mais usado aqui.
- `src/components/GameWorld.tsx` + `Arcade.tsx` (página Jogos): **fliperama retrô japonês** (referência da Ana, 2026-09-18: máquinas pastel menta/rosa, piso xadrez creme/sage, parede de pastilhas de vidro sage brilhantes (`public/textures/mosaic.jpg`, recortada em 14×26 pastilhas inteiras a 64 px cada para repetir sem emenda; sem lambri — a Ana tirou o marrom) tomada de pôsteres sobrepostos, lanternas de papel, fluorescentes, máquina de chá teal). Sala com **materiais padrão e luzes reais** (não o shader pintado — em paredes lisas ele parece camuflagem). Máquinas = `public/models/arcade.glb` (Sketchfab, 29 KB, uma máquina só: corpo com textura pintada rosa/vermelha + malha de contorno "Arcade_Outline"). Para as máquinas não ficarem vermelhas (cor principal), `recolour()` redesenha a textura no canvas empurrando os pixels saturados para o pastel do jogo (`PASTELS`, ciclado por índice) e preservando cinzas/pretos; o contorno vira `MeshBasicMaterial` ameixa. Frame local do GLB: Y para cima, 228 de altura, frente em +X, largura no Z (centro ≈ 342) — a máquina é girada -90° em Y para olhar a câmera. A tela é um plano no quadrilátero inclinado da malha (de x -4.7/y 124 até x -20.8/y 201) com `CanvasTexture`: quando existe a **tela de título real do jogo** em `src/assets/titles/NN-*.jpg` (ordem = índice do jogo), ela é desenhada em cover com foco à esquerda do centro, vinheta CRT, scanlines e barra "INSERT COIN"/"CREDIT 1" por cima; sem imagem, cai num pixel-art gerado. Sinalização: etiqueta HTML `.cab-tag` (número + nome, `drei/Html`) flutuando sobre cada máquina, sempre nítida, que acende e ganha setinha ao encostar ou passar o mouse, e some no zoom (`.world-stage.zoomed`). Um letreiro 3D com lâmpadas em cima da máquina foi construído e rejeitado pela Ana em 2026-09-18 ("scrap it all"). **Armadilha**: o wrapper já centraliza o modelo (`[5, -0.3, -342]`), então filhos usam coordenadas locais brutas do GLB — descontar duas vezes jogou a tela 6 unidades para o lado. Parede: colagem em 4 fileiras sobrepostas do chão ao teto; as 13 imagens da Ana (`src/assets/posters/poster-XX.webp`, 560 px, convertidas com Pillow a partir dos webp do Downloads) entram via `import.meta.glob`, cada uma na própria proporção (pasta vazia = pôsteres geométricos gerados por canvas). Uma máquina apagada extra à esquerda e a **máquina de bebidas** à direita = `public/models/vending.glb` (GLB da Ana, Sketchfab, 10 MB → 600 KB com Draco + WebP 512 + simplify; 4,4 de altura no arquivo, escalada para 3,9; frente já olha para +Z, `VENDING_YAW = 0`). A personagem da Ana (`public/models/player.glb`, ~790 KB, Meshy rigada no Mixamo, clipes `Idle`/`Walk`) usa o shader do hero (`usePainterly` com os mesmos parâmetros + contorno 0.0024) — decisão da Ana — **exceto o rim light**, reduzido a 0,12 e mais escuro (`#7fa896`) porque na sala escura ele aparecia como um contorno branco (2026-09-18); Bloom com limiar 0,9 pelo mesmo motivo. Só Bloom neste canvas (o Kuwahara foi removido por desempenho). Ela anda só no eixo X (A/D ou setas) em frente às máquinas (gap 3.6); câmera lateral fixa em altura/profundidade seguindo em X. Encostar na máquina (zona = a mais próxima a menos de 2,3 em X) acende a tela ("INSERT COIN"); E abre a máquina encostada, e **clique abre qualquer máquina de qualquer distância**: a câmera dá zoom na máquina (`FOCUS`, a personagem fica invisível), depois de 0,75 s uma ficha 3D (`Coin`: cilindro com **materiais painterly texturizados** — `makePainterly(tex)` por grupo da CylinderGeometry `[lado, tampa, tampa]`; face `src/assets/arcade/coin-face.webp` = recorte da moeda cartoon amarela com "$" que a Ana mandou (2026-09-22), cantos e borda preenchidos com o dourado da moeda porque o shader não tem alpha, e a imagem já vem girada 180° para ler de pé na pose da mão, pois o shader amostra o uv direto; borda `coin-edge.webp` = listras geradas com Pillow. No frame externo já centralizado da máquina — cuidado: filhos do wrapper interno usam coordenadas brutas do GLB, irmãos do wrapper usam coordenadas centralizadas) é inserida **em primeira pessoa**: nasce a 0,9 da lente (posição da câmera convertida para o frame da máquina com `worldToLocal` — chamar `updateWorldMatrix` antes, porque no primeiro frame de um grupo recém-montado a matriz ainda é identidade; offsets < 10° para caber no fov 34 em qualquer proporção), de frente para quem olha, e viaja até o slot virando de lado (slerp de quaternions) até o corpo da máquina a engolir, com flash âmbar discreto; no instante em que ela some (0,95 s) dispara a **mesma cortina circular do site** (`useTransition().go`, origem = centro da tela da máquina) para a página do jogo `/jogos/:n` (`src/pages/Game.tsx`, `PageShell` com `backTo` para o fliperama: engine/plataforma/ano, descrição e botão Jogar quando `game.link` for real; "Em breve" enquanto for `#`). Não existe mais painel lateral nem passo extra. Esc cancela antes da cortina. Abertura: um `<Ready/>` dentro do Suspense do Canvas avisa quando a cena desenhou 3 frames e a sala faz **fade-in** (`.world-stage.ready`); uma abertura de TV de tubo foi feita e rejeitada pela Ana (2026-09-18). **Desempenho** (a Ana achou a página travada ao abrir): sem Kuwahara neste canvas, dpr máx. 1,25, pôsteres com **materiais compartilhados** (um `MeshLambertMaterial` por imagem, moldura única) em 3 fileiras, sala mais curta, e `recolour()` com cache por tinta (`RECOLOUR_CACHE`) para não repassar 1 M de pixels por máquina. O teclado funciona assim que a página abre, sem clicar no palco (pedido da Ana, 2026-09-18); Esc só cancela uma máquina aberta antes da cortina. **Point and click**: clicar numa máquina fora do alcance faz a personagem andar até ela (`walk` ref no `Player`, alvo `tileX(i) + STAND_OFF`) e abrir ao chegar; clicar no chão só anda até lá; teclado/joystick cancelam a caminhada. **Celular** (`pointer: coarse`): joystick de toque `.joy` no canto inferior esquerdo (arrasto horizontal → eixo -1..1 em `axis`), dica muda para toque e vai para a direita. Histórico de conceitos descartados pela Ana: tabuleiro com projeções e jardim etéreo (2026-09-15), cobertura noturna com cidade low-poly, piso espelhado e tapete de luz negra (2026-09-16/18).
- `src/pages/Game.tsx` (`/jogos/:n`): página do jogo com o **jogo embutido** quando `games[i].embed` existe (Fragments, GameMaker publicado no GX.games). O runner `play.gx.games/game-wrapper/…index.html?game&track&release` aceita iframe; a página pública do gx.games não (X-Frame-Options), e a API `api.gx.games` bloqueia CORS de outros domínios — por isso a URL fica fixa em `content.ts` (ver comentário lá para renovar o `release` quando a Ana publicar versão nova). `gamePlayId` é gerado no cliente com `crypto.randomUUID()`. Capa = tela de título até o iframe carregar; botão de tela cheia usa `requestFullscreen` no contêiner. **Armadilha de teclado**: o runner dá `preventDefault` no mousedown, então clicar dentro do iframe não transfere o foco e as teclas ficam na nossa página — por isso o `Embed` foca o iframe por código no load e mantém uma camada `.game-focus` ("Clique para jogar") que refaz o foco e some; ela volta quando a janela pai recebe `focus` de novo (usuário clicou fora).
- `src/components/FragmentsDossier.tsx` + `src/pages/fragments.ts` (conteúdo PT/EN, tirado do artigo PIBITI "Fragments: desenvolvimento e avaliação de um jogo digital…" de Ana Julia e da orientadora Ana Grasielle Dionísio Corrêa, Mackenzie — os documentos ficam em `~/Downloads/Fragments - PIBITI/`, fora do repo): dossiê abaixo do jogo embutido em `/jogos/1` quando `games[i].dossier === 'fragments'`. Seções: sobre + fatos; **`FragmentsWorld.tsx` = "O jardim da memória"**, o **fundo fixo da página inteira** (`FragmentsBackdrop`, portal em `<body>`, `position: fixed`, z-index 0; a página `/jogos/1` recebe a classe `page.garden` = tema claro com painéis `.paper` creme translúcidos sobre o céu, texto tinta; **pausa o render enquanto o jogo estiver carregado** (não só focado) ou a lightbox aberta, e `body.game-running` para a animação do `.grain` — a Ana relatou áudio do jogo chiando/estourando (2026-09-18): é fome de GPU/CPU do runner do GameMaker disputando com o Kuwahara em tela cheia; dpr do jardim fixo em 1; eventos de ponteiro vêm do `body` e só contam quando o alvo é o próprio canvas) no estilo da tela de título — céu em gradiente (esfera BackSide com textura canvas), nuvens em billboards com textura canvas desfocada, colina + lírio + **planta que cresce com o scroll** (semente → caule → folhas → flor → copa de árvore; primitivas com o shader pintado do site via `usePainterly` **com parâmetros mais fortes que o hero** (paint 0.26, patch 0.32, patchScale 9; colinas marcadas com `userData.terrain` recebem patch 0.4 / patchScale 3.2 — pinceladas de guache) e **Kuwahara raio 2** no composer, a pedido da Ana ("mais painterly ainda"). Em 2026-09-18 ela não gostou dessa textura e pediu opções: `STYLES` em `FragmentsWorld.tsx` (guache, aquarela, flat, óleo, pixel) trocáveis **só em dev** pelo seletor `.frag-style-picker` no canto inferior direito ou por `?estilo=id`; o padrão em produção é o primeiro da lista — quando a Ana escolher, mover o escolhido para o topo e apagar os outros — como ele não tem cor por malha, `baseColor` é setado por `userData.color` — e contorno `useOutline`). As fotos do jogo flutuando em 3D foram construídas e **removidas a pedido da Ana** (2026-09-18) — as telas ficam só nos cartões, na galeria e na lightbox. A planta principal fica em x = 3,8 (o lírio foi para o fundo em x 7,2); em telas > 1000 px `shared.side = 0` e a câmera calcula `lookX` para a planta ficar **sempre em 82% da largura da tela**, qualquer que seja a distância (antes, ao recuar para caber a árvore, a planta deslizava para o centro e ficava debaixo dos cartões); a coluna de leitura (`.page.garden .game-page` e `.page-head`) tem max-width min(960px, 56vw) e margem esquerda ~6vw — a Ana achou os cartões colados na borda ruins de usabilidade (2026-09-18); em celular `side = -3,8` centraliza a planta. Árvore alta (caule até 4,75) e crescimento rápido (damp 2,6) assim que o cartão entra no quinto inferior da tela (80% da altura); cartões com 10vh de espaço entre si para exigir pouca rolagem. Câmera sobe e recua com o crescimento, parallax de mouse. As 4 fases são cartões `.frag-phase` com `data-phase-step` — o cartão que passa de 62% da altura da tela define o `step`, que dita o estágio da planta (broto, planta, flor, árvore), amortecido. O jogo embutido só carrega ao apertar "Jogar aqui" e **sem** permissão de autoplay (não há como silenciar o runner cross-origin; o volume é o do menu Ajustes do jogo); galeria "Fragmentos de memória" = 8 telas do jogo (`src/assets/fragments/NN-*.webp`, 1200 px, extraídas do `word/media` do docx) como polaroids com inclinação 3D seguindo o mouse (vars CSS `--rx/--ry`, brilho `--gx/--gy`), filtros por fase e por função executiva (cores: memória de trabalho sage, controle inibitório âmbar, flexibilidade lilás), lightbox com `layoutId`, setas e Esc (`AnimatePresence mode="popLayout"` exige `forwardRef` no card); resultados com anéis/contadores animados (`useInView` + `animate`), barras do GEQ e a divisão do final (16 paz × 14 trágico). Números são os do artigo (n = 30).
- `src/i18n.tsx`: toggle PT/EN.

## Modelos
Os GLB em `public/models/` já estão otimizados (Draco + WebP via `@gltf-transform/cli`). Os originais da Ana ficam fora do repo (Downloads/Documents). Para um modelo novo: `npx @gltf-transform/cli optimize in.glb out.glb --compress draco --texture-compress webp --texture-size 2048` (adicionar `--simplify true --simplify-ratio 0.05` se tiver milhões de triângulos).

Personagem animado (`player.glb`): fonte = GLB texturizado do Meshy + FBX do Mixamo **com skin** (Walking) + FBX de animação (Idle). Sem Blender na máquina, a junção foi feita no browser com os loaders do three (`FBXLoader` → aplicar `map` do Meshy à SkinnedMesh **com `map.flipY = true`**, porque UVs de FBX usam a convenção invertida em relação a texturas de GLB — sem isso a textura sai embaralhada → `GLTFExporter` com `animations: [Walk, Idle]`), depois `gltf-transform optimize --compress draco --texture-compress webp --texture-size 1024 --simplify false --join false --flatten false` (não simplificar/juntar malhas com skin). Novos clipes do Mixamo: baixar "Without Skin" e repetir a exportação incluindo o clipe.

## Armadilhas conhecidas
- `patch` é palavra reservada em GLSL; não usar como nome de uniform.
- A tela do monitor foi medida por mapa de profundidade da malha: x -0.635..0.455, y -0.20..0.38, z ≈ -0.206. Em `Html transform`, 1 px = distanceFactor/400 unidades.
- Servidor de dev: processos `nohup npx vite &` iniciados pelo Bash morrem depois de alguns minutos. O que funciona é deixar o painel do navegador gerenciar: `~/.claude/launch.json` (na raiz da sessão, que é a home) tem a config `portfolio` apontando para `node_modules/.bin/vite <raiz do projeto> --port 5175 --strictPort`; usar `preview_start name=portfolio`. O `.claude/launch.json` do projeto tem a mesma config.
- Deploy previsto na Vercel (`vercel.json` já tem o rewrite de SPA).

## Versão só-Fragments (QR code do banner)

Ana quer o QR do banner apontando para a página do Fragments **sem** expor o resto do portfólio.
Solução: mesmo repositório, build alternativo.

- `npm run build:fragments` → `vite build --mode fragments` lê `.env.fragments` (`VITE_ONLY=fragments`)
  e gera `dist-fragments/` (gitignored), depois `scripts/prune-fragments.mjs` apaga tudo que a página
  não referencia (Vite copia `public/` inteiro e emite assets de módulos que depois foram tree-shaken).
- `App.tsx`: `ONLY_FRAGMENTS` é constante de build. Verdadeira → `FragmentsSite` (nav só com logo em
  `<span>` + `LangToggle`, rota `/` = `<Game only="fragments"/>`, `*` → `/`, `document.title` "Fragments — Ana Julia").
  Falsa → `lazy(() => import('./FullSite'))` (o site inteiro, antes dentro de App.tsx). Como a condição é
  literal, o Rollup descarta o import dinâmico e nada do resto entra no bundle.
- Para o bundle ficar limpo de verdade: a entrada do jogo saiu de `content.ts` para `fragmentsGame`
  em `pages/fragments.ts`; `Game.tsx` usa `ONLY_FRAGMENTS ? [fragmentsGame[lang]] : games[lang]` e
  importa o pôster direto (`01-fragments.jpg?url`); `TITLE_URLS` mudou para `components/titles.ts`
  com `/* @__PURE__ */` (o glob `Object.values(...)` era tratado como efeito colateral e puxava
  `Arcade.tsx`, que faz `useGLTF.preload` no topo → modelos do fliperama no bundle).
- Auditoria após o build: `grep -rl "Trajetória\|Product Designer\|phone.glb\|Kardec" dist-fragments/assets`
  deve dar vazio. Só o dicionário `i18n.tsx` (rótulos de UI) entra inteiro — aceitável.
- `PageShell` aceita `backTo={null}` para esconder o link de voltar.
- Dev local: `npm run dev:fragments` (porta 5176) ou entrada `fragments` no launch.json — o painel do
  app não recarregou o launch.json novo na sessão; saída foi um `.env.local` temporário com
  `VITE_ONLY=fragments` + reiniciar o servidor `portfolio` (apagar depois!).
- Deploy: projeto separado no Vercel com Build Command `npm run build:fragments` e Output Directory
  `dist-fragments`; ou arrastar o zip de `dist-fragments/` (leva `vercel.json` e `_redirects`).

## Celular (phone.glb) — peças soltas
O `gltf-transform optimize` funde e renomeia nós (`Power_Button_PhoneButton_Mat_0` = todos os botões,
`Camera_Light_Camera_Light1_0`). Remover por nome original não pegava nada e o bloco de botões
(local x −30,9…0,5, além da borda da capa em −15) aparecia como "partezinha" ao lado do celular
(Ana, 2026-09-24). `usePhoneModel` agora remove por **nome de material** (`PhoneButton_Mat`,
`Camera_Light1`) — estável mesmo se o arquivo for reotimizado.

## Etiquetas da mesa — alfinete em cima do objeto
`HOTSPOTS[].pos` é só uma posição aproximada. O componente `Hotspots` (DeskScene.tsx), no primeiro
frame com os modelos carregados, lança uma grade 7×7 de raios para baixo (±0,075 em x/z) a partir de
0,6 acima do ponto e fixa o alfinete na superfície **mais alta** encontrada entre y−0,35 e y+0,15
(ignora `userData.isHull`). Assim ele cai no topo do objeto (moldura do monitor, cavalete, tampa da
torre, controle, celular) em vez de flutuar — Ana viu alfinetes no ar em alguns ângulos (2026-10-01).
Resultado medido: projects y 0,43→0,38, about 0,20→0,13, contact −0,30→−0,34, skills 0,14→0,29,
games −0,26→−0,31. Se mover um objeto, basta manter `pos` por cima dele.
Opções por etiqueta: `within` (nome do grupo — `easel`, `phone` — para só pousar nesse objeto) e
`drop` (abaixa o alfinete; about usa 0,07 porque o pico do cavalete é um pino fino bem acima da
moldura e a etiqueta ficava alta demais — Ana, 2026-10-02); `center` (mira no centro do bbox do
`within` — contact, para o alfinete cair no meio do celular); `single` (um raio só, sem grade —
games, no meio do controle, que no desk mesh ocupa x −0,75…−0,40, z 0,23…0,475). Ana pediu os dois
"no meio" em 2026-10-02.

## Projetos — modelos da Ana (iPhone + MacBook Pro), 2026-10-02
`public/models/iphone.glb` (179 KB) e `macbook.glb` (57 KB) vêm dos GLBs do Sketchfab que a Ana mandou,
passados por `gltf-transform unlit` (tira normal/MR/occlusion, que o painterly não usa) e
`optimize --compress draco --texture-size 1024 --simplify false --weld false` + `webp --quality 94/90`
(o `optimize --texture-compress webp` não aceita qualidade e esmagou a textura a 21 KB).
**Sem painterly nos aparelhos** (`useFlatTextured` em Devices.tsx: `MeshBasicMaterial` com a textura do
modelo, DoubleSide, toneMapped off, + `useOutline`). Tentei o painterly (fill/rim neutros, patch≈0,
spec 0, `patchVar` 0, normal invertida em back faces via `gl_FrontFacing`) e o teclado do MacBook virava
um mosaico de células preto/branco ou sumia num cinza uniforme — a chapa é quase branca e qualquer
variação por célula vira banda. As texturas já têm sombreamento assado; o contorno a tinta mantém a
linguagem do site. Ana: "faltou a textura" (2026-10-02).
Ganhos no shader que ficaram: opção `patchVar` (variação por célula, padrão 0,12) e `side`, e a normal
é invertida em back faces (como nos materiais do three) — não muda nada nos modelos single-sided.
- **iPhone**: já fica em pé olhando +z, centrado na origem (0,147 de altura; escala 2,3). Removo o
  mesh `Phone_Alpha` (vidro, ficaria opaco). A tela é o mesh `MobilePhone_Phone_Emission_0`: troco
  o material por `MeshBasicMaterial` com um canvas 1024² = textura original + wallpaper desenhado no
  retângulo u 0,034…0,471 / v 0,014…0,986 (px 35,14 → 447×996), **invertido verticalmente** (topo da
  imagem = base do celular). `flipY=false` como nas texturas glTF.
- **MacBook**: mesh único; a tela é um plano meu sobre a face interna da tampa, medido pelos vértices
  cujas UVs caem na área da tela: dobradiça em z −0,111 (y≈0), topo da tampa (y 0,196, z −0,186) →
  comprimento 0,2136 inclinado −0,359 rad; largura 0,31. Escala 2.
- (O painel/dock em CSS foi aposentado em 2026-10-15 — ver "telas dentro dos aparelhos" abaixo.)
- Câmera olha um pouco de cima (overview y 0,62; web y+0,42) para o teclado aparecer — rente à base ele era só uma aresta.

## Projetos — cenário: ilhas flutuantes (2026-10-14, segunda versão)
A primeira versão (mesa lilás com caneca, livros, lápis) Ana achou "feia e nada criativa". Conceito
novo em `DeviceScenery.tsx`: **protótipos são ideias ainda no ar** → cada aparelho mora numa ilha
flutuante num céu noturno. `Island` = rocha torneada (`LatheGeometry`, perfil **do bico para a borda**:
na ordem contrária as normais apontam para dentro, o painterly some e só o hull de tinta aparece, uma
silhueta preta) com `wobble()` nos vértices + tampo de grama (cilindro baixo) + 4 pedrinhas orbitando
(`useFrame`), tudo painterly com shadow/fill claros (`#8d82b8`/`#b8aee0`, senão a parte de baixo fica
preta) e contorno. `Clouds`: grupos de esferas achatadas em creme/rosa/lilás a z −1,5…−2,8, derivando em
x com wrap; `CLOUD_PAINT` com patch 0 / patchVar 0 / spec 0 (superfícies claras viram mosaico). `Moon`:
sprite com gradiente radial atrás. `Floaters`: corações de vidro + estrelas de papel (vagalumes) e 40
pontinhos piscando ao fundo. Suculentas na ilha do iPhone, lírios na borda de trás da ilha do MacBook.
`phoneTop`/`lapTop` = y da base de cada aparelho (centro −0,23 / −0,27) — a grama fica exatamente ali.
Câmera mais frontal que na mesa (overview y 0,42·fit, z 2,45·fit) para ver as ilhas de lado.
**Shader etéreo** (`EtherealMaterial.ts`, pedido da Ana: "algo mais ethereal"): luz envolvente sem bandas
(`smoothstep` em N·L, sombra lilás em vez de preto), fresnel rosado nas silhuetas, grão leve e `fade`
(alpha por y no mundo) — a ponta da rocha das ilhas se dissolve na noite, com um sprite `Mist` lilás
embaixo. Nuvens com `opacity 0,92`. Sem contorno a tinta no cenário (os aparelhos mantêm o deles).
Bloom (`EffectComposer` + `Bloom` 0,55 / threshold 0,62) no canvas de Projetos; por isso o canvas é
opaco com `<color attach="background">` = `--bg` exato (#0c0d12) — qualquer outro valor vira um
retângulo visível. "Parte de cima cortada": lua e nuvens estavam acima da borda do palco; ficam agora em
y ≤ 0,55 (desktop) / 1,1 (narrow) e o palco cresceu para min(84vh, 900px). Depois Ana pediu "sem corte nenhum, tudo
como a mesma tela": o canvas virou o **fundo da página inteira** (`.dv-stage { position: absolute;
inset: 0 }`, `.page.projects { min-height: 125svh }` desktop / 150svh narrow, `overflow: hidden`), com o
título por cima (`page-head` z-index 2, `pointer-events: none` menos nos links). `toneMapping:
NoToneMapping` nesse canvas para o clear color sair exatamente `--bg`. A câmera mira mais alto para as
ilhas ficarem abaixo do bloco do título (desktop at.y 0,1, z 2,75·fit; narrow at.y −0,15, z 8 — um canvas
mais alto amplia tudo porque o fov vertical é fixo, por isso o recuo grande). A rocha das ilhas dissolve
(`fade` [y−1,1r, y−0,22r]) antes do fim da página.

## Lírios da Ana (2026-10-14) — "eu amo lírios"
Dois GLBs: `lilies.glb` (buquê de lírio-rosa, Sketchfab, transforms gigantes — translação ~10 500,
escala ~700 — por isso é normalizado em runtime) e `day_150_lily.glb` (varredura fotogramétrica de um
canteiro inteiro, textura de foto densa — **não usei**: destoa do visual pintado; `public/models/lily.glb`
fica comprimido no repo caso ela peça). `GlbProp.tsx`: carrega, clona, texturas próprias sem painterly e
sem contorno, mede com Box3 (`height` = altura no mundo, ou maior lado com `flat`), centra x/z e põe a
base em y 0; `rotation` é aplicada antes de medir.
- Projetos: buquê em pé atrás do MacBook à direita (`lapX+0,66, z −0,28`, altura 0,62, rot y −0,5);
  a caneca foi para a frente (`lapX+0,6, z 0,42`). Só no desktop (no narrow não cabe).
- Mesa da home: buquê no canto esquerdo de trás (`−0,98, z −0,18`, altura 0,62, rot y 0,5) — as flores
  espiam à esquerda do cavalete e o Kuwahara pinta as pétalas como aquarela. Em (−1,0, −0,42) ficava
  totalmente escondido atrás do cavalete/planta.

## Ilha da Ana nos Projetos (Meshy "Skyfall Eden", 2026-10-15)
`public/models/island.glb` (1,27 MB) vem de um GLB de 20,8 MB. Pipeline novo em `scripts/compress-model.mjs`
(API do gltf-transform; deps de dev: @gltf-transform/core|functions|extensions, meshoptimizer, draco3dgltf,
sharp): tira normal/MR/occlusion/emissive (o site renderiza esses props unlit), `weld` + `simplify`
(meshopt, error 0,01 — 102k → 84k tris, o modelo não deixa cair mais), `lift` clareia a textura base
(`sharp.modulate brightness 1,45`: o original é musgo escuro), redimensiona, webp q82, draco.
`node scripts/compress-model.mjs in.glb out.glb 0.3 1024 82 1.45`. A CLI `optimize` não aceita
qualidade de webp nem aplicou a simplificação, e `unlit` deixou o MR — por isso o script.
`IslandModel` em DeviceScenery.tsx substitui as ilhas torneadas. Ana reclamou (2026-10-15) que as
árvores invadiam o notebook e que as cores estavam "mortas" (mandou o render de referência: verde vivo,
cachoeiras brancas, nuvens rosa). Soluções:
- **Mapa de altura + busca de pouso**: no `useMemo`, max-y por célula (44×44) a partir dos vértices
  (raycast seria lento com 84k tris); busca 24 rotações × 11×11 pontos de pouso minimizando `poke`
  (amostras acima de chão+6% da altura dentro da pegada do aparelho), `front` (idem numa faixa à frente —
  as árvores vão para trás), `miss` (até 12 amostras fora da ilha, beirada) e a variação. "Chão" = percentil
  25 das alturas na pegada (antes era o máximo e o aparelho flutuava sobre as copas). Fallback: percentil
  30 da ilha inteira.
- **Clareira esculpida**: a ilha não tem clareira do tamanho do MacBook, então os vértices dentro da pegada
  (+ margem 35% com smoothstep) são pressionados até o nível de pouso e as normais recalculadas.
  `footprint` por aparelho: iPhone 0,3×0,22, MacBook 0,8×0,7 (um pouco menor que o real: beirada pode sobrar).
- **Cores**: textura com `sat 1.9` + `lift 1.2` no script (7º arg = saturação), e a ilha é **iluminada**
  (`MeshStandardMaterial`, roughness 0,95) — hemisphere azul-céu 1,9 + sol quente 3,2 + rim rosa 0,5 em
  Devices.tsx (uma key rosa deixava tudo marrom). O fresnel rosado e a dissolução de baixo continuam via
  `onBeforeCompile` (fade entre 55% e 92% da altura: as cachoeiras viravam colunas brancas).
- Suculentas saíram da página (pedido da Ana). `[island]` no console (DEV) mostra rot/pouso/score.
- **Bug de sinal (2026-10-15, "tudo desencaixado")**: busca e escultura mapeiam ponto do aparelho → ilha
  com rotação 2D padrão por −rot em (x, z), que é o `Ry(+rot)` do three; a ilha precisa ser renderizada
  com `rotation.y = −rot`. Com +rot a clareira ficava do outro lado: aparelhos flutuando e terreno de lado.
- Sonda DEV `[island fit]`: 500 ms após montar, raios no mundo a partir do centro e 4 cantos da pegada;
  imprime a folga até o terreno. Tem que dar ~0 em tudo. Exigir `miss === 0` (pegada inteira sobre a ilha)
  e ilhas menores (iPhone `pr·2,2`, MacBook `lr·2,4`, pegada 0,88×0,62) — maiores elas se fundiam.

## Projetos — cenário, quarta versão (2026-10-15): ilha intacta ao fundo
Ana achou as ilhas esculpidas sob cada aparelho "completamente horríveis". Lição: **não deformar o modelo
dela** para caber um aparelho (`IslandModel` com mapa de altura/busca/escultura foi apagado). Composição nova
em `DeviceScenery.tsx`, seguindo o render de referência que ela mandou:
- `HeroIsland`: uma ilha só, intacta, entre os aparelhos e bem atrás (desktop x −0,16, y −0,2, z −3, largura
  1,3; narrow x 0,05, z −3, largura 1,5), `MeshStandardMaterial` iluminado, base dissolvendo (`onBeforeCompile`,
  alpha por y no mundo) no mar de nuvens, girando devagar (±0,35 rad) e flutuando.
- `CloudSea`: nuvens rosa/pêssego/lilás (ethereal, `opacity 0,95`, tons — brancas estouravam no bloom) atrás
  e abaixo da ilha, derivando. `cloudGroup` escala o raio dos puffs pela largura.
- `Cushion`: cada aparelho apoiado numa almofada de nuvem; o topo do bbox é alinhado logo abaixo da base do
  aparelho (senão a nuvem engolia a base do notebook).
- `Glow`: sprites de brilho quente (pôr do sol) e lilás atrás da ilha. Lírios na almofada do MacBook. Vagalumes.
- Luzes (só a ilha é iluminada): hemisfério céu, sol quente de frente, contraluz pêssego de trás. Bloom 0,45/0,82.
- Aparelhos nas laterais (desktop iPhone −0,98, MacBook 0,66, z 0,1) para a ilha aparecer no meio.
- **Enquadramento**: o canvas é a página; `Rig` mede o `.page-head` e usa `camera.setViewOffset` para descer a
  imagem metade da altura do cabeçalho — a cena fica centrada no espaço livre abaixo do título em qualquer
  altura de tela — e recua por `0,7 / (fração livre)`. Página de Projetos = 100svh no desktop, 112svh no narrow.
- Ilha recomprimida com `lift 1,3 sat 1,3` (a 1,9 ficava artificial).

## Projetos — quinta versão (2026-10-15): aparelhos EM CIMA das ilhas + nuvem da Ana
Ana: "eu queria eles em cima das ilhas sim e use essa nuvem" (`cloud_test.glb` → `public/models/cloud.glb`,
400 planos cruzados com textura de fumaça em alpha). `HeroIsland`/`Cushion`/`CloudSea` de esferas saíram.
- `DeviceIsland`: uma ilha **intacta** por aparelho (nunca esculpir — Ana odiou). Mapa de altura (max por
  célula, 48², buracos preenchidos por vizinhos) → busca 24 giros × 13² pontos minimizando irregularidade
  da copa sob a pegada (max − p25) + o que fica à frente do aparelho acima do max (árvores para trás);
  `miss ≤ 2`. A ilha sobe até o max ficar 4 mm abaixo da base do aparelho: **nada atravessa a tela**.
  Rotação renderizada = −rot (mesma convenção da versão anterior). Base dissolve (`fade 0,7`).
- `Cloud`: o modelo da Ana, `MeshBasicMaterial` com o mapa dela (alpha), cor tingida, `depthWrite false`,
  `renderOrder 2`, normalizado por largura; `top` alinha a borda de cima. Ninhos (`squash 0,4`) em cima de
  cada ilha preenchem o vão entre copa e aparelho (MacBook: irregularidade ~0,44); mar de nuvens embaixo.
- Enquadramento: cena mais alta (ilhas embaixo dos aparelhos) → câmera mira y −0,34, recua por
  `0,98 / fração livre`, view offset = 0,42 × altura do cabeçalho. Narrow: página 125svh, câmera z 7,8.

## Contato — mural de recados (2026-10-15)
Ana escolheu "mural de recados" entre 12 ideias ilustradas (recusou varal, estufa, mesa de luz, caderno,
exposição, globo de neve, celular-como-tela, carta lacrada, telefone de disco, garrafa, pombo, lanternas…).
`Contact.tsx`: `.mural` = cortiça da **foto que a Ana mandou** (`src/assets/contact/cork.webp`, 540×360
espelhada num tile 2×2 de 1024² para repetir sem emenda; `background-size 640px`; vinheta por cima) com moldura de madeira,
fonte Nanum Pen Script. Itens absolutos em % (desktop) e fluxo flex no narrow (`position: relative`
forçado): post-it de intro, polaroid (`about/ana.webp`, washi), postal `lily-pink`, e-mail em tira rasgada
(`clip-path` serrilhado; clique copia + mailto), redes como etiquetas de papel (`--tint` por rede), bloco
de notas pautado (inputs transparentes sobre linhas). Tudo `framer-motion drag` com `dragConstraints` no
mural; `whileHover` levanta. Enviar: cria um post-it rosa (`.mu-sent`) que voa para x 32–38 %, y 52–60 %
(o espaço livre entre bloco e etiquetas), e 900 ms depois abre `mailto:` (sem backend). Alfinetes =
`about/heart.webp`. Strings `mu_*` no i18n.
Espaçamento (Ana, 2026-10-15: "mal espaçado, grudado nas bordas"): margem de segurança ≥ 7 % em
volta, grade solta (linha de cima: post-it 7 %, polaroid 32 %, e-mail 52 %, postal right 7 %; linha de
baixo: bloco 7 %/42 %, etiquetas 54/76 % × 46/69 %), e o mural tem largura máxima 1380 px centrada
(`--mw`/`margin-left: calc((100% − mw)/2)`) — papéis têm tamanho fixo, num mural enorme amontoavam no canto.

## Projetos — sexta versão (2026-10-15): a lagoa de nenúfares, com os modelos da Ana
Ana escolheu "lagoa de nenúfares" entre 12 ideias e fez dois modelos no Meshy a partir dos prompts que
eu passei: `pond.glb` (jardim flutuante: borda de pedras/musgo pastel, água parada; 1,9 de largura,
superfície da água em y 0,13 dentro de r ≈ 0,55, borda até 0,43 — perfil medido por anéis) e
`lilypad.glb` (prato de vitória-régia menta: 1,9 de largura, topo plano em y 0,03, borda 0,07). Ambos
pelo `compress-model.mjs` (671 KB / 107 KB). As ilhas/nuvens anteriores foram apagadas de vez.
`DeviceScenery.tsx`: `Pond` (escala 4/1,9) + `Water` = círculo com `MeshReflectorMaterial` (drei) em
`WATER_Y + 0,004` dentro de `WATER_R` — espelho azul-marinho com blur, reflete aparelhos, folhas e
lírios — e ondas (`ringGeometry` escalando e sumindo em 1,8 s) onde o ponteiro passa (`onPointerMove`
com throttle 160 ms). `Pad` por aparelho + 1–2 pads pequenos com os lírios (`GlbProp`), todos flutuando
(bob + leve inclinação). `LAYOUT` exportado (desktop/narrow: x, z, largura do pad) e `padTopY(pad)` —
Devices.tsx lê daí a posição dos aparelhos (centro = topo do pad + metade da altura). Luzes: domo frio,
lua quente atrás-direita, rosa na frente. Câmera: desktop `[0, 1,35·fit, 3,1·fit]` mirando y 0,32;
narrow `[0, 5, 4,9]` (de cima, senão o celular cobria o notebook; iPhone em x −0,28 — em −0,52 saía pela borda). Lua = `Glow` sprite.
Ajustes pedidos pela Ana (2026-10-15): (1) folhas cortavam a água → `padBaseY(pad)` = água + 0,004 +
fundo côncavo do modelo (0,09/1,9 × largura) + 0,006, boiam por cima; (2) aparelhos pequenos/longe →
câmera `[0, 1,0·fit, 2,1·fit]`, `fit = max(1, 1,45/aspect, 0,7/livre)`, view offset 0,5 × cabeçalho;
(3) mais ambiente → `pads` vazios extras, 3 pads de lírios, `Fireflies` (sprites quentes/menta/rosa
orbitando, bloom pega), `Mist` baixa na borda; (4) água cristalina → reflector `#9fe0e4`, blur [90,30],
roughness 0,35, mirror 0,6, `transparent opacity 0,78` (o fundo da lagoa aparece).
Depois (mesmo dia): vagalumes menores (0,032) e lentos; **lírios (`lilies.glb`) removidos** da lagoa
("feio e sem sentido"); pad do MacBook 1,7 (os cantos — meia diagonal 0,6 — ficam no centro plano; com 1,36
a borda côncava atravessava a base e aparecia como faixas verdes no teclado); título "Projetos" pequeno
(`clamp(30px, 3.4vw, 46px)`) e sem legenda; `Mist` removida (lia como uma faixa branca sobre a água);
câmera `[0, 1,25·fit, 2,7·fit]`, `fit = max(1, 1,45/aspect, 0,8/livre)`, mira y 0,3.
Depois: pad do MacBook 1,45 (desktop) / 1,4 (narrow) — 1,7 era "muito grande"; meia diagonal 0,6 ainda
cabe no centro plano (0,84 × 0,725 = 0,61). Ondas no ponteiro removidas a pedido: `Water` é um espelho parado.
Depois (Ana: "a folha ainda entra no note; o reflexo desliga do nada"): (1) `usePadSurfaceY(pad, r)` mede
na geometria real o ponto mais alto da folha num raio `r` (meia diagonal do aparelho: MacBook 0,61,
iPhone 0,09) e a base do aparelho fica 4 mm acima — o topo não é plano (bojo no centro, depressão, borda
côncava), a estimativa `PAD_TOP` ficava baixa; as folhas sob aparelhos são `still` (sem balanço/inclinação,
o aparelho não acompanhava). O hook usa `useGLTF`, então vive em `Stage`, dentro do Suspense do Canvas
(fora, suspenderia o site inteiro). (2) Reflector com `depthScale 0`: o fade por profundidade apagava o
reflexo em certos ângulos de câmera.

## Projetos — telas DENTRO dos aparelhos (2026-10-15)
Ana: "quando clico nos aparelhos é para visualizar as coisas no próprio modelo deles, sem aparecer a
versão ilustrada" — o `DeviceDock` em CSS (celular/notebook desenhados) foi aposentado; sobrou nele só o
botão `.dv-exit` e o componente `Screen` (lista → viewer), que agora é renderizado **na tela do modelo 3D**
com `drei/Html transform`, dentro do grupo de cada aparelho em `Devices.tsx`:
- **Escala**: com `transform`, 1 px de DOM = `distanceFactor/400` unidades de mundo → `dfFor(larguraMundo, px)`.
  Celular: display de 5,95×14,23 cm do modelo × 0,01 × escala 3,1 = 0,184×0,441, em z 0,361×0,031 (+0,002);
  DOM 390×933 (`PHONE_DOM`), cantos 44 px. MacBook: `LAP_SCREEN` = centro da tela no frame do grupo
  `[0, 0.023, −0.353]` com rotação `[tilt, 0, 0]` (dobradiça → tampa via escala 2,8 e offset `[0,−0.27,0.06]`);
  DOM 1100×684 no desktop e **640×398 em telas estreitas** (`LAP_DOM_NARROW`, lista em 1 coluna) para o
  texto não virar pó numa tela de celular.
- **Contexto**: o `Html` do drei monta um React root próprio — `useI18n()` lá dentro devolvia o default e a
  tela mostrava "pj_list" cru. Solução: capturar `useI18n()` no componente do aparelho (dentro do Canvas o
  R3F faz a ponte) e re-prover com `I18nContext.Provider` (exportado de `i18n.tsx`) em volta do `Screen`.
- **Câmera** (`Rig`): a distância do close-up é calculada pelo fov e pela proporção **visível** (`visH =
  min(canvas, innerHeight)` — em telas estreitas o canvas tem 125svh) para o display encher ~86–90 % do
  que se vê; o celular de frente (+z), o MacBook ao longo da normal da tampa (0, .351, .936).
  **Armadilha**: `Html transform` ignora `setViewOffset` — com offset, a tela em DOM escorregava do modelo.
  Por isso dentro de um aparelho o offset é 0 e, para centrar no trecho visível do canvas alto, câmera E alvo
  deslizam juntos para baixo no espaço da vista (`slide(d)`).
- O título "Projetos"/"voltar para a mesa" some (`.page.projects.in-device .page-head`, opacity + visibility)
  enquanto um aparelho está aberto; a nav fica.
- Verificação: no pane estreito, clique real funciona; com viewport emulado maior os cliques por coordenada
  não acertam o canvas — disparar `pointermove/pointerdown/pointerup/click` sintéticos no `<canvas>` com
  `clientX/Y` (o R3F precisa do pointerdown antes do click).

## Projetos — a água (2026-10-15): three.js Water + RippleDistortion
Ana: "coloque esse efeito na água" (React Bits `RippleDistortion`, ogl) "e faça a água assim"
(nhtoby311/WaterSurface — `WaterSurfaceSimple` = `three/examples/jsm/objects/Water`). O `MeshReflectorMaterial`
saiu; `src/components/RippleWater.tsx` faz as duas coisas sem dependência nova (nada de ogl nem
`@funtech-inc/use-shader-fx`):
- **Água** = `Water` do three (reflexo planar da cena renderizado em `onBeforeRender` com câmera espelhada,
  normal map fluindo em 4 camadas, especular do sol, cor da água por Fresnel). O normal map é **gerado em
  runtime** (`makeWaterNormals`: fBm de value noise periódico 256², normais por diferenças finitas,
  `DataTexture` RepeatWrapping) — sem baixar o `waternormals.jpg`. Parâmetros no nosso tamanho (lagoa com 4
  de largura): `size` 60 (≈3 tiles), `distortionScale` 0,035 (o padrão 20 é para oceanos de 10 000), tempo
  × 0,35, `rf0` virou uniform `uReflect` (0,5). Cor `#5fc9cf`, sol `#ffe6cc` na direção da luz principal.
- **Ondulações** = porte fiel do RippleDistortion: quads instanciados (`InstancedBufferGeometry`, até 100)
  com o mesmo brush (gaussiana × anéis `cos`, opacidade², blend aditivo) acumulando num render target 512²
  (`WebGLRenderTarget`, câmera ortográfica, pintado em `useFrame` antes do composer); mesmas curvas de
  crescimento (`1−e^(−dt·1,09)`) e decaimento (`e^(−dt·ln500/fade)`). O ponteiro chega pelo raycast do R3F
  no mesh da água (`onPointerMove/onPointerDown` → `e.uv`; `spacing`/`brushSize` em unidades de mundo). O
  fragment do Water foi **patchado por string** (`patchShaders`): `push = (sin θ, cos θ)·amount·strength`
  com `θ = amount·swirl·2π` somado à distorção do reflexo, dispersão cromática (3 amostras do espelho),
  tint (`#f2a0b4`, 0,25) e glint (sheen nos ombros, igual ao original), e o gradiente do campo também
  inclina a normal (especular do sol reage). Trigger `both`.
- **Armadilha que custou uma hora**: o `pond.glb` tem a própria água, um plano chato em **y 0,284 mundo
  = 0,135·POND_SC** (medido pelos vértices; o `0,13` anterior era estimativa) — a minha água ficava 6 mm
  ABAIXO dela e aparecia só o azul-marinho opaco do modelo. `WATER_Y = 0,135·POND_SC` (+0,004) e
  `WATER_R = 0,64·POND_SC` (o plano do modelo vai até r ≈ 1,3). Provavelmente era isso o "reflexo desliga do
  nada" do reflector, não o `depthScale`.
- Descarte de recursos **adiado** (`setTimeout 0` no cleanup): o StrictMode monta→desmonta→remonta com o mesmo
  `useMemo`, e `dispose()` síncrono na textura do espelho deixava o framebuffer do Water apontando para
  textura apagada.
- Debug útil: o canvas não tem `preserveDrawingBuffer`, mas `drawImage(canvas)` num canvas 2D dentro de um
  `requestAnimationFrame` duplo (depois do render do R3F) captura o frame; retornar `toDataURL` > 60 k chars
  faz a ferramenta salvar em arquivo → `base64 -d`. Para ler o espelho: `gl.properties.get(tex).__webglTexture`
  num framebuffer temporário + `readPixels`.

## Projetos — a tela "dentro" do aparelho (2026-10-15, mesma noite)
Ana: "essa tela tem que parecer que realmente está dentro dos aparelhos; a animação não pode vir por cima e
ela tem que ter um shader realista". O DOM continua um `Html transform` (precisa ser DOM por causa do iframe do
Figma), mas `DeviceScreen` (Devices.tsx) o trata como um painel do aparelho:
- **Liga depois que a câmera chega**: monta junto com `active` (para o transform já estar certo) mas com
  `.dv3` apagado (opacity 0, `brightness(.15) blur(5px) scale(.975)`) — o wallpaper 3D da tela aparece
  enquanto a câmera voa — e 700 ms depois recebe `.lit` e acende (transição de ~0,9 s). Esc apaga.
- **Vidro** (`.dv3-glass`, por cima do conteúdo): reflexo diagonal, **brilho que segue o ponteiro**
  (`--gx/--gy` setados por `pointermove` na janela), vinheta e sombra interna do bisel; `::after` com listras
  RGB de subpixel + scanlines em `mix-blend-mode: overlay` a **opacity .14** (a .42 pareciam listras coloridas
  sujas). O conteúdo leva `saturate(.94) contrast(.98)` para não parecer uma página web chapada.
- A nav do site some em `body.in-device` (classe posta por Projects.tsx) — ela ficava sobre a tela do MacBook.

## Água — recorte do próprio modelo + vidro da tela mais leve (2026-10-15, à noite)
Ana: "ficou com essa borda" (o disco da água aparecia sobre o plano escuro do modelo, que não é redondo) e "o
efeito da tela ficou muito forte; bem fraquinho, só iluminação realista".
- `usePondWaterGeometry` (DeviceScenery.tsx) **recorta a água do próprio `pond.glb`**: triângulos cujos 3
  vértices estão na faixa [0,129, 0,137] local (a água do Meshy não é plana: TOL ±0,002 pegava só 191 lascas
  na margem; a faixa dá ~2000 faces) **e** com normal quase vertical (|n.y| > 0,9, para excluir as encostas).
  Resultado no plano **xy** (como a CircleGeometry: Water assume plano xy virado para +z e rotação x −90° —
  uma geometria em xz sem rotação dá normal de espelho errada e nada aparece), escala de mundo, uv quadrado
  pelo bbox (ondulações redondas), `extent` = largura (para `brushSize`/`spacing`). `side: DoubleSide`.
- A água fica **dentro do grupo da lagoa que balança** (`<Pond><Water/></Pond>`): antes a lagoa subia 12 mm e
  cobria a água, que ficava 4 mm acima só na média.
- Vidro da tela (`.dv3-glass`): só iluminação — brilho fraco seguindo o ponteiro (.07), reflexo diagonal (.035),
  vinheta leve (.22) e sombra interna; **sem** grade de subpixel/scanlines e sem filtro no conteúdo.

## Lagoa em "argila macia" + tela sem brilho que segue o mouse (2026-10-15, à noite)
Ana: "tire a luz que segue o mouse no aparelho" → `.dv3-glass` ficou só com o reflexo diagonal + vinheta +
sombra do bisel (sem `--gx/--gy`, sem listener de `pointermove` em `DeviceScreen`).
Ana: "coloque um shader mais bonito na lagoa, de maneira que não dê para ver que ele está mal feito" →
`src/components/ClayMaterial.ts` (`makeClay({ map })`), aplicado aos meshes do `pond.glb` em `Pond`:
mantém a textura do Meshy, mas a luz **perdoa a geometria**: diffuse wrap (`N·L·0,5+0,5`, smoothstep, sem
terminador), hemisfério lilás/ameixa em vez de sombra preta, sheen largo de barro (Blinn exp 14 × 0,14),
fresnel rosa nas silhuetas (0,32), grading pastel (`pastel 0,45`: mistura com giz = dessatura 20 %, ×0,82
+0,16; depois `saturation 1,22`) e grão 4,5 %. Baixo contraste + gradientes lisos = os calombos e facetas
viram "esculpido em argila" em vez de erro. As folhas (`lilypad.glb`) continuam `MeshStandardMaterial`.
Primeira versão (hemi 0,85/key 0,75, pastel 0,55) parecia chantilly — clareou demais; valores acima são os
que ficaram.

Título de Projetos (2026-10-15, à noite): Ana pediu de volta um título grande que ocupe o bloco —
`clamp(54px, 7.5vw, 118px)` (o `clamp(30px, 3.4vw, 46px)` "pequeno" durou um dia); a câmera mede o cabeçalho
e recua, então a lagoa continua inteira abaixo dele.

Lagoa com o **painterly do site** (2026-10-15, à noite, "aplique o shader painterly para ver"): `POND_SHADER` em
DeviceScenery.tsx alterna `'painterly'` (usePainterly com os parâmetros da mesa + `useOutline` 0,0024/POND_SC em
tinta) e `'clay'` (ClayMaterial). Está em `painterly` para a Ana comparar; ela decide qual fica.

Ana escolheu o **painterly** para a lagoa ("gostei mais, mas deixa mais sutil"): `bands 5, paint 0,05, patch 0,05,
patchVar 0,05, spec 0,1, rimStrength 0,3`, contorno `0,0013/POND_SC` (metade da mesa). O clay fica disponível em
`POND_SHADER = 'clay'`.

Folhas (`lilypad.glb`) com o mesmo painterly (`POND_PAINT`, DoubleSide) + contorno (Ana, 2026-10-15). **Armadilha**: a
largura do `useOutline` é constante em tela (Outline.tsx) — dividir pela escala do modelo, como fiz primeiro,
deu 0,009 nas folhas pequenas e a casca de tinta engoliu as folhas (discos pretos). Usar o valor direto: 0,0011
na lagoa e nas folhas.

Botão "voltar aos aparelhos" (`.dv-exit`) no **canto superior esquerdo** (`left clamp(20px,4vw,48px)`, `top 30px`),
onde fica o logo da nav quando nenhum aparelho está aberto (Ana, 2026-10-15: estava embaixo, sobre a base do MacBook).
Wallpaper dos aparelhos: as flores foggy (`wipe.jpg`) duraram minutos — Ana pediu algo "mais harmônico com a cena":
`wallpaperCanvas` desenha a noite da lagoa (navy → verde-água, lua creme, folhas menta difusas, névoa rosa, estrelas).

## Céu azul/verde-água e aparelhos na mesma luz (2026-10-15, à noite)
- Ana: "ao invés desse roxo coloque azul, verde água" → os `Glow` do céu: lua creme (`rgba(255,236,220)` →
  `rgba(170,200,215,.28)`) e a névoa da esquerda em verde-água/azul (`rgba(120,205,210,.34)` → `rgba(80,140,200,.1)`);
  o lilás saiu.
- Ana: "os aparelhos parecem muito deslocados com o resto, aplique um shader" → `useFlatTextured` (Devices.tsx)
  agora dá aos aparelhos o **ClayMaterial** com a textura deles (`pastel 0,3, saturation 1,08, rim 0,3, sheen 0,22`,
  mesma `keyDir`/`keyColor` do painterly da lagoa, DoubleSide). Sem bandas/patches, então o alumínio não vira
  mosaico (o problema de 2026-10-02 com o painterly); sombra lilás + rim rosa + leve pastel = a mesma noite pintada.
  As telas (canvas do iPhone, plano do MacBook, DOM) continuam unlit.
- **Armadilha**: os GLBs otimizados com `unlit` **não têm normais de vértice**; com o shader iluminado,
  `normalize(vec3(0))` = NaN e **o Bloom espalhou o NaN pelo frame inteiro — canvas preto, sem erro no console**.
  `useFlatTextured` chama `computeVertexNormals()` quando falta `normal`, e o ClayMaterial normaliza com guarda.


Tela DOM do iPhone ajustada ao bbox real do mesh `MobilePhone_Phone_Emission_0` (centro, largura, altura, z) em vez do
retângulo estimado — `fit` em PhoneDevice (Ana, 2026-10-15: "a tela não está encaixando"). Se cobrir bisel demais, encolher
`fit.w/h` por um fator (ex. 0,96).

## Protótipos reais — como mostrar (2026-10-16)
Os protótipos da Ana são links web **privados** (trabalho interno), então nada de embed público. Decisão: **vídeo
curto de gravação de tela** (mudo, loop, `playsInline`) dentro do aparelho + telas como apoio/capa. `Proto` ganhou
`video`, `cover` (thumb na lista) e `internal` (etiqueta "projeto interno" no lugar do link do Figma); `Screen`
(DeviceDock.tsx) toca o `video` no topo do `.dv-shots` e lista os `shots` abaixo. Arquivos vão em `src/assets/protos`
(importar com `?url` ou glob). Mobile já tem as entradas **Bora?** e **Bridge** (descrição provisória, `internal`);
web continua placeholder até ela listar.

## Contato — cartão de visita 3D (2026-10-16)
Ana desistiu do mural de recados ("fica muito bagunçado") e, entre seis ideias limpas (editorial, pedrinha na
lagoa, lírio, cartão, constelação, fichário), escolheu o **cartão de visita**, "bem bonito e realista, com sombras,
reflexo etc.". `src/components/ContactCard.tsx` + `Contact.tsx`:
- **Cartão**: `ExtrudeGeometry` de retângulo arredondado (1,0 × 0,58 × 0,012, bisel 1,5 mm) em `MeshPhysicalMaterial`
  creme (clearcoat 0,35, sheen) + duas faces impressas = planos com `CanvasTexture` 2000×1160 (Butler via
  `document.fonts.load`, grão de papel por speckles, `alphaMap` de cantos arredondados, `roughnessMap` de ruído).
  Frente: nome, cargo, e-mail, marca de lírio; verso: redes com ↗, "São Paulo · BR", "ou escreve um recado aqui embaixo".
- **Coração de vidro** em relevo (`THREE.Shape` de coração extrudado, `transmission 1`, ior 1,5, atenuação rosa).
- **Luz**: `Environment` com `Lightformer`s (softbox creme, tira fria, rim rosa, anel sálvia) + direcional com sombra;
  **mesa** = plano com `MeshReflectorMaterial` (reflexo borrado, `color #08090d`, `envMapIntensity 0`) + `ContactShadows`;
  **`<fog>` na cor da página (1,6→4,2)** dissolve o horizonte da mesa — sem fog aparecia uma faixa cinza com linha reta.
- **Interação**: flutua, inclina para o ponteiro (listener global), **vira no clique** (damp até π); zonas de clique
  invisíveis: e-mail na frente (copia + "copiado ✓" no `.cc-hint`), redes no verso (`window.open`). Formulário editorial
  `.cc-form` embaixo (nome/e-mail/mensagem, `mailto:`). Canvas transparente (`alpha: true`), sem composer.
- O painel de ideias era `public/ideias-contato.html` (apagado). O CSS/i18n `mu-*`/`mu_*` do mural ficou no código sem
  uso — limpar quando o cartão estiver aprovado.

## Etiquetas de papel dos aparelhos (2026-10-20)
Ana: "a tag está muito longe do celular; e têm que ser clicáveis". Posições (frame do grupo de cada aparelho):
iPhone `[0, 0.265, 0.06]` (topo do celular em 0,2275; um pouco à frente para a câmera alta do narrow não a ver
sobre o vidro); MacBook `[0, 0.335, −0.455]` = **presa à borda superior da tampa** (centro da tela 0,023/−0,353 +
meia tampa 0,3 ao longo da inclinação → 0,304/−0,458) — acima/à frente ela caía sobre a tela no ângulo de cima.
As etiquetas são `<button>` dentro de `drei/Html` (`pointerEvents: auto` no botão, `none` no wrapper) e **funcionam**:
`button.click()` e a sequência pointerdown/up/click sintética abrem o modo. Armadilha de teste: quando o pane está
em DPR 1,75, o frame do screenshot (800×1325) não é CSS px (457×757) — o clique por coordenada caía fora da tela;
medir com `getBoundingClientRect` e clicar em CSS px.

## Cartão com as artes da Ana (2026-10-20)
Ana: "está muito simples e feio; queria algo com artes" + 5 fotos (caderno com olhos/lírio/adaga/ramo de corações e
brilhos; pintura de martini; pintura de retrato com estrela; "hit ya with the punchlines"; retrato a lápis). O PDF
escaneado dela ficou no container do pasteboard do macOS (`Library/Group Containers/…useractivityd…`) — **EPERM, não
dá para ler dali**; pedir para ela salvar em Downloads/no projeto.
- `scripts/clean-art.py <in> <out>` (Pillow só, sem numpy): **lápis → tinta com alpha**: flat-field aditivo
  (`L − blur(60) + 200`) tira tom do papel/sombra; alpha = `(moda − 8 − v)/span` com gamma 0,7 (o percentil como
  "branco" deixava 16 % de cinza sobre tudo); recorte por frações da foto; `trim_alpha`. Pinturas: flat-field por canal
  (blur 260) + autocontrast — a faixa de sombra dura do martini só some em parte.
- Saída em `src/assets/card/*.webp` (ink q90 com alpha; pinturas q84). `punchlines` e `portrait-sketch` foram
  limpos mas **não entraram** no cartão (não cabem) — candidatos para outra página.
- Composição (canvas 2000×1160, `place`/`print` em ContactCard.tsx): **frente** = lírio grande à direita (cx 1560,
  1000×1040, alpha .92), cargo em duas linhas para não passar por baixo dele; **verso** = olhos no topo-direita,
  adaga na borda direita, martini e retrato como duas fotos impressas com borda branca e sombra, ramo de corações
  fraco no canto inferior esquerdo, "ou escreve um recado" embaixo à direita. Zonas de clique das redes só sobre a
  palavra (0,3 de largura) — mais largas, o clique no verso abria o GitHub em vez de virar.

Ana (2026-10-20): "adorei a flor; deixe só os desenhos de papel, tire os coloridos, aumente" → pinturas saíram do
cartão (e de `src/assets/card`); verso = olhos 1250×520 em (1345, 285) — borda esquerda ≈ 720, livre da coluna de
links —, adaga 330×1100 na borda direita, ramo 900×380 no lugar das fotos; lírio da frente 1080×1100.

Ana (2026-10-20): "tire os desenhos atrás e faça o redesign para ficar mais impactante; eu não tenho ArtStation" →
**verso duplex**: tinta ameixa (`#24202d→#15121a`, grão, poça de luz rosa no topo-direita) com "Vamos conversar?" /
"Let's talk?" em Butler 300 px em duas linhas + ponto rosa, e as redes (Instagram, LinkedIn, GitHub) numa linha no
rodapé com seta rosa logo após cada palavra (medir a largura ANTES de trocar a fonte para a seta). Zonas de clique
na linha: `x = −((slot + 260)/2000 − 0,5)`, `y −0,19`, 0,27×0,07. ArtStation saiu de `contact.links`. Só o lírio
ficou em `src/assets/card` (olhos/adaga/ramo apagados; o script `clean-art.py` regenera se precisar).

## Cartão maior + documento de estética (2026-10-20)
Ana: "ainda está extremamente pequeno" → `FitCamera` em ContactCard.tsx calcula a distância pela fov e pela proporção
do palco para o cartão ocupar ~72 % da largura ou ~70 % da altura; `.cc-stage` clamp(440px, 76vh, 900px); a névoa
da mesa agora é `scene.fog = Fog(bg, 0,85·d, 2,1·d)` (valores fixos escureciam o cartão no celular, onde d é maior).
Ana: "a parte de trás ficou legal mas não gostei da estética, não está seguindo a minha; faça um documento da
minha estética com imagens para eu aprovar" → `docs/estetica/` (seções: três palavras, suas artes, cor, tipografia,
materiais, aprovado × recusado, três propostas de verso em papel creme sem desenhos). O verso ameixa continua no
código até ela escolher A, B ou C.

Ana (2026-10-20): "não gostei das versões dos cartões (A/B/C), não use esse brilho, está feio; tira o coração do cartão;
me dê várias opções do verso" → coração de vidro **removido do ContactCard** (mesh, geometria e `heartShape`); o recorte
do brilho de quatro pontas foi apagado e **não deve ser usado**; `docs/estetica/verso.html` = 9 opções de verso em CSS
(postal, monograma em relevo seco, foil sálvia, papel duplex sálvia, lírio por transparência, índice editorial, renda
recortada, fita de cetim em fendas, ingresso com canhoto). O verso ameixa segue no código até ela escolher.

**Verso escolhido: foil sálvia (opção 03)** — Ana (2026-10-20): "gostei do foil sálvia, mas a iluminação ficou muito
forte; e o link das redes tem que ser maior". `backCanvas` = papel creme igual à frente + leve marca de pressão
onde fica o foil + redes em Butler ~116 px numa linha justificada (reduz até caber em 86 % da largura), seta teal,
linha fina acima. O **foil é um plano à parte** (`foilCanvas` = máscara branca do texto como `alphaMap`) com
`MeshPhysicalMaterial` sálvia `#9bb994`, `metalness 0,55`, `roughness 0,5`, `envMapIntensity 0,45` — brilho contido,
sem reflexo forte. As zonas de clique das redes são medidas enquanto o verso é desenhado (`boxes`), então seguem a
largura real de cada palavra. O verso ameixa foi apagado.

## Contato = conjunto de papelaria (2026-10-20)
Ana: "melhore o deixe um recado; o contato ficou muito simples, quero mais bonito". A página agora é cartão + carta +
envelope no mesmo papel creme e no mesmo foil sálvia:
- `src/components/LetterForm.tsx`: a carta (`.lt-paper`) — papel com grão (SVG feTurbulence), pauta sálvia e linha de
  margem rosa, "para Ana Julia" em Butler, "São Paulo, <data de hoje>" e o texto do visitante em Nanum Pen Script.
  "Selar e enviar": a carta dobra (scaleY 0,26 em torno do centro) para dentro do envelope aberto (forro rosa), a aba
  fecha (`rotateX` 180→0), o selo **"AJ" em sálvia** carimba (spring) e aparece "Carta selada. Abri seu app de
  e-mail…" com "escrever outra"; o `mailto:` abre aos 2,3 s. Envelope e confirmação são posicionados em `cqw`
  (`.lt-desk` é container): envelope 88 % de largura → 55cqw de altura, centrado; confirmação logo abaixo.
  **Não desativar os campos durante a dobra** (`disabled` tirava o foco e a página pulava para cima) — `readOnly` +
  `aria-disabled` no botão + guarda `phase !== 'write'`. Respeita `prefers-reduced-motion`.
- `Contact.tsx`: ao lado da carta, `.ct-intro` = "ou deixa um recado" / "Me escreve uma carta." (Butler grande) +
  texto curto + lista direta (e-mail que copia, redes, "São Paulo, Brasil"); o lírio dela invertido em tinta creme a 7 %
  atrás da seção (`.ct-lily`) e três brilhos radiais bem leves (teal, sálvia, rosa) em `.ct-glow`. Desktop ≥ 900 px:
  duas colunas `minmax(0,.85fr) minmax(0,1.15fr)` (sem `minmax(0,…)` o input longo estourava a carta). As strings
  `cc_note/cc_send/cc_sent` e o CSS `mu-*` ficaram sem uso.

## Carta via EmailJS + envelope legível + papel da Ana (2026-10-20)
- **Envio direto**: `src/api.ts` (`sendLetter`) usa `@emailjs/browser` (import dinâmico, só ao enviar) com
  `VITE_EMAILJS_SERVICE_ID / _TEMPLATE_ID / _PUBLIC_KEY` (`.env.local` e variáveis da Vercel; modelo em `.env.example`).
  Template usa `{{from_name}} {{reply_to}} {{message}} {{date}}` e deve ter "Reply To" = `{{reply_to}}`. Sem as três
  chaves → `not-configured` → fallback `mailto:` ("Quase lá."). Guardas: honeypot `company`, cooldown de 45 s por aba,
  limites de tamanho, regex de e-mail; erros mostram o e-mail direto. **No painel do EmailJS: restringir domínios e
  ligar reCAPTCHA** (a chave pública fica no navegador por design).
- **Envelope** (Ana: "ficou feio, não dá nem para ler"): a carta não se dobra mais; ela desce e some e a **frente do
  envelope** sobe, grande: remetente (nome à mão + e-mail), endereço "Ana Julia / São Paulo · Brasil", selo picotado
  só na borda (máscara = centro sólido + anel de furos) com o lírio dela, e o carimbo "ENVIADA dd/mm/aaaa" com ondas,
  que só carimba quando o envio terminou. Medidas em `cqw` (o envelope é container).
- **Papel**: o scan de papel aquarelado que ela mandou → `src/assets/contact/paper.webp` (tile espelhado 2×2,
  1042×1464, contraste comprimido para ficar claro). Na carta e no envelope: `multiply` com degradê creme; no cartão
  3D: `createPattern` no canvas das duas faces + degradê creme em `multiply` (`paperBase(g, w, h, paper)`).

Template do EmailJS (2026-10-20): `docs/emailjs-template.html` (HTML de e-mail em tabelas, estilos inline, Georgia/Arial —
clientes de e-mail não carregam a Butler; `{{message}}` com `white-space: pre-wrap` para manter as quebras de linha).
Configuração: Subject `Uma carta de {{from_name}}`, To Email = e-mail da Ana, From Name `Portfólio Ana Julia`,
Reply To `{{reply_to}}`.

Redes reais (2026-10-20): Instagram `instagram.com/anajuliaym`, LinkedIn `linkedin.com/in/ana-julia-yaguti-matilha-6a8412276`
(sem o `?isSelfProfile`); **GitHub saiu** a pedido dela. No verso do cartão as redes ficam lado a lado à esquerda
(espaço máx. 110 px) — justificadas, com duas, o LinkedIn ia para a ponta.

## Skills = máquina de pegar bichinho (2026-10-20)
Ana escolheu a "máquina de pelúcia" entre as ideias que reaproveitam os logos 3D (`docs/ideias-skills/modelos.html`) e
mandou `claw_machine_with_textures.glb` (Sketchfab), pedindo para mudar o visual externo.
- `scripts/prep-claw.mjs` → `public/models/claw.glb` (3 MB → 44 KB): **tira as 4 pelúcias e todas as texturas** (o atlas
  tinha personagens de terceiros e o letreiro "STAR CATCHER"), mantém os nós separados, draco; imprime as caixas de
  cada peça em coordenadas de mundo (cm: gabinete x −102…103, y −85…165, frente z ≈ 100). `scripts/inspect-model.mjs`
  e `dump-textures.mjs` = ajudantes de inspeção.
- `src/components/ClawMachine.tsx`: cada peça recolorida por nome (`COLORS`: gabinete sálvia, moldura creme, mesa rosa,
  trilhos/carrinho teal, metais cromados, piso feltro creme), vidro `MeshPhysical` 14 % sem contorno, contorno a tinta
  0,0011 no resto, letreiro "Skills · PEGUE UMA FERRAMENTA" num plano sobre a placa e o lírio dela na lateral direita.
  O carrinho (`clawbox` + cano + cabeça) vira um grupo que anda em x/z (`attach` preserva o transform); a cabeça (garra +
  ufo) desce em y e o cano estica (pivô no topo, `scale.y`). A garra "fecha" encolhendo 20 % em x/y.
- **Jogo**: o ponteiro sobre um plano invisível dentro do vidro mira; clique/espaço/botão "pegar" desce; pega o logo mais
  próximo sob a garra (88 %; 14 % de chance de escorregar na subida), leva ao fosso da frente-esquerda (`CHUTE`), solta,
  o logo cai e sai pela portinha (`DOOR`) girando; a etiqueta de papel (textura dela + coração) mostra área, nome,
  domínio em bolinhas e descrição; "pegar outra" devolve o logo ao fosso. Contador "N de 11" e "ver todas" (lista
  acessível que abre a etiqueta direto). Setas mexem a mira. Física própria (esferas R 18, 4 subpassos, paredes do
  fosso e da calha), sem biblioteca. Logos = `logoGeometry`/`logoMaterial` exportados de `SkillLogos.tsx` (a cena antiga
  continua no arquivo, sem uso).
- As descrições das ferramentas ainda são "Substitua: …" em `content.ts` — pedir os textos reais à Ana.

Vitrine da máquina (2026-10-20, Ana: "logos muito pequenos; display mais organizado para ver todos; a garra está solta"):
os logos não ficam mais numa pilha com física — cada um tem um `SLOTS` fixo, em pé e virado para o vidro (yaw 0,22 para a
câmera, que fica à direita), 42 cm de largura, em três níveis: 4 na prateleira do modelo (`table2`, topo y 59), 4 num
degrau creme que eu acrescentei (`STEP`, topo 22) e 3 no chão à frente; tudo deslocado `OX −13` para a coluna da direita
não sumir atrás da moldura. Estados por logo: `home → held → fall → won` (e `drop` para voltar ao lugar caindo com um
quiquinho). A garra **descansa 18 cm acima** do modelo (`LIFT`; cano encurta) — antes ela ficava abaixo do topo dos
logos da prateleira e não tinha como descer neles. O logo carregado encaixa o topo dentro das pinças e, quando sai da
prateleira, vem primeiro para a frente e depois para o lado (não atravessa os vizinhos). Primeira pegada sempre dá certo;
depois 90 %, com 12 % de escorregar a partir da segunda.

Corda da garra (2026-10-20, Ana: "a corda ainda não está acompanhando a garra"): o `pipes_low` do modelo é uma peça só
(cabo com gomos 114–133 + haste fina r 1,9 + colar r 6 embaixo); esticado com `scale.y`, a haste virava um fio claro
invisível e a garra parecia solta. O `pipes_low` é removido e um **cabo próprio** (`CABLE`: cilindro aberto r 2,2 com
pivô no topo, `CanvasTexture` de gomos como `map` + `bumpMap`) vai do carrinho (y 133) até 4 cm dentro do domo
(`domeTop` medido do grupo da cabeça); a cada frame `scale.y = comprimento` e `repeat.y = comprimento / 1,7` — os gomos
se repetem em vez de esticar.


## Skills — máquina realista, adesivos gastos, corações flutuando (2026-10-20)
A primeira ambientação (céu noturno da lagoa com lua, estrelas e névoas) foi **rejeitada**: "não gosto dessa estética de
universo, super brega". Não voltar a céu/estrelas/nebulosa aqui. Ana pediu "os corações e os brilhos flutuando", "um estilo
mais realista" e "adesivos realistas, com dobras, sujeira etc.".
- **Cenário** (`ClawScenery.tsx`): canto escuro neutro; chão `MeshReflectorMaterial` 30×30 `#07090c` que some na névoa
  (`FitCamera`: `Fog(bg, 1,1·d, 2,1·d)`; **`alphaMap` não funciona nesse material**); poça de luz quente no chão (`Spill`,
  aditiva); `Hearts` = os corações de vidro dela (`about/heart.webp`) flutuando na frente e atrás; `Glints` = pontinhos
  que piscam devagar (aditivos, o bloom pega). `.cw-stage` com `mask-image` em cima e embaixo. `ContactShadows` com
  `scale 6,5` e `far 0,5` (com `scale 4` a sombra enchia o plano e virava um quadrado de borda reta). `Glow.tsx` ficou
  como módulo próprio (Projetos usa; opção `backdrop` = aditivo, sem depth test, desenhado primeiro).
- **Realismo**: **sem contorno a tinta** na máquina; materiais `MeshPhysical` (pintura com verniz fino) / cromo `metalness 1`
  / feltro, todos com `addWear` (`Wear.ts`: ruído fBm periódico tri-planar em espaço de mundo — as UVs do modelo são um
  atlas — que varia a rugosidade e escurece um pouco, mais perto do chão; o vidro, opacity 0,06, só ganha manchas na
  rugosidade). Luz: spot quente de cima-frente com sombra 2048, hemisfério neutro fraco, preenchimento frio, contraluz
  quente; `Environment` de "sala" (painéis de teto, luminária quente à direita). Pós: `N8AO` (oclusão nos vincos) + Bloom
  0,4/0,9 + `ToneMapping` AgX. Letreiro = painel retroiluminado (emissive 0,55). A máquina gira `YAW −0,38` para mostrar
  a lateral (a mira continua certa: `toLocal` usa `worldToLocal`). Tubo de luz e luzes internas ficam **dentro** do grupo
  da máquina (em cm) — no mundo, o tubo ficou flutuando fora quando ela girou.
- **Adesivos** (`Stickers.tsx`, `SPOTS` em ClawMachine.tsx): cada um é posicionado por um raio (cm da máquina) na peça
  certa (`FRONT` = frente rosa, `SIDE` = lateral, `GLASS` = vidro) e orientado pela normal do triângulo atingido (as peças
  têm o próprio `raycast` desligado, então uso `THREE.Mesh.prototype.raycast.call`). Textura gerada em canvas: forma
  `die` (alpha borrado e limiarizado em baixa resolução — contorno de adesivo recortado), `rect` (margem branca) ou
  `circle`; envelhecimento (amarelado leve, manchas, sujeira na borda, digitais, arranhões que mostram o papel, lascas na
  borda), vincos (brilho + sombra + tinta rachada) em cor/rugosidade/bump; geometria com crista nos vincos, bolhas de ar
  e canto descolando (dobra em cilindro de raio 0,85·L; verso = papel branco). Amarelado forte (0,25 + 0,55·idade)
  deixava tudo marrom — ficou 0,1 + 0,3·idade. Imagens: gatinho, Ramune e peixinho (pôsteres do fliperama), moeda,
  coração de vidro, lírio, chaveiro e "punchlines" (no vidro).
- Depois (Ana: "coloque mais adesivos e a máquina tá de lado demais"): `YAW −0,16` (câmera x 0,12·d) e **19 adesivos**;
  novos alvos `LEDGE` (tampo do painel de controle, raio de cima) e `FRAME` (moldura creme). Mais pôsteres do fliperama
  (ramen, gato-caveira, carpas, Fuji, menina de bicicleta, rádio, miojo), o postal do coelho e a tela de título do
  Fragments. Cada adesivo sobe `i·0,03 cm` na normal para os sobrepostos não brigarem no z; os menores que 26 cm usam
  canvas de 512.
- Depois (Ana: "aumenta o tamanho da claw machine e tá muito morto o redor, traga vida"): o canto vazio virou **um canto
  do mesmo fliperama da página Jogos** (`ClawScenery.tsx`): parede de pastilhas sálvia (`/textures/mosaic.jpg`, 0,11 por
  pastilha, em `WALL_Z −1,75`), piso xadrez creme/sálvia com grime (o mesmo desenho do `Arcade.tsx`) no
  `MeshReflectorMaterial`, cinco pôsteres dela com fita, **varal de luzinhas** em duas curvas (lâmpadas `MeshBasic` HDR
  que piscam, o bloom pega; dois pointLights quentes lavam a parede), **coração de neon** rosa (curva paramétrica de
  coração em `TubeGeometry`, falha de vez em quando) à esquerda e duas lanternas de papel acesas. Os corações de vidro e os
  brilhos continuam. Máquina maior: `.cw-stage` `clamp(560px, 94vh, 1120px)`, ajuste 84 % da altura / 86 % da largura,
  máscara 6 %/94 %, névoa `1,35·d → 2,8·d`. Conferido em 1280×760 capturando o canvas por `drawImage` (a emulação do
  painel desenha mal).
- Parede (Ana, 2026-10-20: "troca os green tiles das skills para esse rosa", depois "intercala entre esses"): **azulejos
  esmaltados em relevo intercalados** — cada imagem em `src/assets/tiles/` é um azulejo (01 pétalas, 02 fada, 03 entrelace,
  04 rosa; fotos dela, recortadas para tirar o fundo branco dos cantos, 512²). `Wall` monta um bloco n×n em canvas com
  índice `(i + 2j) mod n` (vizinhos nunca iguais, nem na emenda da repetição), gera o bump pela luminância (`filter:
  grayscale blur contrast`) e repete o bloco; azulejo de 0,42 m, `MeshPhysical` roughness 0,32 + clearcoat 0,6. Para
  acrescentar um azulejo, basta pôr a imagem na pasta. (As imagens coladas no chat às vezes não chegam como arquivo;
  ela as salvou em Downloads.)
- **Cenário = página inteira** (Ana: "tire o header preto dos skills e faça esse cenário ser a página inteira, o título fica
  dentro dela"): `.page.skills .cw-stage { position: absolute; inset: 0 }` atrás do título e dos controles (como Projetos),
  sem máscara; `::after` escurece de leve o topo e a base para o título e os controles lerem sobre os azulejos; controles
  (`.cw-ui`) e a lista ficam absolutos embaixo. `FitCamera` mede o título: se o `h1` cabe ao lado da máquina (desktop),
  a máquina fica grande e centrada; se não (celular), ela encaixa entre o cabeçalho e os controles (`setViewOffset` desce a
  imagem; não há `Html transform` nesta cena, então o offset é seguro). Refaz a medida 700 ms depois (fonte/letras).
- Menus ilegíveis sobre os azulejos (Ana, 2026-10-20): o `mix-blend-mode: difference` da `.nav` vira cinza sobre rosa de
  tom médio. Em Skills (`body:has(.page.skills) .nav`) a nav fica sem blend, creme com sombra de texto e links a 0,82; o
  "voltar" idem; a sombra do topo da cena ficou mais forte (0,62 → 0 em 30 %). A lanterna da esquerda saiu de cima do logo.
- Enquadramento com o título (Ana, 2026-10-20: "nesse tamanho de tela a máquina já deveria ter aumentado" — 1126×687, o
  `h1` "Skills" enorme encostava na faixa da máquina e ela caía no modo celular, pequena embaixo do cabeçalho). Agora
  `FitCamera`: (1) se o título não encosta, nada; (2) se encosta mas há espaço à direita dele, a máquina **continua grande
  e desliza para a direita** (`setViewOffset` com x = −(centro desejado − W/2)); (3) só quando nem assim cabe (celular), ela
  encaixa entre o cabeçalho e os controles. Mira e etiquetas `Html` seguem o offset (os dois usam a projeção da câmera).
- Ana (2026-10-20): "volta só com um tile, o primeiro rosa" → só `01-petalas.jpg` em `src/assets/tiles/` (sem girar; o
  `Wall` continua aceitando mais imagens). "Aumente as luzes, está muito escuro" → lanternas emissive 2 + pointLight 5,5
  (dist 4,5) e **seis lanternas** (três novas), três pointLights do varal (3,2/2,4/3,2), hemisfério 0,75 quente, spot 110
  (ângulo 0,62), preenchimento 0,6 e névoa recuada (`1,9·d → 3,8·d`: a parede perdia a cor).
- **Jogos em tela inteira** também (mesmo pedido): `.world-page` sem padding e `.world-stage` com 100svh, debaixo da nav;
  nav sem blend (mesma regra da Skills, `body:has(.world-page)`), "voltar" creme com sombra e uma sombra de 160 px no topo
  da cena (`.world-stage::before`).
- "Faltam sombras, ficou muito clara" (Ana, 2026-10-20, depois de clarear): o que achatava era o **preenchimento uniforme**,
  não as lanternas. Agora: spot principal de cima-direita (`[2,6, 4,4, 2,8]`, 125, penumbra 0,75) — um lado iluminado e
  outro em sombra —, hemisfério 0,38, preenchimento 0,22, `environmentIntensity 0,42`, `N8AO` raio 0,5 / intensidade 4,
  lanternas com alcance 3,2 (iluminam a parede, não a máquina). A sala continua clara pelas lanternas e pelo varal.
- "Ficou muito escura; faça como se tivesse strip LED dentro dela, e faça as lanternas emitirem luz" (Ana, 2026-10-20):
  `STRIPS` em ClawMachine.tsx = quatro fitas de LED na vitrine (em cima sob a placa, nas duas laterais internas, na
  borda de baixo): faixa `MeshBasic` HDR (`#fff1de × 2,6`, o bloom pega) + `rectAreaLight` voltada para dentro
  (`RectAreaLightUniformsLib.init()`; a largura/altura da luz é em **metros** — o three ignora a escala do pai —, 6 cm
  de espessura; potências 45/20/20/12 — fina demais e fraca, quase não iluminava). Orientação conferida medindo a
  luminância média do interior (invertida dava menos). Lanternas: emissive laranja `#ff9442` × 2,8 (o AgX deixa branco
  o que é claro demais), halo aditivo 1,9 em volta, pointLight 6 / alcance 3,6, e mais baixas (1,15–1,72) para
  aparecerem no quadro. Hemisfério 0,52, `environmentIntensity 0,55`.
- Etiqueta do prêmio: 340 px era "pequeno", 490 px "muito grande" — ficou no meio: `.cw-prize` `clamp(410px, 36vw, 540px)`,
  título `clamp(48px, 4,4vw, 72px)`, texto `clamp(15px, 1,3vw, 18px)`, bolinhas 13 px, coração 38 px (≈ 410 px em 1126).

## Otimização (2026-10-20) — "rodar liso em todos os aparelhos sem perder qualidade"
Nada visual mudou; só o que se carrega e quando se renderiza.
- **Páginas sob demanda** (`src/routes.ts`): cada página é um `lazy()` (com `<Suspense fallback={null}>` em FullSite).
  Antes todas estavam no bundle da home e os `useGLTF.preload` de cada módulo baixavam lagoa, máquina, fliperama,
  aparelhos e jogadora **na abertura do site**. Agora: `prefetchRoute(path)` ao passar o mouse num link da nav e no
  início de cada transição (a cortina cobre a tela enquanto o chunk chega), e `prefetchAll()` em tempo ocioso depois do
  `load` da home (uma página por vez). `src/prefetch.ts` é a ponte: `Transition.tsx` é compartilhado com o build só do
  Fragments e importar `routes.ts` dele puxava todas as páginas para aquele build (a auditoria pegou).
- **Bibliotecas em chunks próprios** (`vite.config.ts` → `manualChunks`: three, r3f, postfx, motion, react): uma
  atualização do site não obriga a baixar o three.js de novo.
- **Canvas pausado fora da tela** (`useOnScreen` → `frameloop="never"`): hero, mesa (Kuwahara em tela cheia) e cartão do
  Contato. Antes a home renderizava dois WebGL a 60 fps ao mesmo tempo. Margem de 200 px para acordar antes de aparecer.
- ~~DPR adaptativo com `PerformanceMonitor`~~ — **removido** no mesmo dia: cada degrau redimensionava o canvas e
  realocava todos os buffers de pós (N8AO, bloom, espelhos) e numa página pesada ele oscilava; o site inteiro travou
  ("parece um jogo a 2 fps"). `useAdaptiveDpr(max)` hoje só devolve um teto fixo `[1, max]`. Não reintroduzir.
- **Adesivos**: o "dente" do papel era um laço por pixel em cada adesivo (~1 M iterações × 19); agora um tile 256²
  gerado uma vez e repetido com `createPattern`.
- **Arquivos**: `punchlines.webp` 1400 → 1024 px de altura (o adesivo nunca usa mais; 529 → 313 KB); apagados o CSS do
  mural (`.mural`/`.mu-*`, que puxava `cork.webp` de 295 KB), `cork.webp`, os textos `mu_*` sem uso e os modelos sem
  referência (`cloud`, `island`, `lily`, `succulents`). `loading="lazy"` nas imagens fora da primeira dobra.
- Resultado do build: home ~1,25 MB de JS antes → bibliotecas + 24 KB do site; páginas 17–45 KB cada.
- Logos nascem **dentro** da máquina (Ana, 2026-10-20: "ao spawnar têm que vir de dentro da máquina, de cima para
  baixo"): antes começavam 1,6 m acima e entravam pelo teto. `SPAWN_Y = 124 − HALF` (logo abaixo da fita de LED de cima),
  caem retos até o slot; entram um por vez (`wait` 0,25 + 0,12·i s, escondidos até lá) e crescem ao aparecer (`pop`,
  ease-out em 0,2 s). "Pegar outra" usa o mesmo `spawn()`.

## A cortina espera a página ficar pronta (2026-10-20)
Ana: "enquanto modelos/páginas carregam, ficam na cortina até carregar, para uma experiência mais homogênea; o ideal é que
nenhuma página demore muito". `Transition.tsx` ganhou a fase `hold`: cobre (850 ms) → `navigate` → **segura** → revela.
- `src/components/SceneReady.tsx`: `<SceneReady/>` vai **dentro do Suspense de cada Canvas** das páginas internas
  (Projetos, Skills, Jogos, Contato, jardim do Fragments) — só monta quando os modelos/texturas daquela cena chegaram, e
  segura a cortina até a cena desenhar 3 quadros (compilação de shader e primeiro quadro pesado ficam escondidos;
  garantia de 2,5 s para canvas pausado). `waitForPage({ chunk, scene })` espera o chunk da página, depois uma cena nova
  montar (se a página tem cena) e um instante sem pendências; teto de 10 s.
- `prefetchRoute` devolve `{ chunk, scene }` (via `src/prefetch.ts`). **Não usar o `useProgress` global do drei** para
  isso: o prefetch ocioso das outras páginas o mantém ocupado por segundos (a cortina ia até o teto).
- Entrar direto numa página interna (link compartilhado) já começa com a cortina fechada (`prefetchWhenReady` espera o
  FullSite registrar a tabela de rotas).
- `PageShell`: as entradas (título letra a letra, voltar, conteúdo) esperam `covered` virar falso — a página monta por
  baixo da cortina e elas tocariam escondidas. Em `projects`/`skills` o wrapper do conteúdo **não desliza** (só fade):
  um `transform` nele vira o bloco de contenção do palco absoluto, com altura 0, e o r3f não cria cena de tamanho 0.
- Na cortina, uma linha fina com um brilho correndo (`.wipe-load`) aparece se a espera passar de ~0,45 s.
- Adesivos: cache por especificação + `warmStickers(SPOTS)` assa os 18 em fatias ociosas quando o chunk da Skills é
  pré-carregado (~450 ms que saíam da montagem). Texturas da Skills e do fliperama com `useTexture.preload`.
- Medido (dev, do clique até a cortina começar a subir, incluindo os 850 ms da cobertura): Sobre 1,3 s, Projetos 1,6 s,
  Contato 1,9 s, Jogos 1,9 s, Skills 2,2 s.

## Travamento geral + Skills a 2 fps (2026-10-20)
Ana: "a usabilidade do site inteiro está bem travada… principalmente a tela de skills". Causas e correções (medido em
1440×900, dpr 1: Skills **21 → 74 fps**, pior quadro 101 → 11–30 ms; Projetos/Jogos/Contato ~100 fps; mesa ~85 fps):
- `PerformanceMonitor` oscilando (ver acima) — removido, teto fixo de DPR (Skills 1,5).
- A Skills tinha ~20 luzes (6 lanternas, 3 do varal, neon, 4 fitas `rectAreaLight`, 2 internas, spot, 2 direcionais,
  hemisfério): cada luz é paga por todo pixel de todo material. Agora: lanternas **sem** pointLight (emissive + halo
  bastam), varal = 2 lavagens largas (5, alcance 5,5), só a fita de cima é `rectAreaLight` (60) — as outras três
  continuam acesas como faixa emissiva —, uma luz interna. **Regra: Skills com no máximo ~5 luzes pontuais/área.**
- Chão sem `MeshReflectorMaterial` (renderizava a cena inteira de novo a cada quadro): `meshStandard` com o xadrez,
  roughness 0,38, reflexo do ambiente.
- Gabinete e adesivos em `MeshStandardMaterial` (o `MeshPhysical` com clearcoat dobrava o especular).
- Pós: sem MSAA 4× (`multisampling 0`) + `SMAA`; `N8AO` `quality="low"` meio-res; sombra 1024.
- Prefetch das outras páginas começa 2,5 s depois do `load`, uma página por fatia ociosa com 1,2 s entre elas, e não
  roda com economia de dados/2G.
- Barra da cortina centralizada (`left/right 0; margin auto` — o `margin-left: min(...)` saía do centro em telas largas).

- Número da página na cortina (Ana: "o 2 do Sobre está errado" — o "02" de 11 px encostava no "b" de "Sobre"): `.wipe-label
  .meta` inline-flex com filetes dos dois lados, `clamp(13px, 1,15vw, 16px)`, tracking .42em (com `padding-left` igual
  para centrar), folga `clamp(18px, 2,6vw, 38px)`; o `h2` com `line-height: 1` e sem margem.

## Contato — a ruazinha com a caixa de correio (2026-10-20, etapa 1)
Ana achou o Contato "feio comparado com o resto" e, entre ideias (caixa de correio na rua, escrivaninha, purikura, telefone
público, barquinho na lagoa), escolheu **a caixa de correio**. Imagens-conceito geradas pelo Figma (`generate_image`, arquivo
"Portfólio — ideias da página de Contato" no time PCA — o Gemini da media-pipeline estava sem cota) em
`docs/ideias-contato/img/`. Ela mandou o modelo `Meshy_AI_Vintage_Brass_Mailbox` (caixa de parede de latão com flores em relevo
e "MAIL") → `scripts/prep-mailbox.mjs` → `public/models/mailbox.glb` (5,3 MB → 200 KB; mantém cor, normal e metal/rugosidade,
texturas 1024 webp, draco).
- `src/components/ContactStreet.tsx` (metros, y para cima): parede de loja de frente (`WALL`, z 0) com a máquina de bebidas
  (`vending.glb` do fliperama, 1,85 m), a **caixa em esmalte rosa** (`#f4a3ba`; `onBeforeCompile` usa a inclinação do
  normal map como "desgaste": onde o relevo é íngreme a tinta saiu e aparece o latão, metal e rugosidade do modelo; no resto
  metalness 0,04 / roughness 0,34; 58 cm, `MAILBOX_AT`), arandela acesa em cima (de onde vem a única `spotLight`, com
  **alvo adicionado à cena** — sem isso o three mira na origem), quadro de cortiça com um cartão provisório (a etapa 2 traz o
  cartão 3D), cano, ar-condicionado, dois pôsteres dela; **rodapé de 0,96 m com os azulejos rosa de pétalas** da Skills
  (`src/assets/tiles/01-petalas.jpg` + bump) e friso de madeira. À esquerda um beco (`ALLEY`) que some na névoa
  (`fog 6→17`): paredes de reboco com manchas/escorridos gerados em canvas (repetição **só na horizontal** — repetir na
  vertical criava faixas), janelas acesas, ar-condicionados, fios, lanternas e varais de luzinhas atravessando, luzes
  desfocadas no fim. Chão = asfalto molhado: `MeshReflectorMaterial` com `roughnessMap` de poças (as poças espelham),
  poças de luz quente/fria aditivas sob a arandela e a máquina.
- Luzes (regra da Skills): hemisfério + 1 point da máquina + 1 spot da arandela (sombra 1024) + 1 point quente do beco;
  lanternas, luzinhas e janelas só brilham. Pós: N8AO low meio-res, Bloom 0,6/0,85, AgX, SMAA. DPR máx 1,5, pausa fora da
  tela, `<SceneReady/>`.
- `Decor.tsx` (novo, compartilhado com a Skills): `radial`, `StringLights` (ganchos 3D + `sag`/`bulge`), `Lantern`
  (`top`, `size`), `Hearts` (`items`), `Glints` (`box`). `ClawScenery` passou a usar dele, sem mudança visual.
- Página: `.ct-street` absoluto no topo (100svh) com o título por cima e um `::after` que escurece topo e base; nav sem
  blend como na Skills. **Provisório**: o cartão 3D e a carta antigos continuam abaixo da rua até a etapa 2 (carta → envelope
  → fenda da caixa; cartão no quadro). Print: `docs/ideias-contato/img/rua-v1.jpg`.
- Skills: **clicar no logo com o nome aparecendo pega aquele logo, sempre** (Ana, 2026-10-20). Causa do erro: o plano
  invisível da mira (y 55) fica **na frente** dos logos das fileiras do meio e da frente; o clique caía nele primeiro e o
  `stopPropagation` dele impedia o clique do logo — a garra ia para o ponto do plano e pegava o vizinho (ou nada). Agora o
  plano ignora ponteiro/clique quando há um logo na lista `e.intersections` (`userData.logoIndex`); passar o mouse num logo
  leva a garra para cima dele; o clique grava `target`, e na pegada o alvo é garantido e não escorrega. Mirar livre (plano,
  setas) continua com a sorte do jogo. Testado com mouse real: Git, Procreate, C, SQL, Java, Nomad Sculpt, Claude.
- Máquina mais de frente: `YAW −0,08` (era −0,16; −0,38 antes).
- Etapa 1b (Ana: "a caixa tem que ser muito maior; a vending machine é só um prop; ênfase no mailbox; Instagram, LinkedIn e
  e-mail com bastante destaque"): caixa com **95 cm** (`MAILBOX_H`) no centro e clicável (rola até a carta por enquanto);
  **letreiro de neon rosa** "deixe um recado ↓" na parede acima dela (`NeonSign`: texto em Pinyon Script num canvas —
  tubo HDR + halo borrado aditivo + pointLight rosa + falha rara; redesenha quando a fonte carrega, `document.fonts.load`);
  luz embutida na marquise no lugar da arandela (a spot vem dela). **Quadro de cortiça 1,9 × 1,3** à direita com três cartões
  impressos grandes — Instagram (@ do link), LinkedIn, e-mail (faixa larga) — e o cartão de visita no canto; a ação vem
  impressa no cartão ("abrir ↗", "copiar ⧉" / "copiado ✓") e o cartão levanta, endireita e clareia sob o ponteiro
  (`BoardCard`). **Etiquetas HTML flutuantes foram tentadas e recusadas** ("não quero esses cards assim") — tudo fica dentro
  da cena. Máquina de bebidas virou coadjuvante: na ponta direita, cortada pela borda, emissive × 0,32. Ações também num
  `<nav class="sr">` (teclado/leitor de tela) e "copiado" numa linha `.ct-status`. O cartão 3D antigo saiu da página (a carta
  continua embaixo até a etapa 2). Print: `docs/ideias-contato/img/rua-v2.jpg`.
- Etapa 1c (Ana: "bem feia, muito escuro; o quadro de cortiça parece um negócio de terror; o meu negócio é aesthetic,
  coquete"): **anoitecer rosado em vez de noite preta** (fundo/névoa `#2a2131`, névoa 8→22, hemisfério `#ffe1ec` 0,95 +
  preenchimento frontal 0,75, N8AO 1,6, sombra do topo da página 0,35), reboco blush claro (`#f1dcd4`; beco `#d4b8b4` /
  `#c7aaa8`), marquise rosa-pó, asfalto mais claro com poças sutis. **Quadro de cortiça removido** → `ContactSigns`: três
  **plaquinhas creme de borda ondulada com filete rosa e corações nos cantos, penduradas por fita de cetim com laço**
  (`signTexture` desenha fita + laço + placa num canvas com alpha; `HangingSign` balança de leve, sob o ponteiro balança mais,
  avança e clareia; clique abre/copia; a ação vem impressa embaixo). **Jardineira** creme sob a caixa com os **lírios** dela
  (`GlbProp` + `lilies.glb`) — flores de esferas pareciam bolinhas de chiclete. Neon mais forte (core 3,4, luz 2,2).
  Print: `docs/ideias-contato/img/rua-v3.jpg`.
- Etapa 1d (Ana: "o chão tá marrom/vermelho, a parede parece suja, a caixa tá blend — não dá pra ler — e não chega nem perto
  da imagem do Figma"; depois: "o chão tá preto e vai pro nada" e "a parede tá simples demais, quero textura real"):
  **composição refeita como no conceito — a câmera olha rua adentro** (a rua corre para −z; `ROAD`, fachadas `R`/`L`,
  `KERB`, `Z0 9 → Z1 −20`). Asfalto molhado cinza-frio no meio (o único `MeshReflectorMaterial`, mixStrength 1,6),
  calçadas de granito com meio-fio dos dois lados, **fachadas machiya em 3D** (`Facade`: reboco em cima, tábuas pintadas
  embaixo, **pilares, viga e friso de madeira de verdade** saltando da parede, `Eave` com beiral de telha), azulejos rosa
  só na loja da caixa, noren rosa com 花, janelas acesas, lanternas penduradas nos beirais dos dois lados. **A rua termina
  em algo**: `Sky` (gradiente anil → rosa) e `StreetEnd` (silhuetas de telhados com janelinhas numa névoa rosada) + névoa
  lilás `HAZE #6b5c82` 5→21 — nada de preto no horizonte.
- Texturas reais: **reboco, asfalto e calçada gerados no Figma** (`generate_image`, gemini-3.1-flash-image, arquivo novo
  "Portfólio — texturas da rua (Contato)" no time PCA — Ana tinha apagado o arquivo antigo, e é por isso que o Figma dizia
  "Figma AI is not available for this file") em `src/assets/street/*.jpg`, usadas como cor + bump (`photoMaps`). A madeira
  o Figma recusou (422 duas vezes) → tábuas, madeira e rugosidade das poças são procedurais em `StreetTextures.ts` (ruído
  de valor **periódico**, emenda sem costura, cache).
- Caixa: em primeiro plano sobre um **pilar rosa** na calçada da direita, virada para a câmera (`MAILBOX_YAW −0,42`). O relevo
  dela é **geometria**, não textura (a textura do Meshy é chapada, e o normal map quase não tem informação) → o shader agora
  usa a **normal no espaço do objeto**: os painéis olham para os eixos da caixa, o relevo não; onde a normal sai do eixo
  (`smoothstep(0,996 → 0,955)`) vira **latão polido** (metal 1) e o resto fica esmalte rosa — "MAIL" e as flores leem.
  Neon "deixe um recado ↓" pendurado num braço sobre ela; plaquinhas no varal de luzinhas que **atravessa a rua**
  (`SIGN_LINE`); vending mais ao fundo na calçada. Jardineira com **7 lírios em rosa, branco, pêssego e lilás** (`GlbProp`
  ganhou `tint`: recolore só as pétalas — onde o vermelho supera o verde — mantendo o sombreado).
- Câmera por proporção: paisagem fov 42; tablet fov 50; **celular fov 60 de mais longe e inclinada para cima** (o título fica
  no céu, plaquinhas logo abaixo, caixa e Instagram inteiros). O `cc_*` do cartão antigo saiu do i18n.
  Print: `docs/ideias-contato/img/rua-v4.jpg`.
- Etapa 1e (Ana: "não quero esse texto de descrição, chato; os cardzinhos estão bonitos mas discretos demais, precisam ser
  mais centrais; o título de contato não precisa ser tão grande"): **sem subtítulo** (a página não tem `aside`); título do
  Contato `clamp(40px, 5vw, 76px)`; **plaquinhas maiores e no centro** — varal em `SIGN_LINE z 0,6 / y 2,78` (perto da
  câmera, mais baixo), Instagram/LinkedIn 0,84 m, e-mail 1,3 m, `xs −1,36 / −0,3 / 0,72`, brilho próprio 0,45 (0,75 sob o
  ponteiro). Neon menor (0,92 m) logo acima da caixa, sem entrar na parede.
- Título × plaquinhas (Ana mandou print do "Contato" em cima da plaquinha do Instagram): o `Camera` **mede o h1 do título**
  (fundo e a borda direita da última letra, sobre o canvas, + 18 px) e **inclina a câmera para cima** em passos de 5 cm
  (a rua desce na tela) até nenhum canto superior das placas (`SIGN_CORNERS`, abaixo da fita) cair dentro dessa caixa.
  Refaz no resize e quando o h1 muda de tamanho (`ResizeObserver`: fonte carregando, idioma). Testado em 1100×640,
  1000×1000, 1280×760, 1600×900 e celular.
  Ao inclinar, a câmera também recua um pouco (z +5 cm, y +1,2 cm por passo) para a caixa e os lírios não saírem pelo pé.
- Etapa 1f (Ana: "essa parte da rua ficou muito vazia, coloque coisas"): `src/components/StreetDressing.tsx` — **placas
  verticais acesas** (`Kanban`, emissive 0,85, texto japonês em canvas: 喫茶さくら, 花屋, 甘味処, 古本, ゆめや, 手紙; y ~1,8 para
  aparecerem logo abaixo das plaquinhas), **vasos** com lírios (`GlbProp tint`) e arbustos redondos (textura de folhas +
  bump, alguns com florzinhas), **bicicleta** menta com cesta de flores na parede da esquerda, **banco** com dois caixotes
  de flores, **cavalete de giz** "本日 ichigo parfait ♡ ¥680", **poste** de concreto com cruzeta e transformador,
  **tampa de bueiro com sakura** no asfalto e **160 pétalas** caídas (um `instancedMesh`). Nenhuma luz nova.
  Print: `docs/ideias-contato/img/rua-v5.jpg`.
- Janelas (`FacadeWindow`): **textura de shoji que a Ana mandou** (`src/assets/street/shoji.jpg`, 512 px) — papel em treliça
  de madeira, acesa por dentro, moldura escura e peitoril. A foto é âmbar/laranja; Ana pediu outro tom → `shojiInPalette`
  faz um **mapa de gradiente por luminância** uma vez (treliça ameixa `#342c2c→#744e5c`, papel rosa → creme `#fff4ee`);
  `MeshBasic` ×1,25 (a "fria" puxa para lilás).

## Projetos — Bora? como app real no celular (2026-10-22)
Ana mandou o TG1 (`~/Downloads/Vive o Jogo/boratg1.pdf`, PDF em imagens) e a pasta do projeto (`~/Downloads/Bora?/`,
React + Vite, Spring Boot, Supabase, grafo). Escolheu **"app real navegável"** (preocupada com peso) e **sem crédito de
grupo**; "em algum lugar tem que ter a descrição".
- **Build de demonstração**: `scripts/bora-demo/build.sh "<…>/Bora?/frontend-react"` copia o front para uma pasta
  temporária (a original não é tocada, nem o `.env.local` dela), instala, e builda em **modo protótipo**
  (`VITE_SUPABASE_*` vazias no ambiente vencem qualquer `.env`: login decorativo, fotos em memória, mapa cai no
  `grafo.json` local) com `base /protos/bora/` → `public/protos/bora/` (~5 MB). O app usa caminhos absolutos
  `'/assets/…'` no JS e no CSS; `vite.demo.config.js` reescreve para a base no build (plugin `rebase-assets`).
  Para atualizar o Bora? no portfólio é só rodar o script de novo.
- **No celular** (`Proto.app` + `LiveApp` em `DeviceDock.tsx`): o `<iframe>` só existe depois que a pessoa abre o Bora?
  na lista (custo zero até lá; carga inicial ~100 KB gz, álbum 3D e mapa sob demanda). `src` é
  `/protos/bora/index.html` explícito (nenhum fallback de SPA pega). Faixa de status em volta da ilha com "←" e
  "ⓘ sobre"; `allow="camera"` (o app só pede a câmera na tela de câmera dele; sem permissão usa a foto de exemplo).
- **Descrição**: curta na lista (`desc`, capa = print do feed `src/assets/protos/bora-cover.jpg`); a longa em
  `Proto.about` (`lead`, `points`, `stack`, `note`) abre como folha por cima do app (o app mantém o estado embaixo).
- Fragments: `prune-fragments.mjs` apaga `dist-fragments/protos` (o prune mantém todo html/js, e a demo vinha junto).
- **Rolagem dentro do app** (Ana: "não consigo dar scroll dentro do app"): o Chrome não rola um iframe dentro de
  transform CSS 3D (a tela do celular é Html `transform` do drei). `LiveApp` rola à mão: ouve `wheel` no documento do
  app (mesma origem) e no nosso, sobre o iframe (mapeando o ponteiro pela caixa do iframe), sobe do elemento sob o
  ponteiro até o primeiro que ainda pode rolar e faz `scrollBy`; quem já tratou o wheel (Leaflet, zoom com ctrl) é
  respeitado. "←" e "ⓘ sobre" ficam juntos à direita (o "voltar aos aparelhos" da página cobre o canto esquerdo em
  telas altas).
- Celular maior no close-up: `fitDist(0.21, 0.5, 0.95)` (era 0,86 da altura visível).

## Projetos — Bridge como app real no celular (2026-10-22)
Repo da Ana: `github.com/anajuliaym/bridge-your-career` (Lovable, **TanStack Start** com SSR num Cloudflare Worker +
D1/R2). O bundle de cliente não sobe de página estática (a hidratação espera o HTML do servidor → "Invariant failed";
o GitHub Pages dela fica em branco pelo mesmo motivo). `scripts/bridge-demo/build.sh [caminho|URL]` (padrão: o repo)
trabalha numa cópia e faz um **SPA puro**: `main.tsx` (createRoot + RouterProvider), `vite.demo.config.ts` (react +
tailwind + tsconfig-paths, base `/protos/bridge/`), router com `basepath`, `shellComponent` tirado do `__root`
(sem `<html>` fora do Start), `index.html` próprio → `public/protos/bridge/` (~1 MB).
- **Backend no navegador** (`demo-api.ts`): `window.fetch` responde `/api/*` com o próprio `handleApiRequest` do app
  (`api-handler.ts` + `backendStore` em memória, perfis semeados); login desconhecido vira conta na hora. É instalado
  por chamada explícita — o `package.json` do app tem `"sideEffects": false` e um import só de efeito era descartado.
- CSS do `index.html` da demo: `html, body, #root { height: 100% }` (o Start renderizava direto no body) e, abaixo de
  640 px, `.min-h-dvh { height: 100dvh }` — o `PhoneShell` do app só tem `min-h-dvh` no celular, e o deck de cartas
  (`h-full`) colapsava para 0 (**bug do próprio app em telas < 640 px**; de `sm` para cima ele é 860 px fixo).
- `main.tsx` tira o `index.html` do endereço antes do router (o portfólio abre `/protos/bridge/index.html`).
- `vercel.json`: `/protos/bridge/(.*)` → `/protos/bridge/index.html` antes do fallback do portfólio (recarregar dentro
  do app não cai no site). Avatares vêm do DiceBear (externo, como no app).
- `Proto.appBar` `{ bg, dark }`: a faixa em volta da ilha na cor de cada app (Bora? claro `#e2f1f8`, Bridge `#06000f`).
- **Etiquetas de papel abrem o aparelho** (Ana: "essa etiqueta deve ser clicável e abrir o celular"): o clique na
  etiqueta abria (`setMode('mobile')`, render síncrono do root do Html) e, no mesmo evento, o `onPointerMissed` do Canvas
  — que já via `mode` = 'mobile' — fechava de novo. Agora só um clique **no próprio `<canvas>`** (pond vazio) sai do
  aparelho; cliques em DOM sobre o canvas (etiquetas, a tela do celular/notebook) são ignorados. Isso também acabou com o
  celular fechando ao clicar na lista dentro dele com o mouse.
- **Lista de apps no celular** redesenhada: cards estilo loja (`dv-card`) tingidos pela cor do app (`Proto.accent`:
  Bora? `#f2a3c4`, Bridge `#8b5cf6`), ícone 62 px, selo "app real" com ponto verde, pílula "abrir", descrição inteira
  (sem corte) e dica "Toque num app para usar a versão de verdade". Itens sem `app` (web) mantêm o formato antigo.
- Ícone do Bora? = `src/assets/protos/bora-icon.svg`: o logo do próprio app (`logo.svg`) sobre o gradiente pastel do
  login (o print do feed saiu).

## Projetos — CSV Matcher no notebook (2026-10-22)
Ana mandou `~/Downloads/Comparar arquivos CSV/` (export do **Figma Make**: React + Tailwind + Papa Parse, 100% no
navegador). `scripts/csv-demo/build.sh "<pasta>"` builda uma cópia com base `/protos/csv/` → `public/protos/csv/`
(~300 KB). Entrada própria `demo-main.tsx`: o app como está + pílula **"Usar arquivos de exemplo"** que põe dois CSVs
**fictícios** (`afiliados.csv`, `vendas.csv`, e-mails `@exemplo.com`; 6 registros batem por e-mail) nos dois
`<input type=file>` do app via `DataTransfer` + `change` (o mesmo caminho de escolher um arquivo). O
`pnpm-workspace.yaml` do export é apagado na cópia (instala com npm).
- Lista web: os dois espaços reservados saíram; o CSV Matcher entra como card de app (`accent #818cf8`, ícone
  `csv-icon.svg` = o FileDiff do próprio app no quadrado índigo). No notebook a faixa do `LiveApp` vira **barra de
  navegador** (nome do app à esquerda, "←" e "ⓘ sobre" à direita; `.dv-app.web`), e o "sobre" usa uma coluna legível.
- `.dv3 { overflow: clip }`: com só `hidden`, um `scrollIntoView`/foco dentro do iframe rolava a tela inteira para
  fora do aparelho (y −160 000 px). Contador no singular ("1 protótipo", `pj_list_one`).

## Projetos — Orçamentária no notebook (2026-10-22)
Ana mandou `~/Downloads/orcamentaria.pdf`: 8 telas (sem código) de um sistema de orçamento de obras de infraestrutura
(Dashboards, Novo Projeto com o modelo 3D da ponte, Todos os Projetos, Orçamento → Quantitativos / Base de Preços /
Orçamento / Simulação, Relatórios). Virou um **protótipo clicável**: `scripts/orcamentaria-demo/build.sh "<pdf>"`
renderiza as páginas a 1650 px (`render.swift`, PDFKit — sem poppler) em `public/protos/orcamentaria/screens/` e
copia `index.html`, que põe botões invisíveis (realce laranja no hover/foco, piscam 2× na entrada) sobre o menu, as
abas, "Novo Projeto", "Abrir", "Salvar"/"Cancelar" — coordenadas no espaço das páginas de 1100 px. Página estática
com CSP própria, sem rede.
- No portfólio: card na lista web (antes do CSV Matcher), `prototype: true` → selo laranja **"protótipo navegável"** em
  vez de "app real" (e no "sobre"); ícone `orcamentaria-icon.svg` (gradiente laranja + barras). Dica da lista agora
  neutra: "Toque num projeto para abrir e navegar por ele". Barra de navegador escura legível (`.web.is-dark`).

## Projetos — Gestão de Crachás no notebook (2026-10-22)
`~/Downloads/Gerenciamento de crachás.pdf`: 11 telas (sem código) de um sistema de crachás feito para um **cliente
real — a marca dele aparecia nas telas**. Ana escolheu **anonimizar** (o portfólio é público; **não citar o cliente
em nada versionado** — código, CLAUDE.md, commits). `scripts/crachas-demo/build.sh "<pdf>"`: renderiza as páginas
(o `render.swift` da Orçamentária) e `anonymize.py` (Pillow) acha o logo pelo amarelo do quadradinho (≈ rgb 242,192,66)
em duas janelas — cabeçalho e prévia do crachá — cobre com o fundo amostrado **acima** dele (à esquerda há uma borda
cinza que aparecia como caixa) e desenha a marca fictícia **"ID · ENERGIA S.A."**; o único e-mail vira
`@empresa.com.br`. Protótipo clicável (`index.html`, mesmo esquema da Orçamentária) com **seletor "Visão:
Colaborador / Gestão"** (telas 1–5 pedido e rastreamento; 6–11 dashboard, aprovação, produção, entrega).
- Card na lista web entre Orçamentária e CSV Matcher, `prototype: true`, ícone `crachas-icon.svg` (crachá no
  quadrado verde), `accent #34d399`.
- **Projetos confidenciais** (Ana, 2026-10-22: "fala que tenho mais projetos, criados na empresa onde estou, que são
  confidenciais por enquanto"): o fim das duas listas (celular e notebook) tem uma nota tracejada com cadeado —
  "Mais projetos, sob sigilo" (`pj_more_title` / `pj_more_body`), sem nada para abrir. Um sistema de gestão de frotas
  feito no Figma Make (cliente real) ficou **de fora** a pedido dela.

## Mesa — zoom no hover e mergulho no clique (2026-10-22)
Ana: "o zoom (do hover) da mesa está muito ruim; prefiro que vá para o item aumentando bastante, com animação bem
smooth". `ScrollCamera` (DeskScene.tsx):
- **Hover** (etiqueta 3D ou o índice embaixo): a câmera **desliza em linha reta em direção ao objeto, mantendo a
  orientação** — 55% do caminho até o centro dele (`CLOSE_UP[id].at`) — então o objeto **fica sob o ponteiro** e cresce
  (~2×) sem a etiqueta fugir do mouse (o zoom antigo só aproximava 0,15 do centro da mesa). `mix` com mola (`damp` k 2,6)
  moldada por smoothstep (entra e sai suave); trocar de objeto desliza o alvo (`damp` k 4) em vez de pular.
- **"Tendo um derrame" no Projetos e no Skills** (Ana): o zoom mirava o centro do objeto, mas o alfinete fica acima dele —
  bem acima no monitor e na torre —, então ao avançar a etiqueta escorregava de baixo do mouse, o hover caía, a câmera
  voltava, a etiqueta voltava… em loop. Agora o hover mergulha em direção ao **alfinete** (`PIN_POS`, onde o `Hotspots`
  realmente o pousou), que fica parado na tela (medido: 0 px de deslocamento por 2,5 s), e sair de uma etiqueta espera
  320 ms antes de desfazer o hover.
- Ainda "dando e tirando zoom" (Ana): a área de hover era só a etiqueta, que **sobe 4 px e cresce no hover** (a borda
  fugia do cursor) e o vão até o alfinete era morto. Agora cada `.hotspot` tem um `.hit` invisível cobrindo etiqueta, fio
  e alfinete com folga (inset −18/−26/−14 px) que **cresce com o zoom ativo** (−46/−60/−40 px). Testado com o mouse na
  borda de cima e no vão etiqueta–alfinete: hover estável por 2,5 s.
- "Mais nas Skills": a etiqueta de Skills fica colada à de Projetos; durante o mergulho as vizinhas deslizam e a área de
  hover de Projetos passava sob o cursor parado, roubava o hover, o zoom virava para ela e voltava. Com uma etiqueta ativa,
  as outras ficam `pointer-events: none` (`.desk.hovering .hotspot:not(.active)`); voltam quando o hover termina.
- **Clique**: mergulho temporizado de 1,5 s (`ZOOM_MS`, easeInOutCubic) da pose **mostrada** (hover incluso, sem salto)
  até o close-up de cada objeto (`CLOSE_UP`: distância/elevação — celular e controle vistos de cima, monitor/cavalete/
  torre quase de frente). A cortina da página começa aos 650 ms (`CURTAIN_AT_MS`) e cresce do objeto enquanto a câmera
  ainda chega; com `prefers-reduced-motion`, cortina na hora. As etiquetas somem no mergulho (`.desk.diving`).
- **Pedaço escuro ao lado do celular** (Ana, 2026-10-22, no zoom do Contato: "esconde esse pedaço fora do celular, deve ser
  de outro modelo escondido"): eram sobras da malha da mesa. (1) A **base do vaso de suculentas** ficava logo abaixo do
  piso da caixa de corte (y −0,376) e aparecia na beirada do celular — o corte do vaso agora desce até −0,42 (x de 0,6,
  `size` 0,18) e o do tablet também. (2) O **raminho no pé da torre**, logo à direita do celular (x 0,76–0,97, z 0,12–0,32,
  só faces < 0,05 — as da torre são grandes e ficam), que de perto virava um borrão escuro com contorno.
- **Zoom do hover reescrito** (Ana, com gravação: "o mouse estava parado e a etiqueta sai de baixo dele"): vindo de outra
  etiqueta no meio do zoom, a mira deslizava de um alfinete ao outro e a etiqueta nova andava ~260 px. Agora o estado é um
  **deslocamento da câmera** (`hz.off`): em hover, a câmera vai **de onde está** em linha reta até o alfinete
  (`C' = P + (C − P)·d₂/d`), com mola criticamente amortecida na distância (alvo 45% da distância da câmera do scroll),
  então o alfinete em hover não se move (medido ±1 px em Skills, Projetos, Contato e na troca Projetos→Skills); sem hover,
  o deslocamento volta a zero por mola. A câmera do scroll fica parada durante o hover (`k = 0`: o balanço ocioso deslizava
  a etiqueta ~18 px).
- Raminho no pé da torre (o "preto" que ainda aparecia): duas caixas de corte **fora** do volume da torre (faces dela em
  x 0,449–0,826, z −0,248–0,259) — à frente da face e à direita da lateral —, folhas até 0,15.
- **Giro da mesa** (Ana: "o máximo que ele pode girar é até aqui", print de frente): o scroll gira de −0,75 (frente-esquerda)
  até `AZ_END = 0` (de frente, monitor reto, lateral esquerda da torre aparecendo) — antes ia até +0,85 (lateral direita).
  A aproximação (raio −0,7, elevação −0,12) chega ao máximo **no fim** (`sin(p·π/2)`), junto da vista de frente.

## Celular de verdade (iPhone da Ana, 2026-10-23)
- **Projetos**: no iOS Safari o `Html transform` do drei ficava bem abaixo da tela do modelo e os iframes dentro dele não
  renderizavam (os apps só giravam o spinner). Em tela de toque ou estreita (`useFlatScreens` em Devices.tsx:
  `pointer: coarse` ou < 760 px) a câmera ainda voa até o aparelho, mas a tela vira um **painel plano** (`FlatScreen` em
  DeviceDock.tsx, portal no `<body>`, `.dv3-flat`) em **tela cheia, sem moldura** (Ana: "no celular só ocupa a tela
  inteira, não precisa de frame; no desktop mantém" — a 1.ª versão, um painel flutuando sobre o modelo, "nem encaixava
  no celular"). Acende 700 ms depois como a tela 3D; o "voltar aos aparelhos" (também em portal, senão ficava atrás) sobe
  para a faixa de cima; o body não rola. Rolagem nativa e iframes funcionam. No desktop nada muda.
- **Fragments**: em `pointer: coarse` o `Embed` não oferece "Jogar aqui" (o runner do GX.games fica em "Downloading data"
  no celular e o jogo precisa de teclado): mostra a tela de título com o aviso `gw_mobile_title` / `gw_mobile_body`.

## Skills — lista e logos novos (2026-10-23)
Ana: "tira SQL, Azure e C; melhora as logos do Canva, Procreate e Nomad Sculpt; se pensar outras skills coloque, podem ser
conceitos como criatividade". Saíram `sql`, `azure`, `c`; entraram **React** (simple-icons) e dois conceitos com nome
traduzido (`Tool.names`, aplicado em Skills.tsx): **Criatividade** (lâmpada creme com um coração rosa de filamento) e
**UI & UX** (janela lilás com layout creme em relevo e cursor rosa) — no lugar de "Pesquisa com usuários", a pedido dela. Continuam 11 = os 11 `SLOTS`.
Logos em **camadas** (`LogoPath.layers` em logoPaths.ts): cada camada tem cor chapada ou degradê (`colors` + `from/to` no
quadro 24×24, em vertex colors), e as em relevo (`raise`) usam bisel fino (o bisel de 1,1 fechava as letras e o vão entre as
dunas); `inner` usa os recortes do caminho como sólido. `logoMaterial` usa `vertexColors` nesses. Canva = disco
teal→violeta + "Canva" (o caminho do simple-icons) em branco; Procreate = quadrado quase preto + pena arco-íris; Nomad =
quadrado pêssego→creme + duas dunas ameixa→coral. Descrições dos novos ainda "Substitua: …".

Cartão do prêmio (2026-10-23): um clique em qualquer lugar fora dele o fecha como "pegar outra" (`.cw-prize-veil`, camada fixa
transparente atrás do cartão; o clique não chega ao canvas, então não dispara a garra).
Sem a linha "Domínio" com bolinhas no cartão (Ana, 2026-10-23: "tira isso"); `level` segue no `Tool`, sem uso na máquina.
Descrições reais das skills (2026-10-23, Ana: "baseado no curso de Computação do Mackenzie e no que você sabe das minhas
skills, preencha o que falta"): escritas a partir dos projetos (Bora?, CSV Matcher, Orçamentária, Gestão de Crachás, os
jogos, este site), do estágio, do Fragments (GEQ, n = 30) e do curso (Python na introdução, Java em orientação a objetos,
IHC, computação gráfica). Entrou **Python** (simple-icons, degradê azul → amarelo) como 12.º logo: a fileira do chão ganhou
um quarto lugar (`SLOTS`, x OX−50…OX+64, deslocada para a esquerda para o da ponta não sumir atrás da moldura).

## Sem travessões (Ana, 2026-10-23)
Nenhum travessão (—) no texto visível do site, em PT ou EN: vírgula, ponto, dois-pontos ou "·". Períodos da timeline
usam "a" / "to" ("fev 2024 a dez 2027"); `Timeline.tsx` divide o período por esses separadores.
Figma (2026-10-23, "melhore a logo do Figma"): a marca real em cinco peças sólidas coloridas (vermelho, laranja, roxo, azul, verde),
cada uma recuada 1,35 para o bisel de 1,1 devolver o tamanho com um sulco fino entre elas; `LogoPath.scale` 1,12 (a marca é estreita).

## Claude na PCA (Ana, 2026-10-23)
Ana: "fala em algum lugar que na empresa atual eu que propus usar o Claude para prototipar e para desenvolver; eu mostrei
que dava, eu comecei; fiz vários projetos vendidos para clientes e de pesquisa e desenvolvimento; foi importante para
trazer essa mudança". Está em três lugares: o postal da PCA (descrição + dois itens em "o que eu fiz"), a descrição da
skill Claude e a nota "Mais projetos, sob sigilo" dos Projetos (`pj_more_body`: para clientes e de P&D). Também: UI & UX
cita o uso no estágio, e as skills **não citam os protótipos do notebook** (Orçamentária, Gestão de Crachás, CSV Matcher).
Postais no celular: altura 500 px e o texto do verso (`.pc-note`) rola com esmaecido embaixo (antes era cortado em
CC, CNPq e PCA).

## Postais refeitos (Ana, 2026-10-23)
Ana: "atrás não tem muita informação, as linhas e o selo ocupam muito espaço; no celular fica muito fino e a frente fica
cropped; faz um nine slice na imagem; use melhor o espaço de trás; ordem do mais atual para o mais antigo".
- **Ordem**: PCA, CNPq, Mackenzie, IB (array em `content.ts`, as duas línguas). PCA vem primeiro por ser o atual.
- **Frente em nine-slice**: `.pc-cover` com `border-image` (sem `fill`; o meio é o creme `#ebe1ce`, amostrado das capas;
  um meio repetido mostrava emendas e a capa esticada por baixo vazava flores e carimbo). `SLICE` em Timeline.tsx (px da
  imagem, topo/direita/baixo/esquerda) guarda selo + carimbo (canto de cima à direita) e flores/coelho (canto de baixo à
  esquerda) inteiros; larguras em `cqw` (o `.pc-card` é container) numa escala única relativa aos 711 px do coelho;
  `border-image-repeat: round` (a renda se repete num cartão alto, esticada virava riscos). Lírio rosa: baixo 290 (as
  pétalas subiam até a faixa da borda esquerda e se repetiam).
- **Frente e verso na mesma célula de grid**: o cartão tem a altura da face mais alta, então o verso nunca corta texto e a
  frente estica junto. Desktop: mínimo na proporção da capa (452/711); celular: mínimo 250 px.
- **Verso**: sem linhas de endereço; cabeçalho com "Postcard", cargo e local · período, e selo + carimbo pequenos no canto;
  depois a descrição e "o que eu fiz" (duas colunas quando o cartão passa de 460 px, `@container`).
- Celular: a rota foi para 18 px e o carimbo da rota para 44 px (o cartão ganhou ~28 px de largura).
