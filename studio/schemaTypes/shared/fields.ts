import {defineField, type ValidationContext} from 'sanity'

const API_VERSION = '2026-10-01'

/**
 * Slug field for any document that renders at a public URL.
 *
 * URLs carry years of SEO equity, so changing the slug of a published document
 * raises a warning unless a redirect from the old path already exists.
 * `pathPrefix` is the URL segment before the slug, e.g. "/services".
 */
export function urlSlugField(pathPrefix: string, options: {source?: string} = {}) {
  return defineField({
    name: 'slug',
    title: 'URL slug',
    type: 'slug',
    description: `Public URL: ${pathPrefix}/<slug>. Changing this on a live page breaks links unless you add a redirect.`,
    options: {source: options.source ?? 'title', maxLength: 96},
    // Sanity takes the level from the rule, not from what a custom validator
    // returns, so the format check (error) and the live-URL check (warning) are
    // separate rules.
    validation: (rule) => [
      rule.required().custom((slug) => {
        const current = slug?.current
        if (!current) return 'Required'
        return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(current) ? true : 'Use lowercase letters, numbers and single hyphens only'
      }),
      rule
        .custom(async (slug, context) => (slug?.current ? warnOnLiveSlugChange(slug.current, pathPrefix, context) : true))
        .warning(),
    ],
  })
}

async function warnOnLiveSlugChange(current: string, pathPrefix: string, context: ValidationContext) {
  const id = context.document?._id?.replace(/^drafts\./, '')
  if (!id) return true
  const client = context.getClient({apiVersion: API_VERSION})
  const published = await client.fetch<string | null>(`*[_id == $id][0].slug.current`, {id})
  if (!published || published === current) return true
  const oldPath = `${pathPrefix}/${published}`
  const hasRedirect = await client.fetch<number>(
    `count(*[_type == "redirect" && source == $oldPath && isEnabled != false])`,
    {oldPath},
  )
  if (hasRedirect > 0) return true
  return `This page is live at ${oldPath}. Add a Redirect from ${oldPath} to ${pathPrefix}/${current} before publishing, or Google will see a 404.`
}

const ALT_DESCRIPTION =
  'Describe what the photo shows for people who cannot see it, e.g. "Electrician installing a 200A panel in a Gilbert garage". Not a filename, not a list of keywords.'

/** The alt text sub-field every image carries. */
export function altField(level: 'error' | 'warning' = 'error') {
  return defineField({
    name: 'alt',
    title: 'Alt text',
    type: 'string',
    description: ALT_DESCRIPTION,
    validation: (rule) =>
      level === 'error' ? rule.required().error('Add alt text: it is required for accessibility') : rule.required().warning('Alt text helps accessibility and image search'),
  })
}

export const captionField = defineField({
  name: 'caption',
  title: 'Caption',
  type: 'string',
  description: 'Optional visible caption, e.g. "New 200A panel and SRP meter, Gilbert".',
})

/**
 * Image with alt text: alt text is an accessibility and image-search signal.
 *
 * Document images (imported from Webflow, many without alt today) warn when alt
 * is missing so existing content can still be published; images in page
 * sections and galleries pass `altRequired: 'error'`.
 */
export function imageField(
  name: string,
  title: string,
  options: {required?: boolean; description?: string; altRequired?: 'error' | 'warning'; caption?: boolean; group?: string} = {},
) {
  return defineField({
    name,
    title,
    type: 'image',
    description: options.description,
    group: options.group,
    options: {hotspot: true},
    fields: [altField(options.altRequired ?? 'warning'), ...(options.caption ? [captionField] : [])],
    validation: options.required ? (rule) => rule.required() : undefined,
  })
}

/** Image inside a page section: alt text is always required. */
export function sectionImageField(name = 'image', title = 'Image', description?: string) {
  return imageField(name, title, {altRequired: 'error', description})
}

/**
 * Icon names are content tokens, not artwork: the design system maps each one to
 * its own icon, so a rebrand changes the drawing without touching content.
 */
