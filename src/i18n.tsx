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
    scr_tab1: 'Protótipos', scr_tab2: 'Modelos', scr_tab3: 'Sobre',
    scr_meta: 'preview — em desenvolvimento',
    scr_kicker: 'Seleção 2026',
    scr_title: 'Protótipos',
    scr_card1: 'Personagem', scr_card2: 'Cenário', scr_card3: 'Interface',
    sk_hint: 'Passe o mouse ou toque em um logo para saber mais',
    sk_level: 'Domínio',
    sk_since: 'desde',
    sk_area: 'Área',
    sk_back: 'Esc ou clique fora para voltar',
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
    scr_tab1: 'Prototypes', scr_tab2: 'Models', scr_tab3: 'About',
    scr_meta: 'preview — in progress',
    scr_kicker: 'Selected 2026',
    scr_title: 'Prototypes',
    scr_card1: 'Character', scr_card2: 'Environment', scr_card3: 'Interface',
    sk_hint: 'Hover or tap a logo to learn more',
    sk_level: 'Proficiency',
    sk_since: 'since',
    sk_area: 'Area',
    sk_back: 'Esc or click outside to go back',
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
