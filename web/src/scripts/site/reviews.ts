// The review carousel (components/sections/ReviewsCarousel.astro, [data-marquee]):
// two lanes drifting in opposite directions (one lane on phones). Every review is
// HTML text; the copies that make the loop seamless are aria-hidden and out of the
// tab order. Pause on hover, on focus and with the button; reduced motion = still,
// scrollable rows. Long reviews are clamped on the card and "Read the full review"
// opens the whole text in a dialog. Set up on idle (it measures every card) and
// paused while the section is off screen.
import {all, hasIO, idle, reduceMotion} from './util'

type Card = HTMLLIElement & {lane?: number}

function dialog() {
  let dlg: HTMLDialogElement | undefined
  let opener: HTMLElement | undefined
  return (card: HTMLElement, from: HTMLElement) => {
    if (!dlg) {
      dlg = document.createElement('dialog')
      dlg.className = 'rv-dialog'
      dlg.setAttribute('aria-labelledby', 'rv-dlg-h')
      dlg.innerHTML =
        '<div class="rv-dialog__in"><p class="rv-dialog__k" id="rv-dlg-h">Google review</p><blockquote></blockquote><p class="rv__by"></p>' +
        '<button class="btn btn--paper rv-dialog__x" type="button">Close</button></div>'
      document.body.append(dlg)
      const d = dlg
      d.querySelector('.rv-dialog__x')!.addEventListener('click', () => d.close())
      d.addEventListener('click', (e) => e.target === d && d.close())
      d.addEventListener('close', () => opener?.focus())
    }
    dlg.querySelector('blockquote')!.textContent = card.querySelector('blockquote')?.textContent ?? ''
    dlg.querySelector('.rv__by')!.innerHTML = card.querySelector('.rv__by')?.innerHTML ?? ''
    opener = from
    dlg.showModal()
  }
}

