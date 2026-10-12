// Lead form handler (the only server-rendered route). Delivers each submission to
// every configured destination:
//   FORMSPARK_FORM_ID  Formspark inbox + email notifications (https://formspark.io)
//   LEAD_WEBHOOK_URL   any webhook, e.g. a Zapier/Make hook that creates the
//                      customer/lead in Housecall Pro
//   RESEND_API_KEY + LEADS_TO_EMAIL  plain email via Resend
// At least one must succeed, or the visitor is told to call instead.
import type {APIRoute} from 'astro'

export const prerender = false

const MIN_FILL_MS = 2500
const FIELDS = ['name', 'phone', 'email', 'zip', 'experience', 'startDate', 'message'] as const

type Lead = Record<(typeof FIELDS)[number] | 'formType' | 'page', string>

async function toFormspark(formId: string, lead: Lead) {
  const res = await fetch(`https://submit-form.com/${encodeURIComponent(formId)}`, {
    method: 'POST',
    headers: {'content-type': 'application/json', accept: 'application/json'},
    body: JSON.stringify({...lead, _email: {subject: subject(lead)}}),
  })
  if (!res.ok) throw new Error(`Formspark ${res.status}`)
}

async function toWebhook(url: string, lead: Lead) {
  const res = await fetch(url, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(lead)})
  if (!res.ok) throw new Error(`Webhook ${res.status}`)
}

async function toResend(apiKey: string, to: string, lead: Lead) {
  const lines = FIELDS.filter((k) => lead[k]).map((k) => `${k}: ${lead[k]}`)
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {authorization: `Bearer ${apiKey}`, 'content-type': 'application/json'},
    body: JSON.stringify({
      from: process.env.LEADS_FROM_EMAIL ?? 'website@thewireguyelectric.com',
      to: to.split(',').map((s) => s.trim()),
      reply_to: lead.email || undefined,
      subject: subject(lead),
      text: `${lines.join('\n')}\n\nPage: ${lead.page}`,
    }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}`)
}

const subject = (lead: Lead) => `${lead.formType === 'careers' ? 'Job application' : 'Estimate request'}: ${lead.name} (${lead.zip || 'no zip'})`

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

  const lead = Object.fromEntries([
    ...FIELDS.map((k) => [k, get(k)]),
    ['formType', get('formType') === 'careers' ? 'careers' : 'estimate'],
    ['page', request.headers.get('referer') ?? ''],
  ]) as Lead

  const deliveries: Array<Promise<void>> = []
  if (process.env.FORMSPARK_FORM_ID) deliveries.push(toFormspark(process.env.FORMSPARK_FORM_ID, lead))
  if (process.env.LEAD_WEBHOOK_URL) deliveries.push(toWebhook(process.env.LEAD_WEBHOOK_URL, lead))
  if (process.env.RESEND_API_KEY && process.env.LEADS_TO_EMAIL) deliveries.push(toResend(process.env.RESEND_API_KEY, process.env.LEADS_TO_EMAIL, lead))

  if (!deliveries.length) {
    console.error('[contact] no delivery configured (FORMSPARK_FORM_ID, LEAD_WEBHOOK_URL or RESEND_API_KEY); lead not delivered')
    return new Response('Form not configured', {status: 503})
  }
  const results = await Promise.allSettled(deliveries)
  const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
  failed.forEach((f) => console.error('[contact] delivery failed:', f.reason))
  return failed.length === results.length ? new Response('Delivery failed', {status: 502}) : new Response(null, {status: 204})
}
