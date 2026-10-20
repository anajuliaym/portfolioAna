/**
 * Sending the contact letter through EmailJS (Ana, 2026-10-20: "vamos conectar no EmailJS, para mandar e-mail direto do
 * site"). The three ids come from Vite env vars (`.env.local` locally, Project Settings → Environment Variables on
 * Vercel); see `.env.example`. The EmailJS *public* key is designed to live in the browser, but it stays in module scope
 * here and is never written to storage. The SDK is loaded on demand, only when someone actually sends a letter.
 *
 * Abuse guards (OWASP A04 insecure design / A07 automated abuse): a honeypot field, a per-tab cooldown, length limits
 * and trimming. Real protection belongs in the EmailJS dashboard: restrict allowed origins to the site's domain and
 * turn on its reCAPTCHA / rate limit.
 */

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined

export const emailConfigured = Boolean(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY)

const COOLDOWN_MS = 45_000
let lastSentAt = 0

export const LIMITS = { name: 80, email: 120, message: 4000 } as const
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export type Letter = { name: string; email: string; message: string; date: string; lang: 'pt' | 'en'; honeypot?: string }
export type SendResult = 'sent' | 'not-configured' | 'cooldown' | 'invalid'

export async function sendLetter(l: Letter): Promise<SendResult> {
  const name = l.name.trim().slice(0, LIMITS.name)
  const email = l.email.trim().slice(0, LIMITS.email)
  const message = l.message.trim().slice(0, LIMITS.message)
  if (!name || !message || !EMAIL_RE.test(email)) return 'invalid'
  // a bot filled the hidden field: pretend it worked, send nothing
  if (l.honeypot) return 'sent'
  if (!emailConfigured) return 'not-configured'
  if (Date.now() - lastSentAt < COOLDOWN_MS) return 'cooldown'

  const { default: emailjs } = await import('@emailjs/browser')
  // throws on network/EmailJS errors — the caller shows the error state
  await emailjs.send(
    SERVICE_ID as string,
    TEMPLATE_ID as string,
    { from_name: name, reply_to: email, message, date: l.date, lang: l.lang },
    { publicKey: PUBLIC_KEY as string }
  )
  lastSentAt = Date.now()
  return 'sent'
}

/** fallback while EmailJS is not configured: the visitor's mail app opens with the letter ready */
export function mailtoHref(to: string, l: Letter) {
  const body = encodeURIComponent(`${l.message.trim()}\n\n— ${l.name.trim()} (${l.email.trim()})`)
  const subject = encodeURIComponent(l.lang === 'pt' ? 'Uma carta pelo portfólio' : 'A letter from your portfolio')
  return `mailto:${to}?subject=${subject}&body=${body}`
}
