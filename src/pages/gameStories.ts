/**
 * Copy for the Memorize It! and Kardec's House pages. Facts come from Ana: Memorize It! was her IB Personal Project in
 * high school, Kardec's House her IB CAS project; both solo GameMaker games. The videos come from her Canva portfolio
 * (anamatilha.my.canva.site); Kardec's is cut to the game itself (2026-10-23, Ana: "não precisa de bastidores").
 */
type L<T> = { pt: T; en: T }

export type StoryId = 'memorize' | 'kardec'

export type Story = {
  kicker: L<string>
  about: L<string[]>
  facts: L<[string, string][]>
  video: { src: string; poster: string }
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
    video: { src: '/games/memorize.mp4', poster: '/games/memorize-poster.webp' },
  },
  kardec: {
    kicker: { pt: 'CAS Project · IB Diploma', en: 'CAS Project · IB Diploma' },
    about: {
      pt: [
        'Kardec’s House foi o meu CAS Project no Diploma do IB, o programa de Criatividade, Atividade e Serviço. Fiz o jogo sozinha no GameMaker: roteiro, programação, arte e as salas da casa.',
        'Você é Hannah, à procura do melhor amigo, Ivor, que desapareceu depois de um telefonema cortado no meio. As pistas levam a uma mansão abandonada, a Casa de Kardec, de quem os moradores da cidade falam baixinho: eventos sobrenaturais, rituais ocultos. Na porta, Mr. Knotman já sabe o seu nome.',
      ],
      en: [
        'Kardec’s House was my CAS Project in the IB Diploma, the Creativity, Activity and Service programme. I made the game alone in GameMaker: story, code, art and the rooms of the house.',
        'You are Hannah, searching for your best friend, Ivor, who vanished after a phone call that cut off midway. The clues lead to an abandoned mansion, Kardec’s House, which the townspeople whisper about: supernatural events, occult rituals. At the door, Mr. Knotman already knows your name.',
      ],
    },
    facts: {
      pt: [['Projeto', 'CAS (IB Diploma)'], ['Quando', 'Ensino médio'], ['Engine', 'GameMaker'], ['Gênero', 'Terror · aventura 2D'], ['Personagens', 'Hannah, Ivor, Mr. Knotman'], ['Equipe', 'Projeto solo']],
      en: [['Project', 'CAS (IB Diploma)'], ['When', 'High school'], ['Engine', 'GameMaker'], ['Genre', '2D horror · adventure'], ['Characters', 'Hannah, Ivor, Mr. Knotman'], ['Team', 'Solo project']],
    },
    video: { src: '/games/kardec.mp4', poster: '/games/kardec-poster.webp' },
  },
}
