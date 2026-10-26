import PageShell from '../components/PageShell'
import { useI18n } from '../i18n'

/**
 * Credits (2026-10-23): the third-party 3D models still on the site, as their Creative Commons Attribution licences ask
 * (title, author, source, licence, and that they were changed), plus the fonts and the brand icons. Models that left the
 * site (succulents, "Day 150: Lily", "Cloud Test") are not listed.
 */
const BY = 'https://creativecommons.org/licenses/by/4.0/'
const MODELS: { title: string; author: string; href?: string; where: { pt: string; en: string } }[] = [
  { title: 'Claw machine (with textures)', author: 'octopushh', href: 'https://skfb.ly/6UypZ', where: { pt: 'a máquina das Skills', en: 'the Skills claw machine' } },
  { title: 'Arcade', author: 'Suushimi✨', href: 'https://skfb.ly/6WJ7K', where: { pt: 'as máquinas do fliperama', en: 'the arcade cabinets' } },
  { title: 'Vending Machine', author: '¡Jacques', href: 'https://skfb.ly/6UoYZ', where: { pt: 'a máquina de bebidas do fliperama e da rua', en: 'the drinks machine in the arcade and the street' } },
  { title: 'Lilies', author: 'sligocreatures', href: 'https://skfb.ly/6V9YF', where: { pt: 'os lírios da mesa e da rua', en: 'the lilies on the desk and in the street' } },
  { title: 'Cel Shaded Soda Cans', author: 'bicho.salem', href: 'https://skfb.ly/6VQux', where: { pt: 'as latas do menu da máquina de doces', en: 'the cans in the vending machine menu' } },
  { title: 'Low Poly Mobile Phone', author: 'kimmy.k', href: 'https://skfb.ly/owJHu', where: { pt: 'o celular da mesa', en: 'the phone on the desk' } },
]
const FONTS = ['Butler · Fabian De Smet', 'Instrument Serif, Inter, Nanum Pen Script, Pinyon Script · Google Fonts (SIL Open Font License)']

export default function Credits() {
  const { lang } = useI18n()
  const pt = lang === 'pt'
  return (
    <PageShell title={pt ? 'Créditos' : 'Credits'} className="credits">
      <div className="cr">
        <section>
          <h2>{pt ? 'Modelos 3D' : '3D models'}</h2>
          <p className="cr-note">
            {pt ? 'Modelos de outros artistas usados no site, sob a licença ' : 'Models by other artists used on the site, under the '}
            <a href={BY} target="_blank" rel="noopener noreferrer">Creative Commons Attribution 4.0</a>
            {pt ? '. Foram adaptados para o portfólio: recoloridos, recortados e otimizados.' : ' licence. They were adapted for the portfolio: recoloured, trimmed and optimised.'}
          </p>
          <ul>
            {MODELS.map((m) => (
              <li key={m.title}>
                <strong>{m.href ? <a href={m.href} target="_blank" rel="noopener noreferrer">“{m.title}” ↗</a> : `“${m.title}”`}</strong>
                <span>{pt ? 'por' : 'by'} {m.author} · CC BY 4.0</span>
                <small>{m.where[lang]}</small>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2>{pt ? 'Fontes' : 'Fonts'}</h2>
          <ul>{FONTS.map((f) => <li key={f}><span>{f}</span></li>)}</ul>
        </section>
        <section>
          <h2>{pt ? 'Ícones' : 'Icons'}</h2>
          <ul><li><span>{pt ? 'Logos de marcas na máquina das Skills baseados em ' : 'Brand logos in the Skills machine based on '}<a href="https://simpleicons.org" target="_blank" rel="noopener noreferrer">Simple Icons</a> (CC0).</span></li></ul>
        </section>
        <p className="cr-note">{pt ? 'Todo o resto, do desenho das páginas aos jogos, foi feito por mim.' : 'Everything else, from the page design to the games, was made by me.'}</p>
      </div>
    </PageShell>
  )
}
