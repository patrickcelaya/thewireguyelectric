// Estimate forms (components/sections/EstimateForm.astro, [data-est]): progressive
// enhancement over a normal POST to /api/contact. Without JS the browser validates
// the required fields and posts; the API answers 303 back to this page's #sent (or
// #send-error), which CSS shows. With JS: inline errors (described only once shown),
// one request per submit, the confirmation focused and its bulb switched on.
import {all, reduceMotion, track} from './util'

/** Bots that submit faster than a person can are ignored by the API; wait out the rest of this. */
const MIN_FILL_MS = 2600

function showSent(box: HTMLElement) {
  const done = box.querySelector<HTMLElement>('[data-est-done]')
  box.classList.add('is-sent')
  if (done) {
    // focus the confirmation, then bring it into view if an earlier error had scrolled it away
    done.focus({preventScroll: true})
    done.scrollIntoView({block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth'})
  }
  box.closest('[data-est-page]')?.classList.add('is-lit')
}

function enhance(box: HTMLElement) {
  const form = box.querySelector('form')
  const started = form?.querySelector<HTMLInputElement>('[data-started]')
  const alert = form?.querySelector<HTMLElement>('[data-est-alert]')
  const submit = form?.querySelector<HTMLButtonElement>('[type=submit]')
  const submitLabel = submit?.querySelector('[data-submit-label]')
  if (!form || !started || !alert || !submit || !submitLabel) return
  const idleLabel = submitLabel.textContent
  const failure = box.querySelector('[data-est-fail]')?.innerHTML ?? ''
  let sending = false
  form.noValidate = true
  started.value = String(Date.now())

  const busy = (on: boolean) => {
    sending = on
    for (const a of ['aria-disabled', 'aria-busy']) {
      if (on) submit.setAttribute(a, 'true')
      else submit.removeAttribute(a)
    }
    submitLabel.textContent = on ? 'Sending…' : idleLabel
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
    const data = new FormData(form)
    const message = form.querySelector<HTMLTextAreaElement>('textarea[name=message]')
    if (message && !message.value.trim()) data.set('message', 'No details given')
    busy(true)
    const wait = Math.max(0, MIN_FILL_MS - (Date.now() - Number(started.value)))
    setTimeout(() => {
      fetch(form.action, {method: 'POST', body: data, headers: {Accept: 'application/json'}})
        .then((res) => {
          if (!res.ok) throw new Error(String(res.status))
          busy(false)
          showSent(box)
          track('generate_lead')
        })
        .catch(() => {
          busy(false)
          alert.innerHTML = failure
        })
    }, wait)
  })
}

export function initForms() {
  const boxes = all('[data-est]')
  boxes.forEach(enhance)
  // back from a no-JS post (the API's 303 to ?sent=1#sent): show the confirmation
  const inMain = document.querySelector<HTMLElement>('main [data-est]')
  if (inMain && /[?&]sent=1/.test(location.search)) showSent(inMain)
}
