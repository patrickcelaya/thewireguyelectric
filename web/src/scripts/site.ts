// The site script: behaviour only, never content. Every word and link is in the
// HTML; motion is CSS. Bundled by Astro (one small module per page) from the
// layout. Hooks are data attributes, listed in docs/DESIGN_SYSTEM.md.
import {initHeader} from './site/header'
import {initMotion} from './site/motion'
import {initBulbs} from './site/bulb'
import {initValley} from './site/valley'
import {initReviews} from './site/reviews'
import {initForms} from './site/forms'
import {initVideos} from './site/video'
import {track} from './site/util'

initHeader()
initMotion()
initBulbs()
initValley()
initReviews()
initForms()
initVideos()

// analytics: the GA4 event name the live site used
document.addEventListener('click', (e) => {
  if ((e.target as Element).closest('a[href^="tel:"]')) track('phone_call_click')
})
