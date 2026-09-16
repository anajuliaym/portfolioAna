import type { HotspotId } from '../components/DeskScene'
import type { Lang } from '../i18n'

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

export const about: L<{ paragraphs: string[]; facts: [string, string][]; timeline: [string, string][] }> = {
  pt: {
    paragraphs: [
      'Trabalho no cruzamento entre arte 3D, design de interface e código. Gosto de levar o modelo do Blender até o navegador e fazer ele reagir a quem está olhando.',
      'Este portfólio é um exemplo disso: os modelos são meus, o shader pintado e o site foram construídos do zero.',
    ],
    facts: [['Base', 'São Paulo, Brasil'], ['Foco', 'Personagens e cenários estilizados'], ['Disponível', 'Freelance e projetos'], ['Idiomas', 'Português, Inglês']],
    timeline: [['2026', 'Portfólio 3D interativo'], ['2025', 'Estudos de personagem e animação'], ['2024', 'Início em modelagem 3D']],
  },
  en: {
    paragraphs: [
      'I work where 3D art, interface design and code meet. I like taking a model from Blender all the way to the browser and making it react to whoever is looking.',
      'This portfolio is an example: the models are mine, and the painted shader and the site were built from scratch.',
    ],
    facts: [['Based in', 'São Paulo, Brazil'], ['Focus', 'Stylized characters and environments'], ['Available', 'Freelance and projects'], ['Languages', 'Portuguese, English']],
    timeline: [['2026', 'Interactive 3D portfolio'], ['2025', 'Character and animation studies'], ['2024', 'Started 3D modeling']],
  },
}

export const contact: L<{ email: string; links: [string, string][]; form: { name: string; email: string; msg: string; send: string } }> = {
  pt: {
    email: 'ana.matilha@pca.com.br',
    links: [['Instagram', 'https://instagram.com/'], ['LinkedIn', 'https://linkedin.com/'], ['ArtStation', 'https://artstation.com/'], ['GitHub', 'https://github.com/']],
    form: { name: 'Seu nome', email: 'Seu e-mail', msg: 'Mensagem', send: 'Enviar' },
  },
  en: {
    email: 'ana.matilha@pca.com.br',
    links: [['Instagram', 'https://instagram.com/'], ['LinkedIn', 'https://linkedin.com/'], ['ArtStation', 'https://artstation.com/'], ['GitHub', 'https://github.com/']],
    form: { name: 'Your name', email: 'Your e-mail', msg: 'Message', send: 'Send' },
  },
}

export type Tool = { id: string; name: string; level: number; since?: number; area: L<string>; desc: L<string> }

// SUBSTITUIR EM PRODUÇÃO: níveis, anos e descrições são placeholders até a Ana preencher.
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

export const games: L<{ title: string; engine: string; platform: string; year: string; desc: string; link?: string; hue: number }[]> = {
  pt: [
    { title: 'Jogo 01', engine: 'Godot', platform: 'Web', year: '2026', desc: 'Plataforma 2D com arte pintada. Substitua pela descrição real.', link: '#', hue: 175 },
    { title: 'Jogo 02', engine: 'Unity', platform: 'PC', year: '2025', desc: 'Protótipo de puzzle em 3D. Substitua pela descrição real.', link: '#', hue: 220 },
    { title: 'Jogo 03', engine: 'JavaScript', platform: 'Navegador', year: '2025', desc: 'Mini game feito em uma game jam. Substitua pela descrição real.', link: '#', hue: 140 },
  ],
  en: [
    { title: 'Game 01', engine: 'Godot', platform: 'Web', year: '2026', desc: '2D platformer with painted art. Replace with the real description.', link: '#', hue: 175 },
    { title: 'Game 02', engine: 'Unity', platform: 'PC', year: '2025', desc: '3D puzzle prototype. Replace with the real description.', link: '#', hue: 220 },
    { title: 'Game 03', engine: 'JavaScript', platform: 'Browser', year: '2025', desc: 'Mini game made at a game jam. Replace with the real description.', link: '#', hue: 140 },
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
