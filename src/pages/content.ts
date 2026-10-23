import type { HotspotId } from '../components/DeskScene'
import type { Lang } from '../i18n'
import { fragmentsGame } from './fragments'
import boraCover from '../assets/protos/bora-icon.svg'
import bridgeCover from '../assets/protos/bridge-cover.png'
import csvIcon from '../assets/protos/csv-icon.svg'
import orcIcon from '../assets/protos/orcamentaria-icon.svg'
import crachasIcon from '../assets/protos/crachas-icon.svg'

/** URL of each desk hotspot */
export const ROUTES: Record<HotspotId, string> = {
  projects: '/projetos',
  about: '/sobre',
  contact: '/contato',
  skills: '/skills',
  games: '/jogos',
}

type L<T> = Record<Lang, T>

/** the Bora? demo build (scripts/bora-demo/build.sh → public/protos/bora); index.html explicitly, so no SPA fallback can catch it */
const BORA_APP = '/protos/bora/index.html'
/** the Bridge demo build (scripts/bridge-demo/build.sh → public/protos/bridge) */
const BRIDGE_APP = '/protos/bridge/index.html'
/** the CSV comparer demo build (scripts/csv-demo/build.sh → public/protos/csv) */
const CSV_APP = '/protos/csv/index.html'
/** the Orçamentária clickable prototype (scripts/orcamentaria-demo/build.sh → public/protos/orcamentaria) */
const ORC_APP = '/protos/orcamentaria/index.html'
/** the badge-management clickable prototype, anonymized (scripts/crachas-demo/build.sh → public/protos/crachas) */
const CRACHAS_APP = '/protos/crachas/index.html'

/**
 * Projects for /projetos, browsed inside the 3D phone (mobile) or notebook (web). Every one is an app that runs on the
 * device: a live build of the real app or a clickable prototype made from its screens (`prototype`), with an icon
 * (`cover`), its colour and a write-up (`about`). Ana's real content.
 */
