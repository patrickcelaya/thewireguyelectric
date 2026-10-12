import {callToAction} from './objects/call-to-action'
import {faqItem} from './objects/faq-item'
import {linkItem} from './objects/link-item'
import {openingHours} from './objects/opening-hours'
import {postalAddress} from './objects/postal-address'
import {richText} from './objects/rich-text'
import {seo} from './objects/seo'
import {table} from './objects/table'
import {videoEmbed} from './objects/video-embed'
import {pageSections} from './sections/page-sections'
import {faq} from './documents/faq'
import {jobOpening} from './documents/job-opening'
import {location} from './documents/location'
import {page} from './documents/page'
import {post} from './documents/post'
import {postCategory} from './documents/post-category'
import {project} from './documents/project'
import {redirect} from './documents/redirect'
import {review} from './documents/review'
import {service} from './documents/service'
import {serviceCategory} from './documents/service-category'
import {serviceLocation} from './documents/service-location'
import {siteSettings} from './documents/site-settings'
import {teamMember} from './documents/team-member'

export const schemaTypes = [
  // objects
  seo,
  richText,
  table,
  videoEmbed,
  callToAction,
  postalAddress,
  openingHours,
  faqItem,
  linkItem,
  pageSections,
  // documents
  siteSettings,
  page,
  service,
  serviceCategory,
  location,
  serviceLocation,
  post,
  postCategory,
  teamMember,
  faq,
  review,
  project,
  jobOpening,
  redirect,
]

export const singletonTypes = new Set(['siteSettings'])
