// Lead form handler (the only server-rendered route). Delivers each submission to
// every configured destination:
//   FORMSPARK_FORM_ID  Formspark inbox + email notifications (https://formspark.io)
//   LEAD_WEBHOOK_URL   any webhook, e.g. a Zapier/Make hook that creates the
//                      customer/lead in Housecall Pro
//   RESEND_API_KEY + LEADS_TO_EMAIL  plain email via Resend
// At least one must succeed, or the visitor is told to call instead. Setup, the
// Formspark settings that reject every lead, and the status codes: docs/FORMS.md.
import type {APIRoute} from 'astro'
import {put} from '@vercel/blob'

export const prerender = false

const MIN_FILL_MS = 2500
/** Each destination gets this long; a provider that hangs counts as failed, so the visitor never waits on it for good. */
const PROVIDER_TIMEOUT_MS = 8000
const FIELDS = ['name', 'phone', 'email', 'zip', 'experience', 'fullTime', 'startDate', 'message', 'file_url'] as const
/** How the notification emails (Formspark, Resend) name each field; the webhook keeps the field names. */
const LABELS: Record<(typeof FIELDS)[number], string> = {
  name: 'Name',
  phone: 'Phone',
  email: 'Email',
  zip: 'City or ZIP',
  experience: 'Years of experience',
  fullTime: 'Full-time',
  startDate: 'Start date',
  message: 'Message',
  file_url: 'Résumé',
}

type Lead = Record<(typeof FIELDS)[number] | 'formType' | 'page', string>

const formName = (lead: Lead) => (lead.formType === 'careers' ? 'Job application' : 'Estimate request')
/** A field as it may stand in an email subject: one line, short (the body keeps it whole). */
const oneLine = (s: string, max = 80) =>
  s
    .replace(/[\r\n\t\u2028\u2029]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, max)
const subject = (lead: Lead) =>
  lead.formType === 'careers' ? `${formName(lead)}: ${oneLine(lead.name)}` : `${formName(lead)}: ${oneLine(lead.name)} (${oneLine(lead.zip, 40) || 'no zip'})`
/** The filled-in fields under their labels, in form order. */
const labelled = (lead: Lead) => FIELDS.filter((k) => lead[k]).map((k) => [LABELS[k], lead[k]] as const)

/** A provider's refusal with the start of its answer, so a Formspark 402 (out of submissions) or 403 (spam filter) reads as such in the logs. */
async function refused(provider: string, res: Response) {
  const body = await res.text().catch(() => '')
  return new Error(`${provider} ${res.status}${body ? `: ${body.slice(0, 200)}` : ''}`)
}

async function toFormspark(formId: string, lead: Lead) {
  const res = await fetch(`https://submit-form.com/${encodeURIComponent(formId)}`, {
    method: 'POST',
    headers: {'content-type': 'application/json', accept: 'application/json'},
    // _email.from is the sender's name only (Formspark ignores one with @, < or >)
    body: JSON.stringify({...Object.fromEntries(labelled(lead)), Form: formName(lead), Page: lead.page, _email: {subject: subject(lead), from: 'Wire Guy website'}}),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  })
  if (!res.ok) throw await refused('Formspark', res)
}

async function toWebhook(url: string, lead: Lead) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify(lead),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  })
  if (!res.ok) throw await refused('Webhook', res)
}

async function toResend(apiKey: string, to: string, lead: Lead) {
  const lines = [`Form: ${formName(lead)}`, ...labelled(lead).map(([label, value]) => `${label}: ${value}`)]
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
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  })
  if (!res.ok) throw await refused('Resend', res)
}

