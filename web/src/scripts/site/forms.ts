// Estimate forms (components/sections/EstimateForm.astro, [data-est]): progressive
// enhancement over a normal POST to /api/contact. Without JS the browser validates
// the required fields and posts; the API answers 303 back to this page's #sent (or
// #send-error), which CSS shows. With JS: inline errors (described only once shown),
// one request per submit, the confirmation focused and its bulb switched on, and a
// failure brought into view. The job application (ApplicationForm.astro) also
// checks the résumé's size before it sends (the file goes in the same request).
import {all, reduceMotion, track} from './util'

/** Bots that submit faster than a person can are ignored by the API; wait out the rest of this. */
const MIN_FILL_MS = 2600
/** The API gives each destination 8 s; past this the visitor gets the failure line with the phone number. */
const SEND_TIMEOUT_MS = 15000

function showSent(box: HTMLElement) {
  const done = box.querySelector<HTMLElement>('[data-est-done]')
  box.classList.add('is-sent')
  if (done) {
    // focus the confirmation, then bring the whole card (its title too) into view below the sticky header
    done.focus({preventScroll: true})
    box.scrollIntoView({block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth'})
  }
  box.closest('[data-est-page]')?.classList.add('is-lit')
}

/** The résumé field's size check: Vercel refuses a request over 4.5 MB, so a bigger file is caught here first. */
const RESUME_MAX_BYTES = 4 * 1024 * 1024
function resumeTooBig(form: HTMLFormElement) {
  const input = form.querySelector<HTMLInputElement>('[data-resume] input[type=file]')
  const file = input?.files?.[0]
  const err = input?.closest('[data-resume]')?.querySelector<HTMLElement>('.err')
  const big = Boolean(file && file.size > RESUME_MAX_BYTES)
  if (err) err.hidden = !big
  if (input) {
    input.setAttribute('aria-invalid', String(big))
    input.setAttribute('aria-describedby', [`${input.id}-h`, big && err?.id].filter(Boolean).join(' '))
  }
  return big ? input : undefined
}

function enhance(box: HTMLElement) {
  const form = box.querySelector('form')
  const fill = form?.querySelector<HTMLInputElement>('[data-fill]')
  const alert = form?.querySelector<HTMLElement>('[data-est-alert]')
  const submit = form?.querySelector<HTMLButtonElement>('[type=submit]')
  const submitLabel = submit?.querySelector('[data-submit-label]')
  if (!form || !fill || !alert || !submit || !submitLabel) return
  const idleLabel = submitLabel.textContent
  const failure = box.querySelector('[data-est-fail]')?.innerHTML ?? ''
  form.querySelector('[data-resume] input[type=file]')?.addEventListener('change', () => resumeTooBig(form))
  // the fill time is measured on this one clock (never the wall clock, which may be off on the visitor's device)
  const t0 = performance.now()
  let sending = false
  form.noValidate = true

  const busy = (on: boolean) => {
    sending = on
    for (const a of ['aria-disabled', 'aria-busy']) {
      if (on) submit.setAttribute(a, 'true')
      else submit.removeAttribute(a)
    }
    submitLabel.textContent = on ? 'Sending…' : idleLabel
  }

  // the failure line (with the phone number) where the visitor can see it: the alert sits at the top of the form,
  // above the screen on a phone once the thumb is on the button
  const fail = (message: string) => {
    busy(false)
    alert.innerHTML = message
    alert.tabIndex = -1
    alert.focus({preventScroll: true})
    alert.scrollIntoView({block: 'center', behavior: reduceMotion ? 'auto' : 'smooth'})
  }

  const send = () => {
    fill.value = String(Math.round(performance.now() - t0))
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS)
    fetch(form.action, {method: 'POST', body: new FormData(form), headers: {Accept: 'application/json'}, signal: controller.signal})
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status))
        busy(false)
        showSent(box)
        // a lead only when it was delivered (204; the API answers 202 to what it drops as a bot), and a job
        // application (data-est="careers") is not a lead
        if (res.status === 204 && box.dataset.est !== 'careers') track('generate_lead')
      })
      .catch(() => fail(failure))
      .finally(() => clearTimeout(timer))
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    if (sending) return // one request per submit: repeat clicks wait until it settles
    const bad: HTMLInputElement[] = []
    for (const field of all<HTMLInputElement>('input[required], input[type=email]', form)) {
      const value = field.value.trim()
      const invalid = field.required ? !value : Boolean(value) && !field.checkValidity()
      const msgId = `${field.id}-e`
      const msg = document.getElementById(msgId)
      field.setAttribute('aria-invalid', String(invalid))
      if (msg) msg.hidden = !invalid
      if (invalid) {
        field.setAttribute('aria-describedby', msgId)
        bad.push(field)
      } else field.removeAttribute('aria-describedby')
    }
    const big = resumeTooBig(form)
    if (big) bad.push(big)
    if (bad.length) {
      const name = form.querySelector(`label[for="${bad[0].id}"]`)?.firstChild?.textContent?.trim()
      alert.textContent = bad.length === 1 ? `1 field needs attention: ${name}.` : `${bad.length} fields need attention.`
      bad[0].focus()
      return
    }
    alert.textContent = ''
    busy(true)
    const wait = new Promise((ok) => setTimeout(ok, Math.max(0, MIN_FILL_MS - (performance.now() - t0))))
    wait.then(send)
  })
}

export function initForms() {
  const boxes = all('[data-est]')
  boxes.forEach(enhance)
  // back from a no-JS post (the API's 303 to ?sent=1#sent): show the confirmation
  const inMain = document.querySelector<HTMLElement>('main [data-est]')
  if (inMain && /[?&]sent=1/.test(location.search)) showSent(inMain)
}