export type Proto = {
  title: string; desc: string; tags: string[]; cover?: string
  /** the app itself (same origin, public/protos/…): a live build or a clickable prototype, loaded only when opened */
  app: string
  /** the status-bar strip around the island, in the app's own colour (dark apps get light buttons) */
  appBar?: { bg: string; dark?: boolean }
  /** the app's own colour: tints its card in the device list */
  accent?: string
  /** a clickable prototype built from screens (not the running app): the badge says so */
  prototype?: boolean
  /** the longer write-up, opened from the "sobre" button over the running app */
  about?: { lead: string; points: string[]; stack: string[]; note?: string }
}
export const protos: L<{ mobile: Proto[]; web: Proto[] }> = {
  pt: {
    mobile: [
      {
        title: 'Bora?', desc: 'Rede social gamificada para descobrir e viver rolês: mapa, check-in com foto, desafios com XP e um álbum 3D.',
        tags: ['React', 'three.js', 'UX', 'Gamificação'], cover: boraCover, app: BORA_APP, appBar: { bg: '#e2f1f8' }, accent: '#f2a3c4',
        about: {
          lead: 'Combinar um rolê hoje se espalha entre grupos de WhatsApp e stories, e as fotos da noite se perdem no feed. O Bora? junta "onde vamos" com "o que rolou": descobrir eventos perto de você, provar presença com uma foto no local e guardar a memória num álbum.',
          points: [
            'Feed dos amigos e rolês por mapa, filtros de data, distância, preço e categoria',
            'Check-in fotográfico: a câmera só libera no local, com filtros em tempo real, e a foto sai de uma Polaroid 3D',
            'Desafios diários com XP, níveis e ranking entre amigos',
            'Álbum scrapbook 3D: um livro de 6 páginas com fotos, adesivos arrastáveis e texto',
            'Mapa de São Paulo modelado como grafo: vizinhos, locais num raio e rota (Dijkstra)',
          ],
          stack: ['React', 'Vite', 'three.js', 'Leaflet', 'Spring Boot', 'H2', 'Supabase'],
          note: 'Versão de demonstração com dados de exemplo: o login aceita qualquer coisa, o mapa usa dados locais e a câmera pede permissão (sem ela, entra uma foto de exemplo).',
        },
      },
      {
        title: 'Bridge', desc: 'Conexões profissionais sem burocracia: talentos, freelancers e empresas dão match num swipe e já conversam.',
        tags: ['React', 'TanStack', 'UX', 'Matching'], cover: bridgeCover, app: BRIDGE_APP, appBar: { bg: '#06000f', dark: true }, accent: '#8b5cf6',
        about: {
          lead: 'Achar um freelancer, um projeto ou a próxima vaga ainda passa por currículo, formulário e espera. O Bridge troca isso por um gesto: profissionais, freelancers e empresas se encontram num deck de cartas, dão match e já conversam.',
          points: [
            'Deck de perfis com swipe: match, pular e desfazer',
            'Recomendação por habilidades, por proximidade ou híbrida (ordenação por pontuação)',
            'Filtros de distância, modalidade, tipo de contrato, área e habilidades',
            'Conexões e chat direto depois do match',
            'Perfil com experiência, avaliação e portfólio de projetos',
          ],
          stack: ['React', 'TanStack Router', 'Tailwind', 'Radix UI', 'Cloudflare Workers', 'D1', 'R2'],
          note: 'Versão de demonstração: o servidor roda aqui mesmo no navegador, com perfis de exemplo; qualquer e-mail e senha entram, e nada é salvo.',
        },
      },
    ],
    web: [
      {
        title: 'Orçamentária', desc: 'Orçamento de obras de infraestrutura num só lugar: quantitativos do BIM, base de preços, composição, cenários e relatórios.',
        tags: ['UI', 'Dashboard', 'Data viz', 'Figma'], cover: orcIcon, app: ORC_APP, prototype: true, appBar: { bg: '#232323', dark: true }, accent: '#f97316',
        about: {
          lead: 'Orçar uma rodovia, um metrô ou um aeroporto junta planilhas, bases de preço (SINAPI, PINI), quantitativos tirados do BIM e muitas versões. A Orçamentária centraliza tudo: cadastra o projeto com o modelo 3D, levanta os quantitativos com a origem e a confiança de cada item, atualiza os preços, compõe o orçamento, simula cenários e exporta os relatórios.',
          points: [
            'Painel com projetos ativos, orçamentos em elaboração, variação contra a referência e alertas de inconsistência',
            'Cadastro do projeto com upload de PDF, Excel, BIM e DWG e visualização 3D do ativo',
            'Quantitativos com origem (BIM ou manual) e grau de confiança por item',
            'Base de preços que compara referência e preço atual por fonte (SINAPI, PINI)',
            'Composição por etapa, simulação de cenários (otimista, pessimista, realista) e relatórios em PDF, Excel e CSV',
          ],
          stack: ['UI design', 'Dashboard', 'Visualização de dados', 'Figma'],
          note: 'Protótipo navegável montado a partir das telas: clique no menu, nas abas e nos botões.',
        },
      },
      {
        title: 'Gestão de Crachás', desc: 'Do pedido à entrega do crachá: solicitação em etapas, rastreamento, aprovação com SLA, lotes de impressão e comprovação.',
        tags: ['UX', 'UI', 'Fluxos', 'Figma'], cover: crachasIcon, app: CRACHAS_APP, prototype: true, appBar: { bg: '#ffffff' }, accent: '#34d399',
        about: {
          lead: 'Pedir, aprovar, imprimir e entregar crachás numa empresa grande passava por e-mail, planilha e telefone. O sistema junta o fluxo inteiro: o colaborador pede em quatro etapas, vendo o crachá tomar forma na prévia, e acompanha cada fase; a gestão aprova numa fila com SLA, agrupa lotes de impressão e comprova a entrega com foto e assinatura.',
          points: [
            'Solicitação em 4 etapas (dados, foto, modelo e permissões de acesso) com prévia do crachá ao vivo',
            'Rastreamento em 7 fases, da solicitação à ativação, com prazo de cada etapa',
            'Dashboard gerencial: tempo médio de emissão, ativação automática, solicitações críticas, custo e SLA',
            'Fila de aprovação com SLA e produção em lotes, com etiquetas e relatórios',
            'Entrega comprovada com foto e assinatura digital',
          ],
          stack: ['UX', 'UI design', 'Fluxos', 'Figma'],
          note: 'Protótipo navegável montado a partir das telas, com a marca do cliente trocada por uma fictícia. Use "Visão" para alternar entre colaborador e gestão.',
        },
      },
      {
        title: 'CSV Matcher', desc: 'Compara duas planilhas e encontra os registros em comum por e-mail, nome ou os dois, tudo no navegador, sem enviar dados.',
        tags: ['React', 'TypeScript', 'Tailwind', 'Figma Make'], cover: csvIcon, app: CSV_APP, appBar: { bg: '#f9fafb' }, accent: '#818cf8',
        about: {
          lead: 'Cruzar a lista de afiliados com a planilha de vendas era feito à mão, linha por linha. O CSV Matcher faz isso em segundos: carregue os dois arquivos, escolha o critério e baixe os registros que batem, com as colunas dos dois lados.',
          points: [
            'Arrastar e soltar os dois arquivos, ou escolher do computador',
            'Reconhece as colunas sozinho: "nome", "Nome Completo", "e-mail", "E-mail"…, em português ou inglês',
            'Compara por e-mail, por nome ou pelos dois, com busca em mapa (rápida mesmo em planilhas grandes)',
            'Quando um registro aparece mais de uma vez (várias compras), traz todas as linhas',
            'Exporta o resultado em CSV; nenhum dado sai do computador',
          ],
          stack: ['React', 'TypeScript', 'Tailwind', 'Papa Parse', 'Figma Make'],
          note: 'Demonstração: use o botão "Usar arquivos de exemplo" (dados fictícios) ou os seus próprios CSVs. O processamento é todo local.',
        },
      },
    ],
  },
  en: {
    mobile: [
      {
        title: 'Bora?', desc: 'A gamified social network for finding and going out to events: map, photo check-in, XP challenges and a 3D album.',
        tags: ['React', 'three.js', 'UX', 'Gamification'], cover: boraCover, app: BORA_APP, appBar: { bg: '#e2f1f8' }, accent: '#f2a3c4',
        about: {
          lead: 'Making plans today is scattered across group chats and stories, and the photos of the night get lost in the feed. Bora? brings "where are we going" and "what happened" together: find events near you, prove you were there with a photo on site, and keep the memory in an album.',
          points: [
            'Friends\' feed and events on a map, with date, distance, price and category filters',
            'Photo check-in: the camera only unlocks on site, with live filters, and the photo comes out of a 3D Polaroid',
            'Daily challenges with XP, levels and a friends\' leaderboard',
            '3D scrapbook album: a 6-page book with photos, draggable stickers and text',
            'São Paulo modelled as a graph: neighbours, places within a radius and routes (Dijkstra)',
          ],
          stack: ['React', 'Vite', 'three.js', 'Leaflet', 'Spring Boot', 'H2', 'Supabase'],
          note: 'Demo build with sample data: any login works, the map uses local data and the camera asks for permission (without it, a sample photo is used).',
        },
      },
      {
        title: 'Bridge', desc: 'Professional connections without the red tape: talent, freelancers and companies match with a swipe and start talking.',
        tags: ['React', 'TanStack', 'UX', 'Matching'], cover: bridgeCover, app: BRIDGE_APP, appBar: { bg: '#06000f', dark: true }, accent: '#8b5cf6',
        about: {
          lead: 'Finding a freelancer, a project or the next job still means CVs, forms and waiting. Bridge swaps that for a gesture: professionals, freelancers and companies meet in a deck of cards, match, and start talking.',
          points: [
            'Swipeable profile deck: match, skip and undo',
            'Recommendations by skills, by distance or hybrid (score-based ranking)',
            'Filters for distance, work mode, contract type, field and skills',
            'Connections and direct chat after a match',
            'Profiles with experience, rating and a project portfolio',
          ],
          stack: ['React', 'TanStack Router', 'Tailwind', 'Radix UI', 'Cloudflare Workers', 'D1', 'R2'],
          note: 'Demo build: the server runs right here in the browser with sample profiles; any e-mail and password sign in, and nothing is stored.',
        },
      },
    ],
    web: [
      {
        title: 'Orçamentária', desc: 'Budgeting for infrastructure works in one place: BIM quantities, price base, cost breakdown, scenarios and reports.',
        tags: ['UI', 'Dashboard', 'Data viz', 'Figma'], cover: orcIcon, app: ORC_APP, prototype: true, appBar: { bg: '#232323', dark: true }, accent: '#f97316',
        about: {
          lead: 'Budgeting a highway, a subway or an airport means spreadsheets, price bases (SINAPI, PINI), quantities taken from BIM and many versions. Orçamentária brings it together: register the project with its 3D model, survey quantities with each item\'s source and confidence, update prices, build the budget, simulate scenarios and export reports.',
          points: [
            'Dashboard with active projects, budgets in progress, variance against the reference and inconsistency alerts',
            'Project registration with PDF, Excel, BIM and DWG upload and a 3D view of the asset',
            'Quantities with their source (BIM or manual) and a confidence level per item',
            'A price base comparing reference and current prices by source (SINAPI, PINI)',
            'Cost breakdown by stage, scenario simulation (optimistic, pessimistic, realistic) and PDF, Excel and CSV reports',
          ],
          stack: ['UI design', 'Dashboard', 'Data visualisation', 'Figma'],
          note: 'Clickable prototype built from the screens: click the menu, the tabs and the buttons.',
        },
      },
      {
        title: 'Gestão de Crachás', desc: 'From request to delivery of an ID badge: step-by-step request, tracking, SLA approvals, print batches and proof of delivery.',
        tags: ['UX', 'UI', 'Flows', 'Figma'], cover: crachasIcon, app: CRACHAS_APP, prototype: true, appBar: { bg: '#ffffff' }, accent: '#34d399',
        about: {
          lead: 'Requesting, approving, printing and delivering ID badges in a large company went through e-mail, spreadsheets and phone calls. The system covers the whole flow: employees request in four steps, watching the badge take shape in a live preview, and follow every stage; managers approve in an SLA queue, batch the printing and prove delivery with a photo and a signature.',
          points: [
            'A 4-step request (details, photo, model and access permissions) with a live badge preview',
            'Tracking in 7 stages, from request to activation, with each stage\'s time frame',
            'Management dashboard: average issuing time, automatic activation, critical requests, cost and SLA',
            'An SLA approval queue and batch production, with labels and reports',
            'Delivery proven with a photo and a digital signature',
          ],
          stack: ['UX', 'UI design', 'Flows', 'Figma'],
          note: 'Clickable prototype built from the screens, with the client\'s brand swapped for a fictional one. Use "Visão" to switch between the employee and the management views.',
        },
      },
      {
        title: 'CSV Matcher', desc: 'Compares two spreadsheets and finds the records they share by e-mail, name or both, all in the browser, no data sent anywhere.',
        tags: ['React', 'TypeScript', 'Tailwind', 'Figma Make'], cover: csvIcon, app: CSV_APP, appBar: { bg: '#f9fafb' }, accent: '#818cf8',
        about: {
          lead: 'Matching the affiliate list against the sales sheet was done by hand, row by row. CSV Matcher does it in seconds: load both files, pick the criterion and download the matching records, with the columns from both sides.',
          points: [
            'Drag and drop both files, or pick them from the computer',
            'Finds the columns on its own: "nome", "Full Name", "e-mail", "Email"…, in Portuguese or English',
            'Matches by e-mail, by name or either, using map lookups (fast even on large sheets)',
            'When a record appears more than once (several purchases), every row comes back',
            'Exports the result as CSV; no data leaves the computer',
          ],
          stack: ['React', 'TypeScript', 'Tailwind', 'Papa Parse', 'Figma Make'],
          note: 'Demo: use the "Usar arquivos de exemplo" button (fictional data) or your own CSVs. Everything is processed locally.',
        },
      },
    ],
  },
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
export type Experience = { period: string; title: string; org: string; desc: string; design: string[]; tech: string[]; cover: string }
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
      { period: 'mai 2025 a hoje', title: 'Estagiária', org: 'PCA Engenharia de Software · São Paulo', desc: 'Estágio de meio período em que as telas que eu desenho no Figma viram o código que eu mesma escrevo. Fui eu que propus usar o Claude para prototipar e desenvolver na empresa, e mostrei na prática que funcionava.', cover: 'lily-pink',
        design: ['Telas e protótipos no Figma', 'Fluxos e UX junto do time de produto'], tech: ['Prototipação e desenvolvimento com Claude, que eu trouxe para a empresa', 'Vários projetos vendidos a clientes e de pesquisa e desenvolvimento'] },
      { period: 'set 2025 a set 2026', title: 'Bolsista de Iniciação Tecnológica', org: 'CNPq · Universidade Presbiteriana Mackenzie', desc: 'Pesquisa “FRAGMENTS: um jogo digital destinado ao estímulo das funções executivas em estudantes universitários”.', cover: 'lily-green',
        design: ['Game design das quatro fases, uma por função executiva', 'Arte, narrativa e a história da Layla'], tech: ['Programação em GameMaker', 'Avaliação com 30 participantes (GEQ) · publicado no GX.games'] },
      { period: 'fev 2024 a dez 2027', title: 'Ciência da Computação', org: 'Universidade Presbiteriana Mackenzie', desc: 'Graduação em andamento, com foco em jogos, computação gráfica e interação humano-computador.', cover: 'lily-purple',
        design: ['Interação humano-computador', 'Computação gráfica'], tech: ['Algoritmos e estruturas de dados', 'Python, GameMaker'] },
      { period: '2021 a 2023', title: 'Certificado IB', org: 'Escola Internacional de Alphaville', desc: 'Certificado do International Baccalaureate, feito junto do ensino médio, onde as duas linhas começam.', cover: 'bunny-blue', design: [], tech: [] },
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
      { period: 'May 2025 to today', title: 'Intern', org: 'PCA Engenharia de Software · São Paulo', desc: 'Part-time internship where the screens I design in Figma become the code I write myself. I was the one who proposed using Claude to prototype and build at the company, and showed in practice that it worked.', cover: 'lily-pink',
        design: ['Screens and prototypes in Figma', 'Flows and UX with the product team'], tech: ['Prototyping and development with Claude, which I brought to the company', 'Several projects sold to clients and for research and development'] },
      { period: 'Sep 2025 to Sep 2026', title: 'CNPq Technological Initiation Fellow', org: 'CNPq · Mackenzie Presbyterian University', desc: 'Research “FRAGMENTS: a digital game to stimulate executive functions in university students”.', cover: 'lily-green',
        design: ['Game design of the four phases, one per executive function', 'Art, narrative and Layla’s story'], tech: ['Programming in GameMaker', 'Evaluation with 30 participants (GEQ) · published on GX.games'] },
      { period: 'Feb 2024 to Dec 2027', title: 'Computer Science', org: 'Mackenzie Presbyterian University', desc: 'Ongoing degree, focused on games, computer graphics and human-computer interaction.', cover: 'lily-purple',
        design: ['Human-computer interaction', 'Computer graphics'], tech: ['Algorithms and data structures', 'Python, GameMaker'] },
      { period: '2021 to 2023', title: 'IB Certificate', org: 'Escola Internacional de Alphaville', desc: 'International Baccalaureate certificate, taken alongside high school, where both threads begin.', cover: 'bunny-blue', design: [], tech: [] },
    ],
  },
}

