// Small helpers shared by the site script's modules.

export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
export const hasIO = 'IntersectionObserver' in window
/** The desktop header (menus are dropdowns); below it the nav is the menu sheet. */
export const wideHeader = matchMedia('(min-width: 1240px)')

export function all<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T[] {
  return [...root.querySelectorAll<T>(selector)]
}

/** Run when the browser is idle (measuring work never delays first paint). */
export function idle(fn: () => void) {
  if ('requestIdleCallback' in window) requestIdleCallback(fn, {timeout: 900})
  else setTimeout(fn, 200)
}

/** Call `fn` once per element, the first time it enters the viewport (at once without IntersectionObserver). */
export function onceVisible<T extends Element>(els: T[], fn: (el: T) => void, options?: IntersectionObserverInit) {
  if (!hasIO) return els.forEach(fn)
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      fn(e.target as T)
      io.unobserve(e.target)
    }
  }, options)
  els.forEach((el) => io.observe(el))
}

/** A GA4 event, when analytics is configured (gtag is defined in <head> and queues until gtag.js loads). */
export function track(event: string) {
  const gtag = (window as unknown as {gtag?: (...args: unknown[]) => void}).gtag
  gtag?.('event', event)
}
