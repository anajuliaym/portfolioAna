import type { HotspotId } from '../components/DeskScene'
import type { Lang } from '../i18n'
import { fragmentsGame } from './fragments'

/** URL of each desk hotspot */
export const ROUTES: Record<HotspotId, string> = {
  projects: '/projetos',
  about: '/sobre',
  contact: '/contato',
  skills: '/skills',
  games: '/jogos',
}

type L<T> = Record<Lang, T>

// ---------------------------------------------------------------------------
// PLACEHOLDER CONTENT — troque pelos seus dados reais.
// ---------------------------------------------------------------------------

/**
 * Prototypes for /projetos: browsed inside a 3D phone (mobile) or notebook (web). Each one is either a
 * Figma prototype embed (`embed`, use the URL from Figma's Share → Embed) or a list of screenshots
 * (`shots`, files in src/assets/protos). PLACEHOLDER entries until Ana sends the real prototypes.
 */
export type Proto = { title: string; desc: string; tags: string[]; embed?: string; shots?: string[] }
export const protos: L<{ mobile: Proto[]; web: Proto[] }> = {
  pt: {
    mobile: [
      { title: 'Protótipo mobile 01', desc: 'Espaço reservado. Manda o link do protótipo no Figma (Compartilhar → Incorporar) ou as telas, e ele aparece aqui, navegável como num celular.', tags: ['Figma', 'UI mobile'] },
      { title: 'Protótipo mobile 02', desc: 'Espaço reservado para o segundo protótipo mobile.', tags: ['Figma', 'UX'] },
    ],
    web: [
      { title: 'Protótipo web 01', desc: 'Espaço reservado. Manda o link do protótipo no Figma ou as telas, e ele aparece aqui, navegável como num notebook.', tags: ['Figma', 'Web'] },
      { title: 'Protótipo web 02', desc: 'Espaço reservado para o segundo protótipo web.', tags: ['Figma', 'Dashboard'] },
    ],
  },
  en: {
    mobile: [
      { title: 'Mobile prototype 01', desc: 'Placeholder. Send the Figma prototype link (Share → Embed) or the screens and it shows up here, browsable like on a phone.', tags: ['Figma', 'Mobile UI'] },
      { title: 'Mobile prototype 02', desc: 'Placeholder for the second mobile prototype.', tags: ['Figma', 'UX'] },
    ],
    web: [
      { title: 'Web prototype 01', desc: 'Placeholder. Send the Figma prototype link or the screens and it shows up here, browsable like on a laptop.', tags: ['Figma', 'Web'] },
      { title: 'Web prototype 02', desc: 'Placeholder for the second web prototype.', tags: ['Figma', 'Dashboard'] },
    ],
  },
}

export const projects: L<{ title: string; tag: string; year: string; desc: string; hue: number }[]> = {
  pt: [
    { title: 'Personagem Midnight', tag: 'Personagem 3D', year: '2026', desc: 'Modelagem, retopologia e texturização estilizada de personagem para animação.', hue: 110 },
    { title: 'Mesa Bloom', tag: 'Cenário', year: '2026', desc: 'Cenário de escritório noturno com iluminação pintada.', hue: 230 },
    { title: 'Liquid Type', tag: 'Tipografia 3D', year: '2026', desc: 'Lettering líquido em 3D para identidade visual.', hue: 30 },
    { title: 'Protótipo de interface', tag: 'UI', year: '2025', desc: 'Interface de app com componentes 3D interativos.', hue: 160 },
    { title: 'Props coleção 01', tag: 'Props', year: '2025', desc: 'Conjunto de objetos de cena com material painterly.', hue: 280 },
    { title: 'Estudo de animação', tag: 'Animação', year: '2025', desc: 'Ciclo de caminhada e expressões faciais.', hue: 190 },
  ],
  en: [
    { title: 'Midnight Character', tag: '3D Character', year: '2026', desc: 'Modeling, retopology and stylized texturing of a character for animation.', hue: 110 },
    { title: 'Bloom Desk', tag: 'Environment', year: '2026', desc: 'Night-time office scene with painted lighting.', hue: 230 },
    { title: 'Liquid Type', tag: '3D Typography', year: '2026', desc: 'Liquid 3D lettering for a visual identity.', hue: 30 },
    { title: 'Interface prototype', tag: 'UI', year: '2025', desc: 'App interface with interactive 3D components.', hue: 160 },
    { title: 'Props collection 01', tag: 'Props', year: '2025', desc: 'Set of scene objects with a painterly material.', hue: 280 },
    { title: 'Animation study', tag: 'Animation', year: '2025', desc: 'Walk cycle and facial expressions.', hue: 190 },
  ],
}

