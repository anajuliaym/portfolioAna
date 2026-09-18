import { createContext, useContext, useState, ReactNode } from 'react'

export type Lang = 'pt' | 'en'

const dict = {
  pt: {
    hero_title: 'PORTFOLIO',
    hero_name: 'Ana Julia Yaguti Matilha',
    hero_hint: 'clique para girar',
    desk_kicker: '02 — Menu',
    desk_title: 'Minha mesa',
    desk_sub: 'Cada objeto leva a uma parte do portfólio. O controle abre os jogos que eu criei.',
    hs_projects: 'Projetos',
    hs_about: 'Sobre',
    hs_contact: 'Contato',
    hs_skills: 'Skills',
    hs_games: 'Jogos',
    coming: 'Em breve',
    close: 'Fechar',
    sk_hint: 'Passe o mouse ou toque em um logo para saber mais',
    sk_level: 'Domínio',
    sk_since: 'desde',
    sk_area: 'Área',
    sk_back: 'Esc ou clique fora para voltar',
    gw_start: 'Clique no fliperama para jogar',
    gw_touch: 'Arraste o joystick ou toque numa máquina',
    gw_keys: 'A / D ou setas para andar · E para inserir ficha · Esc para sair',
    gw_coin: 'Inserindo ficha…',
    gw_back_arcade: 'Voltar ao fliperama',
    gw_loading: 'Carregando o jogo…',
    gw_full: 'Tela cheia',
    gw_external: 'Abrir no GX.games',
    gw_embed_hint: 'Clique no jogo para ele receber o teclado',
    gw_open: 'Inserir ficha — E ou clique na tela',
  },
  en: {
    hero_title: 'PORTFOLIO',
    hero_name: 'Ana Julia Yaguti Matilha',
    hero_hint: 'click to spin',
    desk_kicker: '02 — Menu',
    desk_title: 'My desk',
    desk_sub: 'Every object leads to a part of the portfolio. The controller opens the games I made.',
    hs_projects: 'Projects',
    hs_about: 'About',
    hs_contact: 'Contact',
    hs_skills: 'Skills',
    hs_games: 'Games',
    coming: 'Coming soon',
    close: 'Close',
    sk_hint: 'Hover or tap a logo to learn more',
    sk_level: 'Proficiency',
    sk_since: 'since',
    sk_area: 'Area',
    sk_back: 'Esc or click outside to go back',
    gw_start: 'Click the arcade to play',
    gw_touch: 'Drag the joystick or tap a machine',
    gw_keys: 'A / D or arrows to walk · E to insert coin · Esc to leave',
    gw_coin: 'Inserting coin…',
    gw_back_arcade: 'Back to the arcade',
    gw_loading: 'Loading the game…',
    gw_full: 'Fullscreen',
    gw_external: 'Open on GX.games',
    gw_embed_hint: 'Click the game so it gets the keyboard',
    gw_open: 'Insert coin — E or click the screen',
  },
} as const

export type Key = keyof typeof dict.pt

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string }>({
  lang: 'pt',
  setLang: () => {},
  t: (k) => k,
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('pt')
  const t = (k: Key) => dict[lang][k]
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>
}

export const useI18n = () => useContext(Ctx)
