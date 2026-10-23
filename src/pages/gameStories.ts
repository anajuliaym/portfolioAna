/**
 * Copy for the Memorize It! and Kardec's House pages (2026-10-23). Facts come from Ana: Memorize It! was her IB
 * Personal Project in high school, Kardec's House her IB CAS project; both solo GameMaker games (her Canva portfolio,
 * anamatilha.my.canva.site, where the two videos come from). Lines of dialogue are transcribed from the Kardec video.
 */
type L<T> = { pt: T; en: T }

export type StoryId = 'memorize' | 'kardec'
export type Chapter = { t: number; label: L<string> }
export type Still = { file: string; caption: L<string>; tag?: 'game' | 'dev' }

export type Story = {
  kicker: L<string>
  about: L<string[]>
  facts: L<[string, string][]>
  video: { src: string; poster: string; duration: number; chapters: Chapter[] }
  stills: Still[]
}

export const stories: Record<StoryId, Story> = {
  memorize: {
    kicker: { pt: 'Personal Project · IB · ensino médio', en: 'Personal Project · IB · high school' },
    about: {
      pt: [
        'Memorize It! nasceu no ensino médio, como o meu Personal Project do IB: o projeto pessoal que cada aluno escolhe e conduz sozinho do começo ao fim. O meu foi um jogo.',
        'Você atravessa as salas de uma floresta em pixel art, guarda na memória onde estão as moedas e, ao entrar na sala seguinte, usa uma "arma" para atirar só nas moedas que já estavam lá, ignorando as novas. Atirou na errada? A sala recomeça.',
      ],
      en: [
        'Memorize It! was born in high school as my IB Personal Project: the personal project each student picks and carries out alone from start to finish. Mine was a game.',
        'You cross the rooms of a pixel-art forest, memorise where the coins are and, when you step into the next room, use a "gun" to shoot only the coins that were already there, ignoring the new ones. Shot the wrong one? The room starts over.',
      ],
    },
    facts: {
      pt: [['Projeto', 'Personal Project (IB)'], ['Quando', 'Ensino médio'], ['Engine', 'GameMaker'], ['Gênero', 'Plataforma 2D · memória'], ['Equipe', 'Projeto solo']],
      en: [['Project', 'Personal Project (IB)'], ['When', 'High school'], ['Engine', 'GameMaker'], ['Genre', '2D platformer · memory'], ['Team', 'Solo project']],
    },
    video: {
      src: '/games/memorize.mp4', poster: '/games/memorize-poster.webp', duration: 145,
      chapters: [
        { t: 0, label: { pt: 'Tela inicial', en: 'Title screen' } },
        { t: 7, label: { pt: 'Primeira sala', en: 'First room' } },
        { t: 30, label: { pt: 'As regras', en: 'The rules' } },
        { t: 58, label: { pt: 'Salas e moedas', en: 'Rooms and coins' } },
        { t: 118, label: { pt: 'A subida', en: 'The climb' } },
        { t: 135, label: { pt: 'Fim da demo', en: 'End of the demo' } },
      ],
    },
    stills: [
      { file: '001', caption: { pt: 'Tela inicial', en: 'Title screen' } },
      { file: '017', caption: { pt: 'Moedas para guardar na memória', en: 'Coins to remember' } },
      { file: '033', caption: { pt: 'As regras: atirou na errada, a sala recomeça', en: 'The rules: shoot the wrong one and the room restarts' } },
      { file: '060', caption: { pt: 'Uma sala nova, moedas novas', en: 'A new room, new coins' } },
      { file: '122', caption: { pt: 'A subida', en: 'The climb' } },
      { file: '138', caption: { pt: 'Fim da demo', en: 'End of the demo' } },
    ],
  },
  kardec: {
    kicker: { pt: 'CAS Project · IB Diploma', en: 'CAS Project · IB Diploma' },
    about: {
      pt: [
        'Kardec’s House foi o meu CAS Project no Diploma do IB, o programa de Criatividade, Atividade e Serviço. Fiz o jogo sozinha no GameMaker: roteiro, programação, arte e as salas da casa.',
        'Você é Hannah, à procura do melhor amigo, Ivor, que desapareceu depois de um telefonema cortado no meio. As pistas levam a uma mansão abandonada, a Casa de Kardec, de quem os moradores da cidade falam baixinho: eventos sobrenaturais, rituais ocultos. Na porta, Mr. Knotman já sabe o seu nome.',
        'O vídeo mistura o jogo rodando com os bastidores: o código, os sprites e a montagem das salas no GameMaker.',
      ],
      en: [
        'Kardec’s House was my CAS Project in the IB Diploma, the Creativity, Activity and Service programme. I made the game alone in GameMaker: story, code, art and the rooms of the house.',
        'You are Hannah, searching for your best friend, Ivor, who vanished after a phone call that cut off midway. The clues lead to an abandoned mansion, Kardec’s House, which the townspeople whisper about: supernatural events, occult rituals. At the door, Mr. Knotman already knows your name.',
        'The video mixes the game running with what went on behind it: the code, the sprites and the rooms being built in GameMaker.',
      ],
    },
    facts: {
      pt: [['Projeto', 'CAS (IB Diploma)'], ['Quando', 'Ensino médio'], ['Engine', 'GameMaker'], ['Gênero', 'Terror · aventura 2D'], ['Personagens', 'Hannah, Ivor, Mr. Knotman'], ['Equipe', 'Projeto solo']],
      en: [['Project', 'CAS (IB Diploma)'], ['When', 'High school'], ['Engine', 'GameMaker'], ['Genre', '2D horror · adventure'], ['Characters', 'Hannah, Ivor, Mr. Knotman'], ['Team', 'Solo project']],
    },
    video: {
      src: '/games/kardec.mp4', poster: '/games/kardec-poster.webp', duration: 663,
      chapters: [
        { t: 0, label: { pt: 'No GameMaker', en: 'In GameMaker' } },
        { t: 16, label: { pt: 'O telefonema', en: 'The phone call' } },
        { t: 48, label: { pt: 'A floresta', en: 'The forest' } },
        { t: 58, label: { pt: 'A rua', en: 'The street' } },
        { t: 70, label: { pt: 'O portão', en: 'The gate' } },
        { t: 78, label: { pt: 'Mr. Knotman', en: 'Mr. Knotman' } },
        { t: 108, label: { pt: 'Dentro da casa', en: 'Inside the house' } },
        { t: 124, label: { pt: 'O olho', en: 'The eye' } },
        { t: 140, label: { pt: 'Código e sprites', en: 'Code and sprites' } },
        { t: 405, label: { pt: 'Tela inicial', en: 'Title screen' } },
        { t: 592, label: { pt: 'A entidade', en: 'The entity' } },
        { t: 628, label: { pt: 'Montando as salas', en: 'Building the rooms' } },
      ],
    },
    stills: [
      { file: '410', tag: 'game', caption: { pt: 'A tela inicial', en: 'The title screen' } },
      { file: '020', tag: 'game', caption: { pt: 'O telefonema de Ivor', en: 'Ivor’s phone call' } },
      { file: '040', tag: 'game', caption: { pt: 'A abertura em silhuetas', en: 'The opening, in silhouettes' } },
      { file: '050', tag: 'game', caption: { pt: 'A floresta', en: 'The forest' } },
      { file: '060', tag: 'game', caption: { pt: 'A rua', en: 'The street' } },
      { file: '072', tag: 'game', caption: { pt: 'O portão da casa', en: 'The gate of the house' } },
      { file: '080', tag: 'game', caption: { pt: 'Mr. Knotman na porta', en: 'Mr. Knotman at the door' } },
      { file: '110', tag: 'game', caption: { pt: 'Os corredores', en: 'The corridors' } },
      { file: '126', tag: 'game', caption: { pt: 'O olho', en: 'The eye' } },
      { file: '600', tag: 'game', caption: { pt: 'A entidade', en: 'The entity' } },
      { file: '145', tag: 'dev', caption: { pt: 'Bastidores: o código', en: 'Behind the scenes: the code' } },
      { file: '630', tag: 'dev', caption: { pt: 'Bastidores: montando as salas', en: 'Behind the scenes: building the rooms' } },
    ],
  },
}