/**
 * About page copy, split into the pieces of an editorial collage (see About.tsx): a type lockup, a
 * lined-paper note with a paperclip, a browser window, ticket stubs, a second lockup and a taped
 * sticky note with the circled quote. Keep the pieces short — the layout is built for these lengths.
 */
export type AboutCollage = {
  hero: { pre: string; a: string; amp: string; b: string }
  note: { title: string; body: string; tag: string }
  window: { url: string; title: string; body: string; tag: string }
  tickets: string[]
  mix: { pre: string; a: string; b: string }
  closing: { pre: string; quote: string; post: string; tag: string }
}
/** one experience = a knot where the design thread and the technology thread cross; `mix` is how technical it was (0 = all design, 1 = all code) */
/** `cover` is a file in src/assets/postcards (Ana's lace postcard fronts): bunny-blue, lily-green, lily-pink, lily-purple, flowers-blue */
export type Experience = { period: string; title: string; org: string; desc: string; design: string[]; tech: string[]; mix: number; cover: string }
export const about: L<{ heading: string; collage: AboutCollage; xpKicker: string; xpTitle: string; xpIntro: string; xpFlip: string; xpBack: string; xpStampHere: string; xpDid: string; experiences: Experience[] }> = {
  pt: {
    heading: 'Sobre mim',
    collage: {
      hero: { pre: 'Sou estudante de Ciência da Computação, mas gosto de pensar em mim como alguém que vive entre', a: 'design', amp: '&', b: 'tecnologia' },
      note: {
        title: 'Gosto de criar, experimentar e transformar',
        body: 'ideias em coisas que podem ser vistas, testadas e usadas. Tenho um carinho especial por arte, UI/UX, jogos e experiências digitais, e adoro a parte de imaginar como algo vai ser antes mesmo de começar a existir.',
        tag: 'meu processo favorito ♥',
      },
      window: {
        url: 'figma → código',
        title: 'Ao mesmo tempo, gosto de colocar a mão na parte técnica.',
        body: 'Programar, prototipar, entender como as coisas funcionam e descobrir como tirar uma ideia do Figma e fazer ela acontecer.',
        tag: 'mão na massa!',
      },
      tickets: ['jogos', 'interfaces', 'protótipos', 'novas tecnologias'],
      mix: { pre: 'Já criei jogos, interfaces, protótipos e projetos que misturam design, código e novas tecnologias. No processo, percebi que é justamente essa mistura que mais me interessa:', a: 'ter liberdade para criar,', b: 'mas também saber construir.' },
      closing: { pre: 'No meu trabalho, gosto de fazer perguntas, testar possibilidades e, principalmente, transformar aquela ideia de', quote: '“e se a gente...”', post: 'em alguma coisa real.', tag: 'sempre' },
    },
    xpKicker: 'Trajetória profissional',
    xpTitle: 'Experiências',
    xpIntro: '',
    xpFlip: 'virar o postal',
    xpBack: 'virar de volta',
    xpStampHere: 'selo',
    xpDid: 'o que eu fiz',
    // do LinkedIn da Ana (2026-09-22)
    experiences: [
      { period: '2021 — 2023', title: 'Certificado IB', org: 'Escola Internacional de Alphaville', desc: 'Certificado do International Baccalaureate, feito junto do ensino médio — onde as duas linhas começam.', mix: 0.5, cover: 'bunny-blue', design: [], tech: [] },
      { period: 'fev 2024 — dez 2027', title: 'Ciência da Computação', org: 'Universidade Presbiteriana Mackenzie', desc: 'Graduação em andamento, com foco em jogos, computação gráfica e interação humano-computador.', mix: 0.75, cover: 'lily-purple',
        design: ['Interação humano-computador', 'Computação gráfica'], tech: ['Algoritmos e estruturas de dados', 'Python, GameMaker'] },
      { period: 'set 2025 — set 2026', title: 'Bolsista de Iniciação Tecnológica', org: 'CNPq · Universidade Presbiteriana Mackenzie', desc: 'Pesquisa “FRAGMENTS: um jogo digital destinado ao estímulo das funções executivas em estudantes universitários”.', mix: 0.5, cover: 'lily-green',
        design: ['Game design das quatro fases, uma por função executiva', 'Arte, narrativa e a história da Layla'], tech: ['Programação em GameMaker', 'Avaliação com 30 participantes (GEQ) · publicado no GX.games'] },
      { period: 'mai 2025 — hoje', title: 'Estagiária', org: 'PCA Engenharia de Software · São Paulo', desc: 'Estágio de meio período em que as telas que eu desenho no Figma viram o código que eu mesma escrevo, junto do time de produto.', mix: 0.5, cover: 'lily-pink',
        design: ['Telas e protótipos no Figma', 'Fluxos e UX junto do time de produto'], tech: ['Front-end das interfaces', 'Desenvolvimento web'] },
    ],
  },
  en: {
    heading: 'About me',
    collage: {
      hero: { pre: 'I am a Computer Science student, but I like to think of myself as someone who lives between', a: 'design', amp: '&', b: 'technology' },
      note: {
        title: 'I like creating, experimenting and turning',
        body: 'ideas into things that can be seen, tested and used. I have a soft spot for art, UI/UX, games and digital experiences, and I love the part where you imagine what something will be before it even exists.',
        tag: 'my favourite part ♥',
      },
      window: {
        url: 'figma → code',
        title: 'At the same time, I like getting my hands on the technical side.',
        body: 'Programming, prototyping, understanding how things work and figuring out how to take an idea out of Figma and make it happen.',
        tag: 'hands on!',
      },
      tickets: ['games', 'interfaces', 'prototypes', 'new tech'],
      mix: { pre: 'I have built games, interfaces, prototypes and projects that mix design, code and new technologies. Along the way I realised this mix is exactly what interests me most:', a: 'the freedom to create,', b: 'but also knowing how to build.' },
      closing: { pre: 'In my work I like asking questions, testing possibilities and, above all, turning that', quote: '“what if we...”', post: 'idea into something real.', tag: 'always' },
    },
    xpKicker: 'Professional journey',
    xpTitle: 'Experience',
    xpIntro: '',
    xpFlip: 'flip the postcard',
    xpBack: 'flip back',
    xpStampHere: 'stamp',
    xpDid: 'what I did',
    experiences: [
      { period: '2021 — 2023', title: 'IB Certificate', org: 'Escola Internacional de Alphaville', desc: 'International Baccalaureate certificate, taken alongside high school — where both threads begin.', mix: 0.5, cover: 'bunny-blue', design: [], tech: [] },
      { period: 'Feb 2024 — Dec 2027', title: 'Computer Science', org: 'Mackenzie Presbyterian University', desc: 'Ongoing degree, focused on games, computer graphics and human-computer interaction.', mix: 0.75, cover: 'lily-purple',
        design: ['Human-computer interaction', 'Computer graphics'], tech: ['Algorithms and data structures', 'Python, GameMaker'] },
      { period: 'Sep 2025 — Sep 2026', title: 'CNPq Technological Initiation Fellow', org: 'CNPq · Mackenzie Presbyterian University', desc: 'Research “FRAGMENTS: a digital game to stimulate executive functions in university students”.', mix: 0.5, cover: 'lily-green',
        design: ['Game design of the four phases, one per executive function', 'Art, narrative and Layla’s story'], tech: ['Programming in GameMaker', 'Evaluation with 30 participants (GEQ) · published on GX.games'] },
      { period: 'May 2025 — today', title: 'Intern', org: 'PCA Engenharia de Software · São Paulo', desc: 'Part-time internship where the screens I design in Figma become the code I write myself, alongside the product team.', mix: 0.5, cover: 'lily-pink',
        design: ['Screens and prototypes in Figma', 'Flows and UX with the product team'], tech: ['Front-end of the interfaces', 'Web development'] },
    ],
  },
}