function setUp(marquee: HTMLElement) {
  const lanes = all('.lane', marquee)
  if (lanes.length < 2) return
  const section = marquee.closest('section') ?? marquee
  const toggle = section.querySelector<HTMLButtonElement>('[data-marquee-toggle]')
  const narrow = matchMedia('(max-width: 699px)')
  // one list in reading order: a1, b1, a2, b2, …
  const a = all<Card>('.track > li', lanes[0])
  const b = all<Card>('.track > li', lanes[1])
  const cards: Card[] = []
  a.forEach((li, i) => {
    li.lane = 0
    cards.push(li)
    if (b[i]) {
      b[i].lane = 1
      cards.push(b[i])
    }
  })
  cards.forEach((li, i) => (li.dataset.i = String(i)))

  // "Read the full review" on every card whose text is clamped (measured before the copies are made)
  for (const li of cards) {
    const q = li.querySelector('blockquote')
    if (!q || q.scrollHeight <= q.clientHeight + 2) continue
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'rv__more'
    btn.setAttribute('aria-haspopup', 'dialog')
    btn.innerHTML = `Read the full review<span class="sr-only"> by ${li.querySelector('cite')?.textContent ?? ''}</span>`
    q.after(btn)
    li.classList.add('is-clamped')
  }
  const open = dialog()
  marquee.addEventListener('click', (e) => {
    const btn = (e.target as Element).closest<HTMLElement>('.rv__more')
    const li = btn?.closest('li')
    if (btn && li) open(cards[Number(li.dataset.i)] ?? li, btn)
  })

  const animation = (lane: HTMLElement) => lane.querySelector('.belt')?.getAnimations?.()[0]
  const layout = () => {
    const one = narrow.matches
    all('.track[data-clone]', marquee).forEach((c) => c.remove())
    const tracks = lanes.map((l) => l.querySelector('.track')!)
    cards.forEach((li) => tracks[one ? 0 : (li.lane ?? 0)].append(li))
    lanes[1].hidden = one
    if (reduceMotion) return
    marquee.classList.add('is-moving')
    for (const lane of lanes) {
      if (lane.hidden) continue
      const belt = lane.querySelector<HTMLElement>('.belt')!
      const track = belt.querySelector('.track')!
      const width = track.getBoundingClientRect().width
      const copy = document.createElement('ul')
      copy.className = 'track'
      copy.setAttribute('aria-hidden', 'true')
      copy.dataset.clone = ''
      let got = 0
      for (const li of track.children) {
        const c = li.cloneNode(true) as HTMLElement
        all<HTMLElement>('button', c).forEach((x) => (x.tabIndex = -1))
        copy.append(c)
        got += li.getBoundingClientRect().width + 20
        if (got >= lane.clientWidth + 40) break
      }
      belt.append(copy)
      belt.style.setProperty('--mq-w', `${width.toFixed(1)}px`)
      belt.style.setProperty('--mq-dur', `${Math.round(width / (one ? 24 : 30))}s`)
    }
  }
  layout()
  narrow.addEventListener('change', layout)

  // the button always tells the truth: "Play reviews" whenever the lanes are still
  let paused = false
  const label = (still: boolean) => {
    if (!toggle) return
    toggle.classList.toggle('is-paused', still)
    const l = toggle.querySelector('[data-label]')
    if (l) l.textContent = still ? 'Play reviews' : 'Pause reviews'
  }
  const setPaused = (p: boolean) => {
    paused = p
    marquee.classList.toggle('is-paused', p)
    label(p)
  }
  marquee.addEventListener('mouseenter', () => label(true))
  marquee.addEventListener('focusin', () => label(true))
  marquee.addEventListener('mouseleave', () => !marquee.contains(document.activeElement) && label(paused))
  marquee.addEventListener('focusout', (e) => {
    if (!marquee.contains((e as FocusEvent).relatedTarget as Node | null) && !marquee.matches(':hover')) label(paused)
  })
  if (hasIO) new IntersectionObserver((entries) => marquee.classList.toggle('is-off', !entries[entries.length - 1].isIntersecting)).observe(marquee)

  const step = (dir: number, only?: HTMLElement) => {
    for (const lane of lanes) {
      if (lane.hidden || (only && lane !== only)) continue
      const first = lane.querySelector('.track > li')
      const cw = first ? first.getBoundingClientRect().width + 20 : 380
      const anim = !reduceMotion && animation(lane)
      const timing = anim && anim.effect?.getTiming()
      if (anim && timing && typeof timing.duration === 'number') {
        const w = parseFloat(lane.querySelector<HTMLElement>('.belt')!.style.getPropertyValue('--mq-w')) || 1
        const t = Number(anim.currentTime ?? 0) + (dir * timing.duration * cw) / w
        anim.currentTime = ((t % timing.duration) + timing.duration) % timing.duration
      } else {
        lane.scrollBy({left: dir * cw, behavior: reduceMotion ? 'auto' : 'smooth'})
      }
    }
  }
  if (toggle) {
    toggle.hidden = reduceMotion
    toggle.addEventListener('click', () => setPaused(!paused))
  }
  all('[data-mq-step]', section).forEach((b) =>
    b.addEventListener('click', () => {
      if (!reduceMotion) setPaused(true)
      step(Number(b.dataset.mqStep))
    }),
  )
  // keyboard focus on a card's button: the belt is paused by focus, and moved so the
  // focused card sits in the middle of its lane (it could be anywhere on the moving belt)
  for (const lane of lanes) {
    lane.addEventListener('focusin', (e) => {
      const li = (e.target as Element).closest('li')
      const anim = !reduceMotion && animation(lane)
      const timing = anim && anim.effect?.getTiming()
      if (!li || !anim || !timing || typeof timing.duration !== 'number') return
      const belt = lane.querySelector<HTMLElement>('.belt')!
      const w = parseFloat(belt.style.getPropertyValue('--mq-w')) || 1
      const x = li.getBoundingClientRect().left - belt.getBoundingClientRect().left
      const shift = Math.min(0, (lane.clientWidth - li.offsetWidth) / 2 - x)
      const p = Math.min(1, -shift / w)
      anim.currentTime = (lane.classList.contains('lane--b') ? 1 - p : p) * timing.duration
      lane.scrollLeft = 0
    })
    lane.addEventListener('keydown', (e) => {
      if (reduceMotion || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return
      e.preventDefault()
      step(e.key === 'ArrowRight' ? 1 : -1, lane)
    })
  }
}

export function initReviews() {
  const marquee = document.querySelector<HTMLElement>('[data-marquee]')
  if (marquee) idle(() => setUp(marquee))
}