export const contact: L<{ email: string; links: [string, string][]; form: { name: string; email: string; msg: string; send: string } }> = {
  pt: {
    email: 'anajuliayagutimatilha@gmail.com',
    links: [['Instagram', 'https://www.instagram.com/anajuliaym/'], ['LinkedIn', 'https://www.linkedin.com/in/ana-julia-yaguti-matilha-6a8412276/']],
    form: { name: 'Seu nome', email: 'Seu e-mail', msg: 'Mensagem', send: 'Enviar' },
  },
  en: {
    email: 'anajuliayagutimatilha@gmail.com',
    links: [['Instagram', 'https://www.instagram.com/anajuliaym/'], ['LinkedIn', 'https://www.linkedin.com/in/ana-julia-yaguti-matilha-6a8412276/']],
    form: { name: 'Your name', email: 'Your e-mail', msg: 'Message', send: 'Send' },
  },
}

export type Tool = { id: string; name: string; names?: L<string>; area: L<string>; desc: L<string> } // `names` when the name is translated (concepts)

// Jogos 02 e 03 vieram do portfólio Canva da Ana (anamatilha.my.canva.site): Memorize It! = Personal Project, Kardec's House = CAS, os dois no ensino médio (IB).
// descrições a partir do que a Ana fez (projetos, estágio, Fragments) e do curso de Ciência da Computação do Mackenzie (2026-10-23)
export const tools: Tool[] = [
  { id: 'figma', name: 'Figma', area: { pt: 'Design', en: 'Design' }, desc: { pt: 'Onde as ideias viram tela: wireframes, protótipos navegáveis e componentes reutilizáveis. No estágio desenho no Figma as telas que depois eu mesma transformo em código.', en: 'Where ideas become screens: wireframes, clickable prototypes and reusable components. At my internship I design in Figma the screens I then build in code myself.' } },
  { id: 'uiux', name: 'UI & UX', area: { pt: 'Design', en: 'Design' }, desc: { pt: 'Pensar em quem vai usar: fluxos, hierarquia visual, acessibilidade e teste com pessoas. Uso no dia a dia do estágio, desenhando fluxos e telas junto do time de produto. Estudo Interação Humano-Computador no Mackenzie e avaliei o Fragments com 30 jogadores, usando o questionário GEQ.', en: 'Designing for the people who use it: flows, visual hierarchy, accessibility and testing with real users. I use it every day at my internship, designing flows and screens with the product team. I study Human-Computer Interaction at Mackenzie and evaluated Fragments with 30 players using the GEQ questionnaire.' } },
  { id: 'react', name: 'React', area: { pt: 'Programação', en: 'Programming' }, desc: { pt: 'Interfaces web em React com TypeScript e Vite. O Bora? roda assim, e este portfólio também, com Three.js e React Three Fiber para o 3D.', en: 'Web interfaces in React with TypeScript and Vite. Bora? runs on it, and so does this portfolio, with Three.js and React Three Fiber for the 3D.' } },
  { id: 'python', name: 'Python', area: { pt: 'Programação', en: 'Programming' }, desc: { pt: 'A primeira linguagem do curso de Ciência da Computação: algoritmos, estruturas de dados e lógica de programação, além de scripts para automatizar tarefas e tratar dados.', en: 'The first language of my Computer Science degree: algorithms, data structures and programming logic, plus scripts to automate tasks and handle data.' } },
  { id: 'java', name: 'Java', area: { pt: 'Programação', en: 'Programming' }, desc: { pt: 'Orientação a objetos no Mackenzie: classes, herança, interfaces, coleções e boas práticas de projeto. É também a linguagem do back-end do Bora?, em Spring Boot.', en: 'Object-oriented programming at Mackenzie: classes, inheritance, interfaces, collections and design best practices. It is also the language of Bora?’s back end, in Spring Boot.' } },
  { id: 'git', name: 'Git', area: { pt: 'Ferramentas', en: 'Tools' }, desc: { pt: 'Versiono tudo com Git: branches, commits pequenos e pull requests. Uso o GitHub nos projetos pessoais e da faculdade, como este site, e o Azure DevOps no estágio, com repositórios, pipelines e o quadro de tarefas do time.', en: 'I version everything with Git: branches, small commits and pull requests. I use GitHub for personal and university projects, like this site, and Azure DevOps at my internship, with repos, pipelines and the team’s task board.' } },
  { id: 'claude', name: 'Claude', area: { pt: 'IA', en: 'AI' }, desc: { pt: 'Meu par de programação. No estágio, fui eu que propus usar o Claude para prototipar e desenvolver: comecei, mostrei que funcionava e ajudei a mudar o jeito de trabalhar da empresa, com vários projetos vendidos a clientes e de pesquisa e desenvolvimento. Este portfólio em 3D também foi feito assim, comigo dirigindo cada detalhe.', en: 'My pair programmer. At my internship I was the one who proposed using Claude to prototype and build: I started it, showed it worked and helped change how the company works, with several projects sold to clients and for research and development. This 3D portfolio was made the same way, with me directing every detail.' } },
  { id: 'gamemaker', name: 'GameMaker', area: { pt: 'Jogos', en: 'Games' }, desc: { pt: 'Onde faço meus jogos, da programação em GML ao level design e à arte: Fragments (minha pesquisa de iniciação tecnológica, publicado no GX.games), Memorize It! e Kardec’s House.', en: 'Where I make my games, from GML programming to level design and art: Fragments (my research project, published on GX.games), Memorize It! and Kardec’s House.' } },
  { id: 'procreate', name: 'Procreate', area: { pt: 'Ilustração', en: 'Illustration' }, desc: { pt: 'Onde eu desenho no iPad: ilustração, esboços e concept art. É onde personagens, cenários e a parte visual dos meus projetos ganham forma antes de virar tela ou jogo.', en: 'Where I draw on the iPad: illustration, sketches and concept art. It is where characters, settings and the look of my projects take shape before they become screens or games.' } },
  { id: 'nomad', name: 'Nomad Sculpt', area: { pt: 'Escultura 3D', en: '3D sculpting' }, desc: { pt: 'Escultura digital no iPad: modelo personagens e objetos em 3D, do bloco de argila ao detalhe. É a ponte entre o desenho e a computação gráfica que estudo no curso.', en: 'Digital sculpting on the iPad: I model characters and objects in 3D, from a lump of clay to the details. It is the bridge between drawing and the computer graphics I study.' } },
  { id: 'canva', name: 'Canva', area: { pt: 'Design', en: 'Design' }, desc: { pt: 'Para peças rápidas e bem acabadas: apresentações, posts e materiais de divulgação. Meu primeiro portfólio foi feito no Canva.', en: 'For quick, polished pieces: presentations, posts and promotional material. My first portfolio was made in Canva.' } },
  { id: 'criatividade', name: 'Criatividade', names: { pt: 'Criatividade', en: 'Creativity' }, area: { pt: 'Conceito', en: 'Concept' }, desc: { pt: 'O que une design e código: desenho, coleciono referências, testo muitas versões e não tenho medo de recomeçar. Este portfólio, com uma lagoa, uma máquina de pelúcia e uma ruazinha, é o melhor exemplo.', en: 'What ties design and code together: I sketch, collect references, try many versions and am not afraid to start over. This portfolio, with a pond, a claw machine and a little street, is the best example.' } },
]

