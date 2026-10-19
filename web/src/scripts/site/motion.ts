// Scroll motion that needs a script. Everything starts visible: these only add
// classes once their observer runs (see core.css "reveals").
import {all, hasIO, hasScrollTimeline, idle, onceVisible, reduceMotion} from './util'

/**
 * [data-reveal]: browsers with scroll-driven animations animate them in CSS; the
 * others get a one-shot fade (html.reveal-js), added only once the observer is running.
 */
function reveals() {
  if (hasScrollTimeline || reduceMotion || !hasIO) return
  const els = all('[data-reveal]')
  if (!els.length) return
  document.documentElement.classList.add('reveal-js')
  onceVisible(els, (el) => el.classList.add('is-in'), {rootMargin: '0px 0px -8% 0px', threshold: 0.01})
}

/**
 * [data-eager-photos] sections far down the page start loading their photos about a
 * screen and a half before they arrive, so a quick scroll never meets a blank cell.
 */
function eagerPhotos() {
  onceVisible(all('[data-eager-photos]'), (sec) => all<HTMLImageElement>('img[loading=lazy]', sec).forEach((img) => (img.loading = 'eager')), {rootMargin: '150% 0px'})
}

/**
 * The title-card hero ([data-hero-copy] inside .hero): the words must fit on the wall
 * above the crew, never over a face. If they ever grow taller than their box (very
 * large text zoom), the hero stacks them above the photo (.hero--stacked).
 */
function heroFit() {
  const copy = document.querySelector<HTMLElement>('[data-hero-copy]')
  const hero = copy?.closest<HTMLElement>('.hero')
  if (!copy || !hero) return
  const fit = () => {
    hero.classList.remove('hero--stacked')
    if (getComputedStyle(copy).position !== 'absolute') return
    const inner = copy.firstElementChild as HTMLElement | null
    const room = copy.clientHeight - parseFloat(getComputedStyle(copy).paddingTop)
    if (inner && inner.offsetHeight > room + 1) hero.classList.add('hero--stacked')
  }
  if (document.fonts?.ready) document.fonts.ready.then(() => requestAnimationFrame(fit))
  else idle(fit)
  let t: number | undefined
  addEventListener('resize', () => {
    clearTimeout(t)
    t = window.setTimeout(fit, 120)
  })
}

/** [data-rail]: a horizontal row of cards on phones; [data-rail-step] buttons move it by one card. */
function rails() {
  for (const rail of all('[data-rail]')) {
    const track = rail.querySelector<HTMLElement>('[data-rail-track]')
    if (!track) continue
    for (const btn of all('[data-rail-step]', rail)) {
      btn.addEventListener('click', () => {
        // one card: the first list item (a list inside the scroller), else its first child
        const card = track.querySelector<HTMLElement>('li') ?? (track.firstElementChild as HTMLElement | null)
        const step = Number(btn.getAttribute('data-rail-step'))
        track.scrollBy({left: step * ((card?.offsetWidth ?? 300) + 12), behavior: reduceMotion ? 'auto' : 'smooth'})
      })
    }
  }
}

export function initMotion() {
  reveals()
  eagerPhotos()
  heroFit()
  rails()
}
