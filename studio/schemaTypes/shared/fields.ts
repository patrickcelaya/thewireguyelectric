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
    validation: (rule) =>
      rule.required().custom(async (slug, context) => {
        const current = slug?.current
        if (!current) return 'Required'
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(current)) {
          return 'Use lowercase letters, numbers and single hyphens only'
        }
        return warnOnLiveSlugChange(current, pathPrefix, context)
      }),
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
  return {
    message: `This page is live at ${oldPath}. Add a Redirect from ${oldPath} to ${pathPrefix}/${current} before publishing, or Google will see a 404.`,
    level: 'warning',
  } as const
}

/** Image with required alt text: alt text is an accessibility and image-search signal. */
export function imageField(name: string, title: string, options: {required?: boolean; description?: string} = {}) {
  return defineField({
    name,
    title,
    type: 'image',
    description: options.description,
    options: {hotspot: true},
    fields: [
      defineField({
        name: 'alt',
        title: 'Alt text',
        type: 'string',
        description: 'Describe the image for people who cannot see it, e.g. "Electrician installing a 200A panel in a Gilbert garage".',
        validation: (rule) => rule.required().warning('Alt text helps accessibility and image search'),
      }),
    ],
    validation: options.required ? (rule) => rule.required() : undefined,
  })
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
export const legacyIdField = defineField({
  name: 'webflowId',
  title: 'Webflow item ID',
  type: 'string',
  readOnly: true,
  group: 'legacy',
})
