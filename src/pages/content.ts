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
    { title: 'Personagem Midnight', tag: 'Personagem 3D', year: '2026', desc: 'Modelagem, retopologia e texturização estilizada de personagem para animação.', hue: 0 },
    { title: 'Mesa Bloom', tag: 'Cenário', year: '2026', desc: 'Cenário de escritório noturno com iluminação pintada.', hue: 230 },
    { title: 'Liquid Type', tag: 'Tipografia 3D', year: '2026', desc: 'Lettering líquido em 3D para identidade visual.', hue: 30 },
    { title: 'Protótipo de interface', tag: 'UI', year: '2025', desc: 'Interface de app com componentes 3D interativos.', hue: 160 },
    { title: 'Props coleção 01', tag: 'Props', year: '2025', desc: 'Conjunto de objetos de cena com material painterly.', hue: 280 },
    { title: 'Estudo de animação', tag: 'Animação', year: '2025', desc: 'Ciclo de caminhada e expressões faciais.', hue: 340 },
  ],
  en: [
    { title: 'Midnight Character', tag: '3D Character', year: '2026', desc: 'Modeling, retopology and stylized texturing of a character for animation.', hue: 0 },
    { title: 'Bloom Desk', tag: 'Environment', year: '2026', desc: 'Night-time office scene with painted lighting.', hue: 230 },
    { title: 'Liquid Type', tag: '3D Typography', year: '2026', desc: 'Liquid 3D lettering for a visual identity.', hue: 30 },
    { title: 'Interface prototype', tag: 'UI', year: '2025', desc: 'App interface with interactive 3D components.', hue: 160 },
    { title: 'Props collection 01', tag: 'Props', year: '2025', desc: 'Set of scene objects with a painterly material.', hue: 280 },
    { title: 'Animation study', tag: 'Animation', year: '2025', desc: 'Walk cycle and facial expressions.', hue: 340 },
  ],
}

export const about: L<{ intro: string; paragraphs: string[]; facts: [string, string][]; timeline: [string, string][] }> = {
  pt: {
    intro: 'Sou a Ana Julia, artista 3D e designer. Crio personagens, cenários e interfaces com uma estética pintada à mão.',
    paragraphs: [
      'Trabalho no cruzamento entre arte 3D, design de interface e código. Gosto de levar o modelo do Blender até o navegador e fazer ele reagir a quem está olhando.',
      'Este portfólio é um exemplo disso: os modelos são meus, o shader pintado e o site foram construídos do zero.',
    ],
    facts: [['Base', 'São Paulo, Brasil'], ['Foco', 'Personagens e cenários estilizados'], ['Disponível', 'Freelance e projetos'], ['Idiomas', 'Português, Inglês']],
    timeline: [['2026', 'Portfólio 3D interativo'], ['2025', 'Estudos de personagem e animação'], ['2024', 'Início em modelagem 3D']],
  },
  en: {
    intro: "I'm Ana Julia, a 3D artist and designer. I make characters, environments and interfaces with a hand-painted look.",
    paragraphs: [
      'I work where 3D art, interface design and code meet. I like taking a model from Blender all the way to the browser and making it react to whoever is looking.',
      'This portfolio is an example: the models are mine, and the painted shader and the site were built from scratch.',
    ],
    facts: [['Based in', 'São Paulo, Brazil'], ['Focus', 'Stylized characters and environments'], ['Available', 'Freelance and projects'], ['Languages', 'Portuguese, English']],
    timeline: [['2026', 'Interactive 3D portfolio'], ['2025', 'Character and animation studies'], ['2024', 'Started 3D modeling']],
  },
}

export const contact: L<{ lead: string; email: string; links: [string, string][]; form: { name: string; email: string; msg: string; send: string } }> = {
  pt: {
    lead: 'Quer conversar sobre um projeto, uma vaga ou só trocar ideia sobre 3D? Me escreve.',
    email: 'ana.matilha@pca.com.br',
    links: [['Instagram', 'https://instagram.com/'], ['LinkedIn', 'https://linkedin.com/'], ['ArtStation', 'https://artstation.com/'], ['GitHub', 'https://github.com/']],
    form: { name: 'Seu nome', email: 'Seu e-mail', msg: 'Mensagem', send: 'Enviar' },
  },
  en: {
    lead: 'Want to talk about a project, a role, or just 3D in general? Write me.',
    email: 'ana.matilha@pca.com.br',
    links: [['Instagram', 'https://instagram.com/'], ['LinkedIn', 'https://linkedin.com/'], ['ArtStation', 'https://artstation.com/'], ['GitHub', 'https://github.com/']],
    form: { name: 'Your name', email: 'Your e-mail', msg: 'Message', send: 'Send' },
  },
}