export const contact: L<{ email: string; links: [string, string][]; form: { name: string; email: string; msg: string; send: string } }> = {
  pt: {
    email: 'anajuliayagutimatilha@gmail.com',
    links: [['Instagram', 'https://instagram.com/'], ['LinkedIn', 'https://linkedin.com/'], ['ArtStation', 'https://artstation.com/'], ['GitHub', 'https://github.com/']],
    form: { name: 'Seu nome', email: 'Seu e-mail', msg: 'Mensagem', send: 'Enviar' },
  },
  en: {
    email: 'anajuliayagutimatilha@gmail.com',
    links: [['Instagram', 'https://instagram.com/'], ['LinkedIn', 'https://linkedin.com/'], ['ArtStation', 'https://artstation.com/'], ['GitHub', 'https://github.com/']],
    form: { name: 'Your name', email: 'Your e-mail', msg: 'Message', send: 'Send' },
  },
}

export type Tool = { id: string; name: string; level: number; since?: number; area: L<string>; desc: L<string> }

// Jogos 02 e 03 vieram do portfólio Canva da Ana (anamatilha.my.canva.site, só os feitos no GameMaker); os anos são estimativa — confirmar com ela.
export const tools: Tool[] = [
  { id: 'figma', name: 'Figma', level: 4, area: { pt: 'Design', en: 'Design' }, desc: { pt: 'Substitua: como você usa o Figma (interfaces, protótipos, design system).', en: 'Replace: how you use Figma (interfaces, prototypes, design systems).' } },
  { id: 'claude', name: 'Claude', level: 4, area: { pt: 'IA', en: 'AI' }, desc: { pt: 'Substitua: como o Claude entra no seu fluxo (código, escrita, pesquisa).', en: 'Replace: how Claude fits your workflow (code, writing, research).' } },
  { id: 'git', name: 'Git', level: 4, area: { pt: 'Ferramentas', en: 'Tools' }, desc: { pt: 'Substitua: versionamento, branches, fluxo de trabalho em equipe.', en: 'Replace: versioning, branching, team workflow.' } },
  { id: 'azure', name: 'Azure', level: 3, area: { pt: 'Nuvem', en: 'Cloud' }, desc: { pt: 'Substitua: serviços que você usa na Azure (DevOps, pipelines, hospedagem).', en: 'Replace: the Azure services you use (DevOps, pipelines, hosting).' } },
  { id: 'gamemaker', name: 'GameMaker', level: 3, area: { pt: 'Jogos', en: 'Games' }, desc: { pt: 'Substitua: jogos e protótipos feitos no GameMaker.', en: 'Replace: games and prototypes built in GameMaker.' } },
  { id: 'java', name: 'Java', level: 3, area: { pt: 'Programação', en: 'Programming' }, desc: { pt: 'Substitua: o que você construiu em Java.', en: 'Replace: what you have built with Java.' } },
  { id: 'c', name: 'C', level: 3, area: { pt: 'Programação', en: 'Programming' }, desc: { pt: 'Substitua: projetos e estudos em C.', en: 'Replace: projects and studies in C.' } },
  { id: 'sql', name: 'SQL', level: 3, area: { pt: 'Dados', en: 'Data' }, desc: { pt: 'Substitua: bancos que você modela e consulta.', en: 'Replace: the databases you model and query.' } },
  { id: 'canva', name: 'Canva', level: 4, area: { pt: 'Design', en: 'Design' }, desc: { pt: 'Substitua: peças e apresentações feitas no Canva.', en: 'Replace: pieces and decks made in Canva.' } },
  { id: 'procreate', name: 'Procreate', level: 4, area: { pt: 'Ilustração', en: 'Illustration' }, desc: { pt: 'Substitua: ilustração e concept no Procreate.', en: 'Replace: illustration and concept work in Procreate.' } },
  { id: 'nomad', name: 'Nomad Sculpt', level: 4, area: { pt: 'Escultura 3D', en: '3D sculpting' }, desc: { pt: 'Substitua: escultura digital no iPad com o Nomad Sculpt.', en: 'Replace: digital sculpting on iPad with Nomad Sculpt.' } },
]

