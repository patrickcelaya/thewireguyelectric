import {defineField, defineType, type SanityDocumentLike} from 'sanity'
import {ArrowRightIcon} from '@sanity/icons/ArrowRight'

function isValidPath(value: string | undefined) {
  if (!value) return 'Required'
  if (!value.startsWith('/')) return 'Must start with /'
  if (value.length > 1 && value.endsWith('/')) return 'No trailing slash (the site uses URLs without one)'
  if (/[^a-zA-Z0-9\-_/:.*]/.test(value)) return 'Invalid characters'
  return true
}

// Redirects are applied at build time (see web/src/config/redirects.mjs) and served
// by Vercel as 301s. Add one whenever a live URL changes or a page is removed.
export const redirect = defineType({
  name: 'redirect',
  title: 'Redirect',
  type: 'document',
  icon: ArrowRightIcon,
  validation: (rule) =>
    rule.custom((doc: SanityDocumentLike | undefined) =>
      doc?.source && doc.source === doc.destination ? 'Source and destination cannot be the same' : true,
    ),
  fields: [
    defineField({name: 'source', type: 'string', description: 'Old path, e.g. /services/electrical-panels', validation: (rule) => rule.required().custom(isValidPath)}),
    defineField({name: 'destination', type: 'string', description: 'New path (e.g. /services/panels) or full URL', validation: (rule) => rule.required()}),
    defineField({name: 'permanent', type: 'boolean', description: 'On = 301 permanent (almost always). Off = 302 temporary.', initialValue: true}),
    defineField({name: 'isEnabled', type: 'boolean', initialValue: true}),
    defineField({name: 'note', type: 'string', description: 'Why this redirect exists'}),
  ],
  preview: {select: {title: 'source', subtitle: 'destination'}},
})
