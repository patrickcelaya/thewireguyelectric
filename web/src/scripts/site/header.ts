// The header: the condensed bar once the page leaves the top (html.hdr-c), the
// dropdown disclosures (desktop), and the phone/tablet menu sheet (the same <nav>).
import {all, hasIO, wideHeader} from './util'

const root = document.documentElement

/** A marker at the top of the document is observed: no scroll listener, no layout read. */
function condenseOnScroll() {
  if (!hasIO) return
  const mark = document.createElement('div')
  mark.setAttribute('aria-hidden', 'true')
  mark.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:24px;pointer-events:none'
  document.body.append(mark)
  new IntersectionObserver((entries) => root.classList.toggle('hdr-c', !entries[entries.length - 1].isIntersecting)).observe(mark)
}

/**
 * The panels ship open-able (without JS, CSS opens them on hover and keyboard focus);
 * here they become disclosures. Esc, a click outside or focus leaving closes them
 * (WCAG 2.4.11). Below 1240 px the same buttons open the groups inside the menu sheet.
 */
function dropdowns() {
  const buttons = all<HTMLButtonElement>('.dd-btn')
  const panel = (b: HTMLElement) => document.getElementById(b.getAttribute('aria-controls') ?? '')
  const set = (b: HTMLElement, open: boolean) => {
    b.setAttribute('aria-expanded', String(open))
    const p = panel(b)
    if (p) p.hidden = !open
  }
  const closeAll = (except?: HTMLElement) => buttons.forEach((b) => b !== except && set(b, false))
  closeAll()
  for (const b of buttons) {
    b.addEventListener('click', () => {
      const open = b.getAttribute('aria-expanded') === 'true'
      if (wideHeader.matches) closeAll(b)
      set(b, !open)
    })
    const dd = b.closest('.dd')
    dd?.addEventListener('focusout', (e) => {
      const next = (e as FocusEvent).relatedTarget as Node | null
      if (wideHeader.matches && next && !dd.contains(next)) set(b, false)
    })
  }
  document.addEventListener('click', (e) => {
    if (wideHeader.matches && !(e.target as Element).closest('.dd')) closeAll()
  })
  /** Close the open dropdown and give its button the focus back. */
  const closeOpen = () => {
    const open = buttons.find((b) => b.getAttribute('aria-expanded') === 'true')
    closeAll()
    open?.focus()
  }
  return {closeAll, closeOpen}
}

/** The menu sheet: the header's own <nav>; the page behind it is inert while it is open. */
function menu(closeAll: () => void) {
  const button = document.querySelector<HTMLButtonElement>('.menu-btn')
  const nav = document.getElementById('site-nav')
  if (!button || !nav) return undefined
  const label = button.querySelector('[data-menu-label]')
  const behind = ['main', 'footer', '.callbar', '.skip'].map((s) => document.querySelector(s)).filter((el): el is Element => Boolean(el))
  const isOpen = () => button.getAttribute('aria-expanded') === 'true'
  const set = (open: boolean) => {
    button.setAttribute('aria-expanded', String(open))
    if (label) label.textContent = open ? 'Close' : 'Menu' // the visible label is the name
    root.classList.toggle('menu-open', open)
    if (!open) closeAll()
    behind.forEach((el) => (open ? el.setAttribute('inert', '') : el.removeAttribute('inert')))
    // the sheet comes before the button in the HTML: take focus into it, so Tab walks down the menu (WCAG 2.4.3)
    if (open) nav.querySelector<HTMLElement>('a[href],button')?.focus({preventScroll: true})
  }
  button.addEventListener('click', () => set(!isOpen()))
  nav.addEventListener('click', (e) => {
    if (!wideHeader.matches && (e.target as Element).closest('a')) set(false)
  })
  wideHeader.addEventListener('change', (m) => {
    closeAll()
    if (m.matches) set(false)
  })
  return {
    isOpen,
    /** Close the sheet and return focus to the Menu button. */
    close: () => {
      set(false)
      button.focus()
    },
  }
}

export function initHeader() {
  condenseOnScroll()
  const dd = dropdowns()
  const sheet = menu(dd.closeAll)
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return
    if (sheet?.isOpen()) sheet.close()
    else dd.closeOpen()
  })
}