export const ICON_OPTIONS = [
  {title: 'Lightning bolt', value: 'bolt'},
  {title: 'Light bulb', value: 'bulb'},
  {title: 'Plug / outlet', value: 'plug'},
  {title: 'Electrical panel', value: 'panel'},
  {title: 'EV charger', value: 'evCharger'},
  {title: 'Wrench (repairs)', value: 'wrench'},
  {title: 'Check mark', value: 'check'},
  {title: 'Shield (insured, safety)', value: 'shield'},
  {title: 'Badge (license)', value: 'badge'},
  {title: 'Star (reviews)', value: 'star'},
  {title: 'Dollar (pricing)', value: 'dollar'},
  {title: 'Clock (on time, hours)', value: 'clock'},
  {title: 'Calendar (since, scheduling)', value: 'calendar'},
  {title: 'Clipboard (estimate, inspection)', value: 'clipboard'},
  {title: 'Document (permit)', value: 'document'},
  {title: 'Home (residential)', value: 'home'},
  {title: 'Building (commercial)', value: 'building'},
  {title: 'People (team, family)', value: 'users'},
  {title: 'Heart (care)', value: 'heart'},
  {title: 'Thumbs up (satisfaction)', value: 'thumbsUp'},
  {title: 'Phone', value: 'phone'},
  {title: 'Map pin (area)', value: 'pin'},
]

export function iconField(description = 'Optional. The design picks the actual artwork for each name.') {
  return defineField({name: 'icon', title: 'Icon', type: 'string', description, options: {list: ICON_OPTIONS}})
}

export const eyebrowField = defineField({
  name: 'eyebrow',
  title: 'Eyebrow',
  type: 'string',
  description: 'Short label above the heading, e.g. "Our Team". Optional.',
})

/** Section heading. Section headings render as H2; the page H1 always comes from the page itself. */
export function sectionHeadingField(description?: string) {
  return defineField({
    name: 'heading',
    title: 'Heading',
    type: 'string',
    description: description ?? 'Rendered as an H2. The page H1 always comes from the page\'s "H1 heading" field.',
  })
}

/**
 * Words inside a heading that the design highlights (e.g. "top choice" in
 * "Mesa's top choice electricians..."). Purely a highlight: the heading text
 * itself never changes, so SEO parity is unaffected.
 */
export function headingAccentField(of: 'section' | 'page' = 'section') {
  return defineField({
    name: 'headingAccent',
    title: 'Highlighted words',
    type: 'string',
    description:
      of === 'page'
        ? 'Optional. Words of the page\'s H1 heading to highlight, copied exactly, e.g. "top choice". The H1 text itself never changes.'
        : 'Optional. Words of the heading to highlight, copied exactly, e.g. "your needs".',
    validation: (rule) =>
      rule.custom((accent, context) => {
        if (!accent) return true
        const heading =
          of === 'page'
            ? ((context.document as {heading?: string; title?: string} | undefined)?.heading ?? (context.document as {title?: string} | undefined)?.title)
            : (context.parent as {heading?: string} | undefined)?.heading
        if (!heading) return true
        return heading.includes(accent) ? true : `"${accent}" does not appear in the heading, so nothing will be highlighted`
      })
        .warning(),
  })
}

/** Topics used to group shared FAQs (faq.topic) and to pull them into FAQ sections. */
export const FAQ_TOPICS = [
  'General',
  'Pricing',
  'Panels',
  'EV chargers',
  'Lighting',
  'Troubleshooting',
  'Safety',
  'Permits',
  'Services',
  'Company',
  'Hiring',
  'Commercial',
]

/** Electric utilities in the service area. Utility territory affects panel upgrades, EV chargers and solar interconnects. */
export const UTILITY_PROVIDERS = ['SRP', 'APS', 'City of Mesa', 'TEP', 'ED3']

/** Count the words in a plain string. */
export function wordCount(text: string | undefined) {
  return text ? text.trim().split(/\s+/).filter(Boolean).length : 0
}

export const seoField = defineField({
  name: 'seo',
  title: 'SEO',
  type: 'seo',
  group: 'seo',
})

export const fieldGroups = [
  {name: 'content', title: 'Content', default: true},
  {name: 'seo', title: 'SEO'},
  {name: 'legacy', title: 'Webflow import'},
]

/** Webflow item ID kept on imported documents so imports are idempotent and auditable. */
/**
 * When a page's content last changed materially: the sitemap's <lastmod>. The migration
 * stamps it whenever it changes a document; update it when you change the content.
 */
export const contentUpdatedField = defineField({
  name: 'updatedAt',
  title: 'Content last changed',
  type: 'datetime',
  group: 'seo',
  description: 'Update this when you change the page\'s content in a meaningful way. Search engines read it from the sitemap.',
})

export const legacyIdField = defineField({
  name: 'webflowId',
  title: 'Webflow item ID',
  type: 'string',
  readOnly: true,
  group: 'legacy',
})
