// The wire-drawn bulb (components/ui/Bulb.astro): when it scrolls into view, its
// lead-in is set to start exactly at the edge of its field ([data-bulb-field], or the
// field's [data-bulb-edge] box), then the wire draws over the faint outline (is-in).
import {all, onceVisible} from './util'

function placeLead(bulb: HTMLElement) {
  const svg = bulb.querySelector('svg')
  if (!svg) return
  const r = svg.getBoundingClientRect()
  if (!r.width) return
  const field = bulb.closest<HTMLElement>('[data-bulb-field]') ?? document.body
  const f = (field.querySelector('[data-bulb-edge]') ?? field).getBoundingClientRect()
  const k = 300 / r.width // svg user units per css px
  const right = Math.min(f.right, document.documentElement.clientWidth)
  const left = Math.max(f.left, 0)
  const d =
    bulb.dataset.lead === 'right'
      ? `M${((right - r.left) * k + 8).toFixed(1)} 352 H236 Q196 352 196 312 L196 300`
      : `M${(-(r.left - left) * k - 8).toFixed(1)} 352 H64 Q104 352 104 312 L104 300`
  all<SVGPathElement>('[data-lead-path]', bulb).forEach((p) => p.setAttribute('d', d))
}

export function initBulbs() {
  const bulbs = all('.bulb')
  if (!bulbs.length) return
  onceVisible(
    bulbs,
    (b) => {
      placeLead(b)
      requestAnimationFrame(() => b.classList.add('is-in'))
    },
    {threshold: 0.3},
  )
  let t: number | undefined
  addEventListener('resize', () => {
    clearTimeout(t)
    t = window.setTimeout(() => bulbs.forEach(placeLead), 150)
  })
}