/**
 * `embed` = URL do runner do GX.games (play.gx.games/game-wrapper/…) que roda dentro de um iframe.
 * Descoberto em 2026-09-18: a página gx.games/games/… não permite iframe (X-Frame-Options), mas o
 * runner permite; precisa de game + track + release na query (gamePlayId é opcional — geramos um).
 * Se a Ana publicar uma versão nova no GX.games, o `release` muda: pegar a URL nova com
 * `curl -X POST https://api.gx.games/gxc/v2/games/<gameId>/play` (campo launchUrl).
 */
export type GameEntry = { title: string; engine: string; platform: string; year: string; desc: string; link?: string; embed?: string; dossier?: 'fragments'; hue: number }
export const games: L<GameEntry[]> = {
  pt: [
    fragmentsGame.pt,
    { title: 'Memorize It!', engine: 'GameMaker', platform: 'PC', year: '2025', desc: 'Jogo 2D que testa a sua memória. Você navega por salas, memoriza a posição das moedas e, ao entrar na sala seguinte, usa uma “arma” para atirar só nas moedas que estavam na sala anterior, ignorando as novas. Um jeito divertido de desafiar e treinar a memória enquanto joga.', hue: 150 },
    { title: 'Kardec’s House', engine: 'GameMaker', platform: 'PC', year: '2025', desc: 'Você é um(a) protagonista à procura do melhor amigo, Ivor, que desapareceu misteriosamente. As pistas levam a uma mansão abandonada e sinistra, a Casa de Kardec, sobre a qual os moradores da cidade sussurram histórias de eventos sobrenaturais e rituais ocultos. Explorando os ambientes assustadores da casa, você descobre segredos perturbadores, enfrenta entidades sinistras e desvenda a verdade por trás do desaparecimento de Ivor.', hue: 320 },
  ],
  en: [
    fragmentsGame.en,
    { title: 'Memorize It!', engine: 'GameMaker', platform: 'PC', year: '2025', desc: 'A 2D game that tests your memory. You move through rooms, memorise where the coins are and, in the next room, use a “gun” to shoot only the coins that were in the previous room, ignoring the new ones. A fun way to challenge and train your memory while playing.', hue: 150 },
    { title: 'Kardec’s House', engine: 'GameMaker', platform: 'PC', year: '2025', desc: 'You play a protagonist desperately searching for their best friend, Ivor, who vanished mysteriously. The clues lead to an abandoned, sinister mansion, Kardec’s House, about which the townspeople whisper stories of supernatural events and occult rituals. Exploring the house’s eerie rooms, you uncover disturbing secrets, face sinister entities and unravel the truth behind Ivor’s disappearance.', hue: 320 },
  ],
}

export const ui: L<{ back: string; play: string; all: string; count: (n: number) => string }> = {
  pt: {
    back: 'Voltar para a mesa',
    play: 'Jogar',
    all: 'Todos',
    count: (n) => `${n} itens`,
  },
  en: {
    back: 'Back to the desk',
    play: 'Play',
    all: 'All',
    count: (n) => `${n} items`,
  },
}
