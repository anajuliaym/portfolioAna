import type { Lang } from '../i18n'

/**
 * Fragments dossier — content taken from the PIBITI article
 * "Fragments: desenvolvimento e avaliação de um jogo digital projetado para estimular funções
 * executivas em jovens universitários" (Ana Julia Yaguti Matilha; Ana Grasielle Dionísio Corrêa,
 * Universidade Presbiteriana Mackenzie). Numbers are the article's (n = 30).
 */

type L<T> = Record<Lang, T>

export type FE = 'wm' | 'ic' | 'cf'
export const FE_LABEL: L<Record<FE, string>> = {
  pt: { wm: 'Memória de trabalho', ic: 'Controle inibitório', cf: 'Flexibilidade cognitiva' },
  en: { wm: 'Working memory', ic: 'Inhibitory control', cf: 'Cognitive flexibility' },
}

export type Phase = { n: number; key: 'seed' | 'plant' | 'flower' | 'tree'; name: L<string>; period: L<string>; fe: FE[]; mechanic: L<string> }
export const phases: Phase[] = [
  { n: 1, key: 'seed', name: { pt: 'A Semente', en: 'The Seed' }, period: { pt: 'Infância', en: 'Childhood' }, fe: ['wm'],
    mechanic: { pt: 'Três quartos, cada um em duas versões quase iguais. Memorize o original e aponte os objetos que apareceram na cópia.', en: 'Three rooms, each in two almost identical versions. Memorise the original and spot the objects added to the copy.' } },
  { n: 2, key: 'plant', name: { pt: 'A Planta', en: 'The Plant' }, period: { pt: 'Adolescência', en: 'Adolescence' }, fe: ['cf'],
    mechanic: { pt: 'A mãe de Layla pede para arrumar o quarto. Objetos caem sem parar e a regra de separação muda o tempo todo: por tema, por adesivo, por categoria.', en: "Layla's mum asks her to tidy up. Objects keep falling and the sorting rule keeps changing: by theme, by sticker, by category." } },
  { n: 3, key: 'flower', name: { pt: 'A Flor', en: 'The Flower' }, period: { pt: 'Jovem adulta', en: 'Young adult' }, fe: ['wm', 'ic'],
    mechanic: { pt: 'No trabalho, responda e-mails usando informações de arquivos e mensagens anteriores, enquanto pop-ups falsos tentam roubar seu clique.', en: 'At work, answer e-mails using information from files and earlier messages while fake pop-ups try to steal your click.' } },
  { n: 4, key: 'tree', name: { pt: 'A Árvore', en: 'The Tree' }, period: { pt: 'Adulta · antes do acidente', en: 'Adult · before the accident' }, fe: ['wm', 'ic', 'cf'],
    mechanic: { pt: 'Dirija com A e D enquanto o GPS pede sequências para memorizar, o para-brisa suja e o rádio liga sozinho. No fim, um celular vibra: tocar ou ignorar decide o final.', en: 'Drive with A and D while the GPS asks you to memorise sequences, the windscreen gets dirty and the radio turns itself on. At the end a phone buzzes: touching it or ignoring it decides the ending.' } },
]

export type Shot = { id: string; phase: Phase['key'] | 'title'; caption: L<string> }
export const shots: Shot[] = [
  { id: '01-titulo', phase: 'title', caption: { pt: 'Tela inicial: o título floresce entre as nuvens.', en: 'Title screen: the name blooms among the clouds.' } },
  { id: '02-semente-quarto', phase: 'seed', caption: { pt: '"Meu quarto de infância… Por que está duplicado?"', en: '"My childhood room… why is it duplicated?"' } },
  { id: '03-planta-mae', phase: 'plant', caption: { pt: 'A mãe de Layla muda a regra no meio do jogo.', en: "Layla's mum changes the rule mid-game." } },
  { id: '04-planta-caixotes', phase: 'plant', caption: { pt: 'Caixotes e a regra ativa: "REGRA: ADESIVO".', en: 'Crates and the active rule: "RULE: STICKER".' } },
  { id: '05-flor-email', phase: 'flower', caption: { pt: 'Um e-mail legítimo que exige leitura atenta.', en: 'A legitimate e-mail that demands careful reading.' } },
  { id: '06-flor-popup', phase: 'flower', caption: { pt: 'O pop-up "SECURITY ALERT" que não pode ser clicado.', en: 'The "SECURITY ALERT" pop-up you must not click.' } },
  { id: '07-arvore-carro', phase: 'tree', caption: { pt: 'Dentro do carro, no início da última fase.', en: 'Inside the car, at the start of the last phase.' } },
  { id: '08-arvore-gps', phase: 'tree', caption: { pt: 'O GPS pede uma sequência enquanto tudo acontece ao mesmo tempo.', en: 'The GPS asks for a sequence while everything happens at once.' } },
]