export const skills: L<{ group: string; items: { name: string; level: number; note?: string }[] }[]> = {
  pt: [
    { group: '3D', items: [{ name: 'Blender', level: 5 }, { name: 'ZBrush', level: 3 }, { name: 'Substance Painter', level: 3 }, { name: 'Meshy / IA generativa', level: 4 }] },
    { group: 'Código', items: [{ name: 'TypeScript', level: 4 }, { name: 'React', level: 4 }, { name: 'Three.js / R3F', level: 4 }, { name: 'GLSL (shaders)', level: 3 }] },
    { group: 'Design', items: [{ name: 'Figma', level: 4 }, { name: 'UI / UX', level: 4 }, { name: 'Tipografia', level: 3 }, { name: 'Motion', level: 3 }] },
    { group: 'Ferramentas', items: [{ name: 'Git', level: 4 }, { name: 'Vite', level: 4 }, { name: 'Vercel', level: 3 }, { name: 'Unity / Godot', level: 2 }] },
  ],
  en: [
    { group: '3D', items: [{ name: 'Blender', level: 5 }, { name: 'ZBrush', level: 3 }, { name: 'Substance Painter', level: 3 }, { name: 'Meshy / generative AI', level: 4 }] },
    { group: 'Code', items: [{ name: 'TypeScript', level: 4 }, { name: 'React', level: 4 }, { name: 'Three.js / R3F', level: 4 }, { name: 'GLSL (shaders)', level: 3 }] },
    { group: 'Design', items: [{ name: 'Figma', level: 4 }, { name: 'UI / UX', level: 4 }, { name: 'Typography', level: 3 }, { name: 'Motion', level: 3 }] },
    { group: 'Tools', items: [{ name: 'Git', level: 4 }, { name: 'Vite', level: 4 }, { name: 'Vercel', level: 3 }, { name: 'Unity / Godot', level: 2 }] },
  ],
}

export const games: L<{ title: string; engine: string; platform: string; year: string; desc: string; link?: string; hue: number }[]> = {
  pt: [
    { title: 'Jogo 01', engine: 'Godot', platform: 'Web', year: '2026', desc: 'Plataforma 2D com arte pintada. Substitua pela descrição real.', link: '#', hue: 350 },
    { title: 'Jogo 02', engine: 'Unity', platform: 'PC', year: '2025', desc: 'Protótipo de puzzle em 3D. Substitua pela descrição real.', link: '#', hue: 220 },
    { title: 'Jogo 03', engine: 'JavaScript', platform: 'Navegador', year: '2025', desc: 'Mini game feito em uma game jam. Substitua pela descrição real.', link: '#', hue: 140 },
  ],
  en: [
    { title: 'Game 01', engine: 'Godot', platform: 'Web', year: '2026', desc: '2D platformer with painted art. Replace with the real description.', link: '#', hue: 350 },
    { title: 'Game 02', engine: 'Unity', platform: 'PC', year: '2025', desc: '3D puzzle prototype. Replace with the real description.', link: '#', hue: 220 },
    { title: 'Game 03', engine: 'JavaScript', platform: 'Browser', year: '2025', desc: 'Mini game made at a game jam. Replace with the real description.', link: '#', hue: 140 },
  ],
}

export const ui: L<{ back: string; play: string; all: string; count: (n: number) => string; skillsLead: string; gamesLead: string; projectsLead: string }> = {
  pt: {
    back: 'Voltar para a mesa',
    play: 'Jogar',
    all: 'Todos',
    count: (n) => `${n} itens`,
    skillsLead: 'O que está dentro da máquina: ferramentas, linguagens e o quanto eu uso cada uma.',
    gamesLead: 'Jogos que eu criei, de jams a protótipos. Clique para jogar.',
    projectsLead: 'Seleção de personagens, cenários, props e interfaces.',
  },
  en: {
    back: 'Back to the desk',
    play: 'Play',
    all: 'All',
    count: (n) => `${n} items`,
    skillsLead: "What's inside the machine: tools, languages and how much I use each one.",
    gamesLead: 'Games I made, from jams to prototypes. Click to play.',
    projectsLead: 'A selection of characters, environments, props and interfaces.',
  },
}