/** the opening dialogue of Kardec's House, as it appears in the game (English only, like the game) */
export const KARDEC_LINES: { who: string; line: string }[] = [
  { who: 'Ivor', line: 'Hannah?!?' },
  { who: 'Hannah', line: 'Where are you?' },
  { who: 'Ivor', line: 'Come to the house aft...' },
  { who: 'Hannah', line: 'You know where Ivor is?' },
  { who: 'Mr.Knotman', line: 'Of course, Ms. Hannah I assume, he’s been waiting.' },
  { who: 'Hannah', line: 'Waiting for me!?' },
  { who: 'Mr.Knotman', line: 'Come on in.' },
]

export const ui: L<{
  watch: string; chapters: string; play: string; pause: string; mute: string; unmute: string; full: string
  gallery: string; all: string; game: string; dev: string; close: string; prev: string; next: string
  mg: { title: string; intro: string; start: string; look: string; shoot: string; level: string; wrong: string; next: string; won: string; again: string; coin: string }
  dlg: { title: string; intro: string; next: string; restart: string }
  lamp: { title: string; intro: string; found: string; eye: string; hannah: string; all: string }
}> = {
  pt: {
    watch: 'Assistir', chapters: 'Capítulos', play: 'Tocar', pause: 'Pausar', mute: 'Sem som', unmute: 'Com som', full: 'Tela cheia',
    gallery: 'Galeria', all: 'Tudo', game: 'No jogo', dev: 'Bastidores', close: 'Fechar', prev: 'Anterior', next: 'Próxima',
    mg: {
      title: 'Teste a sua memória', intro: 'A mesma ideia do jogo, em pequeno: olhe as moedas, depois atire só nas que já estavam lá.',
      start: 'Começar', look: 'Memorize as moedas…', shoot: 'Atire só nas moedas que já estavam aqui', level: 'Sala',
      wrong: 'Essa é nova! A sala recomeça.', next: 'Sala limpa!', won: 'Você passou pelas cinco salas.', again: 'Jogar de novo', coin: 'moeda',
    },
    dlg: { title: 'A abertura', intro: 'As primeiras falas do jogo. Clique ou aperte E para continuar.', next: 'Pressione E para continuar', restart: 'Ouvir de novo' },
    lamp: { title: 'Acenda a lanterna', intro: 'O corredor está escuro. Passe o mouse (ou o dedo) para iluminar e ache o que se esconde.', found: 'encontrados', eye: 'Um olho no meio das folhas.', hannah: 'Hannah, sozinha entre as colunas.', all: 'Você achou tudo. Melhor não ficar.' },
  },
  en: {
    watch: 'Watch', chapters: 'Chapters', play: 'Play', pause: 'Pause', mute: 'Sound off', unmute: 'Sound on', full: 'Full screen',
    gallery: 'Gallery', all: 'All', game: 'In the game', dev: 'Behind the scenes', close: 'Close', prev: 'Previous', next: 'Next',
    mg: {
      title: 'Test your memory', intro: 'The game’s idea, in miniature: look at the coins, then shoot only the ones that were already there.',
      start: 'Start', look: 'Memorise the coins…', shoot: 'Shoot only the coins that were already here', level: 'Room',
      wrong: 'That one is new! The room starts over.', next: 'Room cleared!', won: 'You made it through all five rooms.', again: 'Play again', coin: 'coin',
    },
    dlg: { title: 'The opening', intro: 'The first lines of the game. Click or press E to continue.', next: 'Press E to continue', restart: 'Hear it again' },
    lamp: { title: 'Light the lantern', intro: 'The corridor is dark. Move the mouse (or your finger) to light it and find what is hiding.', found: 'found', eye: 'An eye among the leaves.', hannah: 'Hannah, alone between the columns.', all: 'You found everything. Better not stay.' },
  },
}
