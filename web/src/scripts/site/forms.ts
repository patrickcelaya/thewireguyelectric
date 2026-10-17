// Estimate forms (components/sections/EstimateForm.astro, [data-est]): progressive
// enhancement over a normal POST to /api/contact. Without JS the browser validates
// the required fields and posts; the API answers 303 back to this page's #sent (or
// #send-error), which CSS shows. With JS: inline errors (described only once shown),
// one request per submit, the confirmation focused and its bulb switched on, and a
// failure brought into view. The job application (ApplicationForm.astro) also
// waits for a résumé upload in progress before it sends.
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

/**
 * The résumé upload (FlowDrive's widget in [data-resume]) sends the file from the browser and writes its link into a
 * hidden file_url field when it's done, announcing that with an `fdupload` event (`fderror` / `fdremove` otherwise).
 * Returns a wait for the uploads in progress, if any: it resolves true once the last one's link is in the form.
 */
function trackUpload(form: HTMLFormElement) {
  let uploading = 0
  let waiting: Array<(ok: boolean) => void> = []
  const start = (e: Event) => {
    const t = e.target as HTMLInputElement
    const files = e instanceof DragEvent ? e.dataTransfer?.files : t.type === 'file' ? t.files : undefined
    if (files?.length && t.closest?.('[data-resume]')) uploading += files.length
  }
  const end = (ok: boolean) => () => {
    uploading = Math.max(0, uploading - 1)
    if (uploading) return
    waiting.forEach((resolve) => resolve(ok))
    waiting = []
  }
  form.addEventListener('change', start)
  form.addEventListener('drop', start)
  form.addEventListener('fdupload', end(true))
  form.addEventListener('fderror', end(false))
  form.addEventListener('fdremove', end(false))
  return () => (uploading ? new Promise<boolean>((resolve) => waiting.push(resolve)) : undefined)
}

/**
 * FlowDrive builds the upload once the page has loaded: a focusable box, a "button" that answers clicks only, and a
 * nameless file input laid over both. Make the file input the one tab stop and name it by the field's own line and
 * the button's words ("Please upload a resume. Upload files").
 */
function labelUpload(form: HTMLFormElement) {
  const field = form.querySelector<HTMLElement>('[data-resume]')
  const line = field?.querySelector<HTMLElement>('[data-resume-line]')
  if (!field || !line) return
  const tidy = () => {
    const input = field.querySelector<HTMLInputElement>('input[type=file]')
    if (!input) return false
    const button = field.querySelector('fdx-upload')
    if (button) {
      button.id ||= `${line.id}-button`
      button.setAttribute('tabindex', '-1')
      button.setAttribute('aria-hidden', 'true')
    }
    field.querySelector('fdx-container')?.removeAttribute('tabindex')
    input.setAttribute('aria-labelledby', button ? `${line.id} ${button.id}` : line.id)
    return true
  }
  if (!tidy()) new MutationObserver((_, observer) => tidy() && observer.disconnect()).observe(field, {childList: true, subtree: true})
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
  const upload = trackUpload(form)
  labelUpload(form)
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
    if (bad.length) {
      const name = form.querySelector(`label[for="${bad[0].id}"]`)?.firstChild?.textContent?.trim()
      alert.textContent = bad.length === 1 ? `1 field needs attention: ${name}.` : `${bad.length} fields need attention.`
      bad[0].focus()
      return
    }
    alert.textContent = ''
    busy(true)
    const wait = new Promise((ok) => setTimeout(ok, Math.max(0, MIN_FILL_MS - (performance.now() - t0))))
    Promise.all([upload() ?? true, wait]).then(([uploaded]) => {
      if (uploaded) return send()
      fail('The résumé didn’t upload. Try it again, or send your application without it.')
    })
  })
}

export function initForms() {
  const boxes = all('[data-est]')
  boxes.forEach(enhance)
  // back from a no-JS post (the API's 303 to ?sent=1#sent): show the confirmation
  const inMain = document.querySelector<HTMLElement>('main [data-est]')
  if (inMain && /[?&]sent=1/.test(location.search)) showSent(inMain)
}
