// Lead form handler (the only server-rendered route). Sends the submission by
// email through Resend when RESEND_API_KEY and LEADS_TO_EMAIL are configured.
import type {APIRoute} from 'astro'

export const prerender = false

const MIN_FILL_MS = 2500

export const POST: APIRoute = async ({request}) => {
  const data = await request.formData()
  const get = (k: string) => String(data.get(k) ?? '').trim().slice(0, 5000)

  // Bots fill the hidden field or submit instantly. Pretend success so they move on.
  const startedAt = Number(get('startedAt'))
  if (get('company_website') || (startedAt && Date.now() - startedAt < MIN_FILL_MS)) {
    return new Response(null, {status: 204})
  }
  if (!get('name') || !get('phone') || !get('message')) {
    return new Response('Missing required fields', {status: 400})
  }

  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.LEADS_TO_EMAIL
  const from = process.env.LEADS_FROM_EMAIL ?? 'website@thewireguyelectric.com'
  if (!apiKey || !to) {
    console.error('[contact] RESEND_API_KEY / LEADS_TO_EMAIL not configured; lead not delivered', {name: get('name'), phone: get('phone')})
    return new Response('Form not configured', {status: 503})
  }

  const kind = get('formType') === 'careers' ? 'Job application' : 'Estimate request'
  const lines = ['name', 'phone', 'email', 'zip', 'experience', 'startDate', 'message']
    .map((k) => [k, get(k)])
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {authorization: `Bearer ${apiKey}`, 'content-type': 'application/json'},
    body: JSON.stringify({
      from,
      to: to.split(',').map((s) => s.trim()),
      reply_to: get('email') || undefined,
      subject: `${kind}: ${get('name')} (${get('zip') || 'no zip'})`,
      text: `${lines.join('\n')}\n\nPage: ${request.headers.get('referer') ?? 'unknown'}`,
    }),
  })
  if (!res.ok) {
    console.error('[contact] Resend error', res.status, await res.text())
    return new Response('Delivery failed', {status: 502})
  }
  return new Response(null, {status: 204})
}
