// The handful of behaviors the Webflow design needs, replacing jQuery and
// Webflow's ~700 KB runtime: mobile menu, dropdowns (nav + FAQ accordion),
// tabs, scroll-in reveals, lazy third-party embeds, lead forms and YouTube facades.

const desktop = window.matchMedia('(min-width: 992px)')

// Mobile menu
document.querySelectorAll<HTMLElement>('.w-nav').forEach((nav) => {
  const menu = nav.querySelector<HTMLElement>('.w-nav-menu')
  const buttons = nav.querySelectorAll<HTMLElement>('.w-nav-button')
  if (!menu) return
  const set = (open: boolean) => {
    if (open) menu.setAttribute('data-nav-menu-open', '')
    else menu.removeAttribute('data-nav-menu-open')
    buttons.forEach((b) => {
      b.classList.toggle('w--open', open)
      b.setAttribute('aria-expanded', String(open))
    })
    if (nav.dataset.noScroll === '1') document.body.style.overflow = open ? 'hidden' : ''
  }
  buttons.forEach((b) => {
    b.setAttribute('role', 'button')
    b.setAttribute('tabindex', '0')
    b.setAttribute('aria-label', 'Menu')
    b.addEventListener('click', () => set(!menu.hasAttribute('data-nav-menu-open')))
  })
  desktop.addEventListener('change', () => set(false))
})

// Dropdowns: nav menus open on hover (desktop) or tap; FAQ accordions toggle on click.
const dropdowns = [...document.querySelectorAll<HTMLElement>('.w-dropdown')]
dropdowns.forEach((dd) => {
  const toggle = dd.querySelector<HTMLElement>('.w-dropdown-toggle')
  const list = dd.querySelector<HTMLElement>('.w-dropdown-list')
  if (!toggle || !list) return
  const set = (open: boolean) => {
    toggle.classList.toggle('w--open', open)
    list.classList.toggle('w--open', open)
    toggle.setAttribute('aria-expanded', String(open))
  }
  toggle.setAttribute('role', 'button')
  toggle.setAttribute('tabindex', '0')
  toggle.setAttribute('aria-expanded', 'false')
  if (dd.dataset.hover === 'true') {
    dd.addEventListener('mouseenter', () => desktop.matches && set(true))
    dd.addEventListener('mouseleave', () => desktop.matches && set(false))
  }
  const flip = () => set(!list.classList.contains('w--open'))
  toggle.addEventListener('click', flip)
  toggle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      flip()
    }
  })
})
document.addEventListener('click', (e) => {
  dropdowns.forEach((dd) => {
    if (dd.dataset.hover === 'true' && !dd.contains(e.target as Node)) {
      dd.querySelector('.w-dropdown-toggle')?.classList.remove('w--open')
      dd.querySelector('.w-dropdown-list')?.classList.remove('w--open')
    }
  })
})

// Tabs
document.querySelectorAll<HTMLElement>('.w-tabs').forEach((tabs) => {
  const links = [...tabs.querySelectorAll<HTMLElement>('.w-tab-link')]
  const panes = [...tabs.querySelectorAll<HTMLElement>('.w-tab-pane')]
  links.forEach((link) =>
    link.addEventListener('click', (e) => {
      e.preventDefault()
      const tab = link.dataset.wTab
      links.forEach((l) => {
        l.classList.toggle('w--current', l === link)
        l.setAttribute('aria-selected', String(l === link))
      })
      panes.forEach((p) => p.classList.toggle('w--tab-active', p.dataset.wTab === tab))
    }),
  )
})

// Scroll-in reveals (the content is in the HTML; this only animates it in).
const reveal = (el: Element) => el.classList.add('is-revealed')
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          reveal(entry.target)
          io.unobserve(entry.target)
        }
      }),
    {rootMargin: '0px 0px -8% 0px'},
  )
  document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el))
} else {
  document.querySelectorAll('[data-reveal]').forEach(reveal)
}

// Third-party embeds (reviews, Instagram) load only when they're about to scroll into view.
const loadEmbed = (tpl: HTMLTemplateElement) => {
  const s = document.createElement('script')
  s.src = tpl.dataset.lazyScript!
  Object.entries(JSON.parse(tpl.dataset.attrs || '{}') as Record<string, string>).forEach(([k, v]) => s.setAttribute(k, v))
  tpl.replaceWith(s)
}
const lazyTemplates = [...document.querySelectorAll<HTMLTemplateElement>('template[data-lazy-script]')]
if (lazyTemplates.length) {
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        io.unobserve(entry.target)
        entry.target.querySelectorAll<HTMLTemplateElement>('template[data-lazy-script]').forEach(loadEmbed)
      }),
    {rootMargin: '800px 0px'},
  )
  new Set(lazyTemplates.map((t) => t.parentElement!)).forEach((parent) => io.observe(parent))
}

// Lead forms → /api/contact, showing Webflow's own success/error blocks.
document.querySelectorAll<HTMLFormElement>('form[data-lead-form]').forEach((form) => {
  const started = form.querySelector<HTMLInputElement>('input[name="startedAt"]')
  if (started) started.value = String(Date.now())
  const wrap = form.parentElement
  const done = wrap?.querySelector<HTMLElement>('.w-form-done')
  const fail = wrap?.querySelector<HTMLElement>('.w-form-fail')
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const submit = form.querySelector<HTMLInputElement>('[type="submit"]')
    const label = submit?.value
    if (submit) {
      submit.value = submit.dataset.wait || 'Please wait...'
      submit.disabled = true
    }
    if (fail) fail.style.display = 'none'
    try {
      const res = await fetch(form.action, {method: 'POST', body: new FormData(form)})
      if (!res.ok) throw new Error(String(res.status))
      form.style.display = 'none'
      if (done) done.style.display = 'block'
      ;(window as any).gtag?.('event', 'generate_lead', {form_type: form.dataset.leadForm})
    } catch {
      if (fail) fail.style.display = 'block'
    } finally {
      if (submit) {
        submit.value = label ?? 'Submit'
        submit.disabled = false
      }
    }
  })
})

// YouTube facades in blog posts: load the player only on click.
document.querySelectorAll<HTMLElement>('[data-video-embed]').forEach((el) =>
  el.addEventListener('click', (e) => {
    e.preventDefault()
    const iframe = document.createElement('iframe')
    iframe.src = el.dataset.videoEmbed!
    iframe.title = el.getAttribute('aria-label') ?? 'Video'
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture'
    iframe.allowFullscreen = true
    iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0'
    el.replaceWith(iframe)
  }),
)

// Phone clicks are the main conversion; report them to GA4.
document.addEventListener('click', (e) => {
  const a = e.target instanceof Element ? e.target.closest('a[href^="tel:"]') : null
  if (a) (window as any).gtag?.('event', 'phone_call_click', {link_url: a.getAttribute('href'), page_path: location.pathname})
})
