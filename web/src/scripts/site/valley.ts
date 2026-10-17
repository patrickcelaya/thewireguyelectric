// The valley map (components/sections/Valley.astro, [data-valley]). Once about a
// third of the map is on screen the wire draws itself from Mesa through every town
// and each town (and its socket in the index) switches on as the current reaches it;
// CSS does the motion, the section is only armed here (vy-armed, then is-live), so
// without this script or with reduced motion everything is simply drawn and lit.
// Pointing at a town in the index, or at its pin, lights the pair and floats the
// town's neighbourhoods over the map (an aria-hidden copy: the index is the
// accessible version). A pin click follows its town's link.
import {all, hasIO, reduceMotion} from './util'

function arm(section: HTMLElement, map: HTMLElement) {
  if (!hasIO || reduceMotion) return
  section.classList.add('vy-armed')
  const io = new IntersectionObserver(
    (entries) => {
      const e = entries[entries.length - 1]
      if (e.isIntersecting && e.intersectionRect.height >= Math.min(e.boundingClientRect.height, innerHeight) * 0.35) {
        section.classList.add('is-live')
        io.disconnect()
      }
    },
    {threshold: Array.from({length: 21}, (_, i) => i / 20)},
  )
  io.observe(map)
}

function callouts(section: HTMLElement, map: HTMLElement) {
  const rows = new Map(all('.vy-cities li[data-city]', section).map((li) => [li.dataset.city!, li]))
  const pins = new Map(all('.vy-pin[data-pin]', section).map((p) => [p.dataset.pin!, p]))
  let card: HTMLElement | undefined
  let on: string | undefined
  let offTimer: number | undefined

  const place = (slug: string) => {
    const pin = pins.get(slug)!
    const row = rows.get(slug)!
    if (!card) {
      card = document.createElement('div')
      card.className = 'vy-callout'
      card.setAttribute('aria-hidden', 'true')
      card.innerHTML = '<b></b><span></span>'
      map.append(card)
    }
    const detail = row.querySelector('p')
    card.firstElementChild!.textContent = row.querySelector('a')?.textContent ?? ''
    const span = card.lastElementChild as HTMLElement
    span.textContent = detail?.textContent ?? ''
    span.hidden = !detail
    const m = map.getBoundingClientRect()
    const r = pin.getBoundingClientRect()
    const x = r.left - m.left
    const y = r.top - m.top
    const left = Math.min(Math.max(x - card.offsetWidth / 2, 12), m.width - card.offsetWidth - 12)
    let top = y - card.offsetHeight - 30
    if (top < 12) top = y + 30
    const fresh = !card.classList.contains('is-on')
    if (fresh) card.style.transition = 'none'
    card.style.setProperty('--cx', `${left.toFixed(1)}px`)
    card.style.setProperty('--cy', `${top.toFixed(1)}px`)
    if (fresh) {
      void card.offsetWidth
      card.style.transition = ''
    }
  }
  const off = () => {
    if (!on) return
    pins.get(on)?.classList.remove('is-on')
    rows.get(on)?.classList.remove('is-on')
    on = undefined
    section.classList.remove('has-on')
    card?.classList.remove('is-on')
  }
  const show = (slug: string) => {
    clearTimeout(offTimer)
    if (on === slug || !pins.has(slug) || !rows.has(slug)) return
    off()
    on = slug
    section.classList.add('has-on')
    pins.get(slug)!.classList.add('is-on')
    rows.get(slug)!.classList.add('is-on')
    place(slug)
    requestAnimationFrame(() => card?.classList.add('is-on'))
  }
  const later = () => {
    clearTimeout(offTimer)
    offTimer = window.setTimeout(off, 140)
  }
  for (const [slug, row] of rows) {
    row.addEventListener('mouseenter', () => show(slug))
    row.addEventListener('mouseleave', later)
    row.addEventListener('focusin', () => show(slug))
    row.addEventListener('focusout', later)
  }
  for (const [slug, pin] of pins) {
    pin.addEventListener('mouseenter', () => show(slug))
    pin.addEventListener('mouseleave', later)
    pin.addEventListener('click', () => {
      const a = rows.get(slug)?.querySelector('a')
      if (a) location.href = a.href
    })
  }
  addEventListener('resize', () => on && place(on))
}

export function initValley() {
  for (const section of all('[data-valley]')) {
    const map = section.querySelector<HTMLElement>('.vy-map')
    if (!map) continue
    arm(section, map)
    callouts(section, map)
  }
}