// The résumé on /careers is a plain file field (components/sections/ApplicationForm.astro). It is saved to the
// project's Vercel Blob store (BLOB_READ_WRITE_TOKEN, connected to the project) under an unguessable name, and its
// link goes to every destination as file_url. A file that is too big, of the wrong type, or that can't be saved is
// logged and left out: the application is still delivered. Vercel refuses request bodies over 4.5 MB before this
// runs, so the form's limit (and forms.ts's check) is 4 MB.
const RESUME_MAX_BYTES = 4 * 1024 * 1024
const RESUME_TYPES = /\.(pdf|docx?|rtf|odt|txt|pages|jpe?g|png|heic)$/i
async function saveResume(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) return ''
  if (file.size > RESUME_MAX_BYTES || !RESUME_TYPES.test(file.name)) {
    console.warn('[contact] résumé left out:', {size: file.size, type: file.type, name: file.name.slice(-12)})
    return ''
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('[contact] résumé left out: BLOB_READ_WRITE_TOKEN is not set')
    return ''
  }
  try {
    const ext = file.name.match(RESUME_TYPES)?.[0].toLowerCase() ?? ''
    const blob = await put(`resumes/resume${ext}`, file, {access: 'public', addRandomSuffix: true, contentType: file.type || undefined, abortSignal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS)})
    return blob.url
  } catch (e) {
    console.error('[contact] résumé could not be saved:', e instanceof Error ? e.message : e)
    return ''
  }
}

// A form posted without JavaScript asks for a page, not JSON: send the browser back to the page it came from (same
// origin only), where CSS shows the success block (#sent) or the failure line (#send-error). With no usable Referer
// (a browser or extension that drops it, Referrer-Policy: no-referrer) that is /estimate, never /api/*, which answers
// a GET with 405. Fetch callers (site.js) send Accept: application/json and keep getting status codes.
function back(request: Request, ok: boolean) {
  let path = '/estimate'
  const referer = request.headers.get('referer')
  if (referer) {
    try {
      const ref = new URL(referer)
      // one leading slash, so a path like //host/x can't become a protocol-relative redirect
      if (ref.origin === new URL(request.url).origin && !ref.pathname.startsWith('/api/')) path = ref.pathname.replace(/^\/+/, '/')
    } catch {}
  }
  return new Response(null, {status: 303, headers: {location: `${path}?${ok ? 'sent' : 'error'}=1#${ok ? 'sent' : 'send-error'}`}})
}

// Status codes: 204 delivered; 202 dropped as a bot (it still looks like success, but scripts/site/forms.ts counts a
// lead only on 204); 400 missing name or phone, or a body that isn't a form; 502 every destination failed; 503 none set.
export const POST: APIRoute = async ({request}) => {
  const json = (request.headers.get('accept') ?? '').includes('application/json')
  const reply = (status: number, body: string | null = null) => (json ? new Response(body, {status}) : back(request, status < 300))
  let data: FormData
  try {
    data = await request.formData()
  } catch {
    return reply(400, 'Bad request')
  }
  const get = (k: string) => String(data.get(k) ?? '').trim().slice(0, 5000)

  // Bots fill the hidden field or submit instantly. Pretend success so they move on. The fill time is measured in the
  // browser on one clock (forms.ts), so a visitor whose device clock is off is never mistaken for a bot; a form posted
  // without JavaScript sends none.
  const fillMs = Number(get('fillMs'))
  const honeypot = Boolean(get('company_website'))
  if (honeypot || (Number.isFinite(fillMs) && fillMs > 0 && fillMs < MIN_FILL_MS)) {
    console.warn('[contact] dropped as bot', {honeypot, fillMs: get('fillMs')})
    return reply(202)
  }
  // A name and a phone number are enough to call someone back; details are optional.
  if (!get('name') || !get('phone')) {
    return reply(400, 'Missing required fields')
  }

  const lead = Object.fromEntries([
    ...FIELDS.map((k) => [k, get(k)]),
    ['message', get('message') || 'No details given'],
    ['file_url', await saveResume(data.get('resume'))],
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

// Anything but a POST (a monitor's GET, a HEAD): the endpoint exists, it just takes form posts.
export const ALL: APIRoute = () => new Response('Method Not Allowed', {status: 405, headers: {allow: 'POST'}})