/** The shots' image files, by id (webp, 1200 px). */
export const SHOT_URLS = Object.fromEntries(
  Object.entries(import.meta.glob('../assets/fragments/*.webp', { eager: true, import: 'default', query: '?url' }))
    .map(([path, url]) => [path.split('/').pop()!.replace('.webp', ''), url as string]),
) as Record<string, string>

export const dossier: L<{
  kicker: string
  about: string[]
  facts: [string, string][]
  galleryTitle: string
  galleryHint: string
  all: string
  timelineTitle: string
  resultsTitle: string
  resultsIntro: string
  geq: { label: string; value: number }[]
  geqScale: string
  fes: { label: string; pct: number; fe: FE }[]
  endingTitle: string
  endingText: string
  peace: string
  tragic: string
  credits: string
  world: { title: string; intro: string; scroll: string; tap: string; step: string }
}> = {
  pt: {
    kicker: 'Jogo sério · Iniciação Tecnológica (PIBITI) · Universidade Presbiteriana Mackenzie',
    about: [
      'Fragments é um jogo narrativo sobre memória, perda e funções executivas. Layla, uma jovem adulta, entra em coma depois de um acidente. Presa entre a vida e a morte, ela atravessa as próprias lembranças, da infância à vida adulta, enquanto sua mente tenta reconstruir quem ela foi.',
      'Cada fase é uma etapa da vida dela e cada mecânica foi escolhida por corresponder a um paradigma cognitivo da literatura sobre funções executivas: memória de trabalho, controle inibitório e flexibilidade cognitiva. As regras do jogo não ilustram os desafios da personagem, elas são os desafios.',
      'O jogo foi feito no GameMaker, publicado no GX.games e desenhado com acessibilidade: tipografia legível e narração em áudio de todos os textos.',
    ],
    facts: [['Engine', 'GameMaker'], ['Público', 'Universitários de 18 a 30 anos'], ['Estrutura', '4 fases · 4 etapas da vida'], ['Avaliação', '30 participantes · GEQ + autopercepção'], ['Acessibilidade', 'Narração em áudio de todos os textos'], ['Orientação', 'Profa. Ana Grasielle Dionísio Corrêa']],
    galleryTitle: 'Fragmentos de memória',
    galleryHint: 'Passe o mouse para inclinar, clique para abrir. Filtre por fase ou por função executiva.',
    all: 'Tudo',
    timelineTitle: 'A vida de Layla em quatro fases',
    resultsTitle: 'O que os jogadores sentiram',
    resultsIntro: 'Trinta universitários jogaram as quatro fases, em média por 38 minutos. Depois responderam ao Game Experience Questionnaire e a um questionário de autopercepção das funções executivas.',
    geq: [
      { label: 'Eu estava interessado na história', value: 3.9 },
      { label: 'Achei o jogo impressionante', value: 3.8 },
      { label: 'Eu me senti desafiado', value: 3.7 },
      { label: 'Eu me senti contente', value: 3.6 },
      { label: 'Eu me senti completamente absorvido', value: 3.4 },
      { label: 'Eu me senti frustrado', value: 1.5 },
      { label: 'Eu me senti entediado', value: 1.2 },
    ],
    geqScale: 'escala de 0 a 4',
    fes: [
      { label: 'precisaram lembrar de informações para avançar', pct: 93.3, fe: 'wm' },
      { label: 'sentiram que precisaram se controlar para não agir no impulso', pct: 90, fe: 'ic' },
      { label: 'mudaram de estratégia ao longo das fases', pct: 86.7, fe: 'cf' },
    ],
    endingTitle: 'A escolha final',
    endingText: 'Na última fase um celular vibra enquanto Layla dirige. Tocar nele leva ao final trágico; ignorar, ao final em paz. Os jogadores se dividiram quase ao meio, sinal de que a decisão gerou tensão de verdade.',
    peace: 'ignoraram o celular · final em paz',
    tragic: 'tocaram o celular · final trágico',
    credits: 'Pesquisa e desenvolvimento: Ana Julia Yaguti Matilha · Orientação: Ana Grasielle Dionísio Corrêa · Universidade Presbiteriana Mackenzie.',
    world: { title: 'O jardim da memória', intro: 'Cada fase do jogo é uma etapa da vida de Layla, e uma planta cresce com ela: semente, planta, flor, árvore. Role a página para ver a memória florescer.', scroll: 'Role para crescer', tap: 'Clique num fragmento para ampliar', step: 'Fase' },
  },
  en: {
    kicker: 'Serious game · Undergraduate research (PIBITI) · Mackenzie Presbyterian University',
    about: [
      'Fragments is a narrative game about memory, loss and executive functions. Layla, a young adult, falls into a coma after an accident. Caught between life and death, she travels through her own memories, from childhood to adult life, while her mind tries to rebuild who she was.',
      'Each phase is a stage of her life, and each mechanic was chosen because it matches a cognitive paradigm from the executive-function literature: working memory, inhibitory control and cognitive flexibility. The rules do not illustrate her challenges, they are the challenges.',
      'The game was built in GameMaker, published on GX.games and designed for accessibility: readable typography and audio narration of every text.',
    ],
    facts: [['Engine', 'GameMaker'], ['Audience', 'University students, 18 to 30'], ['Structure', '4 phases · 4 stages of life'], ['Evaluation', '30 participants · GEQ + self-perception'], ['Accessibility', 'Audio narration of every text'], ['Advisor', 'Prof. Ana Grasielle Dionísio Corrêa']],
    galleryTitle: 'Memory fragments',
    galleryHint: 'Hover to tilt, click to open. Filter by phase or by executive function.',
    all: 'All',
    timelineTitle: "Layla's life in four phases",
    resultsTitle: 'What players felt',
    resultsIntro: 'Thirty university students played all four phases, 38 minutes on average. Then they answered the Game Experience Questionnaire and an executive-function self-perception questionnaire.',
    geq: [
      { label: 'I was interested in the story', value: 3.9 },
      { label: 'I found the game impressive', value: 3.8 },
      { label: 'I felt challenged', value: 3.7 },
      { label: 'I felt content', value: 3.6 },
      { label: 'I felt completely absorbed', value: 3.4 },
      { label: 'I felt frustrated', value: 1.5 },
      { label: 'I felt bored', value: 1.2 },
    ],
    geqScale: 'scale from 0 to 4',
    fes: [
      { label: 'had to remember information to move on', pct: 93.3, fe: 'wm' },
      { label: 'felt they had to hold back an impulse', pct: 90, fe: 'ic' },
      { label: 'changed strategy across the phases', pct: 86.7, fe: 'cf' },
    ],
    endingTitle: 'The final choice',
    endingText: 'In the last phase a phone buzzes while Layla drives. Touching it leads to the tragic ending; ignoring it, to the peaceful one. Players split almost down the middle, a sign the decision carried real tension.',
    peace: 'ignored the phone · peaceful ending',
    tragic: 'touched the phone · tragic ending',
    credits: 'Research and development: Ana Julia Yaguti Matilha · Advisor: Ana Grasielle Dionísio Corrêa · Mackenzie Presbyterian University.',
    world: { title: 'The garden of memory', intro: 'Each phase of the game is a stage of Layla’s life, and a plant grows with her: seed, plant, flower, tree. Scroll to watch the memory bloom.', scroll: 'Scroll to grow', tap: 'Click a fragment to enlarge', step: 'Phase' },
  },
}

export const ENDING = { peace: 16, tragic: 14 } // participants, n = 30
