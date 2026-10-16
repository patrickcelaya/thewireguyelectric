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
const FIELDS = ['name', 'phone', 'email', 'zip', 'experience', 'fullTime', 'startDate', 'message'] as const

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

// A form posted without JavaScript asks for a page, not JSON: send the browser back to the page it came from (same
// origin only), where CSS shows the success block (#sent) or the failure line (#send-error). Fetch callers (site.js)
// send Accept: application/json and keep getting status codes.
function back(request: Request, ok: boolean) {
  let path = '/estimate'
  try {
    const ref = new URL(request.headers.get('referer') ?? '', request.url)
    if (ref.origin === new URL(request.url).origin) path = ref.pathname
  } catch {}
  return new Response(null, {status: 303, headers: {location: `${path}?${ok ? 'sent' : 'error'}=1#${ok ? 'sent' : 'send-error'}`}})
}

const subject = (lead: Lead) => `${lead.formType === 'careers' ? 'Job application' : 'Estimate request'}: ${lead.name} (${lead.zip || 'no zip'})`

export const POST: APIRoute = async ({request}) => {
  const json = (request.headers.get('accept') ?? '').includes('application/json')
  const reply = (status: number, body: string | null = null) => (json ? new Response(body, {status}) : back(request, status < 300))
  const data = await request.formData()
  const get = (k: string) => String(data.get(k) ?? '').trim().slice(0, 5000)

  // Bots fill the hidden field or submit instantly. Pretend success so they move on.
  const startedAt = Number(get('startedAt'))
  if (get('company_website') || (startedAt && Date.now() - startedAt < MIN_FILL_MS)) {
    return reply(204)
  }
  // A name and a phone number are enough to call someone back; details are optional.
  if (!get('name') || !get('phone')) {
    return reply(400, 'Missing required fields')
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
    return reply(503, 'Form not configured')
  }
  const results = await Promise.allSettled(deliveries)
  const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
  failed.forEach((f) => console.error('[contact] delivery failed:', f.reason))
  return failed.length === results.length ? reply(502, 'Delivery failed') : reply(204)
}