/**
 * `embed` = URL do runner do GX.games (play.gx.games/game-wrapper/…) que roda dentro de um iframe.
 * Descoberto em 2026-09-18: a página gx.games/games/… não permite iframe (X-Frame-Options), mas o
 * runner permite; precisa de game + track + release na query (gamePlayId é opcional — geramos um).
 * Se a Ana publicar uma versão nova no GX.games, o `release` muda: pegar a URL nova com
 * `curl -X POST https://api.gx.games/gxc/v2/games/<gameId>/play` (campo launchUrl).
 */
export type GameEntry = { title: string; engine: string; platform: string; year: string; desc: string; link?: string; embed?: string; dossier?: 'fragments' | 'memorize' | 'kardec'; hue: number }
export const games: L<GameEntry[]> = {
  pt: [
    fragmentsGame.pt,
    { title: 'Memorize It!', engine: 'GameMaker', platform: 'PC', year: 'Ensino médio', dossier: 'memorize', desc: 'Jogo 2D que testa a sua memória. Você navega por salas, memoriza a posição das moedas e, ao entrar na sala seguinte, usa uma “arma” para atirar só nas moedas que estavam na sala anterior, ignorando as novas. Um jeito divertido de desafiar e treinar a memória enquanto joga.', hue: 150 },
    { title: 'Kardec’s House', engine: 'GameMaker', platform: 'PC', year: 'Ensino médio', dossier: 'kardec', desc: 'Você é um(a) protagonista à procura do melhor amigo, Ivor, que desapareceu misteriosamente. As pistas levam a uma mansão abandonada e sinistra, a Casa de Kardec, sobre a qual os moradores da cidade sussurram histórias de eventos sobrenaturais e rituais ocultos. Explorando os ambientes assustadores da casa, você descobre segredos perturbadores, enfrenta entidades sinistras e desvenda a verdade por trás do desaparecimento de Ivor.', hue: 320 },
  ],
  en: [
    fragmentsGame.en,
    { title: 'Memorize It!', engine: 'GameMaker', platform: 'PC', year: 'High school', dossier: 'memorize', desc: 'A 2D game that tests your memory. You move through rooms, memorise where the coins are and, in the next room, use a “gun” to shoot only the coins that were in the previous room, ignoring the new ones. A fun way to challenge and train your memory while playing.', hue: 150 },
    { title: 'Kardec’s House', engine: 'GameMaker', platform: 'PC', year: 'High school', dossier: 'kardec', desc: 'You play a protagonist desperately searching for their best friend, Ivor, who vanished mysteriously. The clues lead to an abandoned, sinister mansion, Kardec’s House, about which the townspeople whisper stories of supernatural events and occult rituals. Exploring the house’s eerie rooms, you uncover disturbing secrets, face sinister entities and unravel the truth behind Ivor’s disappearance.', hue: 320 },
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
