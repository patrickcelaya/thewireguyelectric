import {defineField, defineType} from 'sanity'
import {CheckmarkCircleIcon} from '@sanity/icons/CheckmarkCircle'
import {iconField} from '../shared/fields'

// One item in a list of reasons or capabilities: "No BS pricing" with its blurb
// and link, or a checklist entry like "Panel Upgrades" that links to its service.
// Used by the Feature grid section and by Site settings (value props, capabilities).
export const featureItem = defineType({
  name: 'featureItem',
  title: 'Feature',
  type: 'object',
  icon: CheckmarkCircleIcon,
  fields: [
    defineField({name: 'title', type: 'string', description: 'e.g. "No BS pricing" or "Panel Upgrades"', validation: (rule) => rule.required()}),
    defineField({name: 'text', type: 'text', rows: 3, description: 'Optional supporting sentence(s). Checklist items usually have none.'}),
    iconField(),
    defineField({
      name: 'service',
      type: 'reference',
      to: [{type: 'service'}],
      description: 'Optional. The service this item is about; the title then links to that service page.',
    }),
    defineField({name: 'link', type: 'linkItem', description: 'Optional text link under the item, e.g. "Get a Free Estimate" → /contact-us'}),
  ],
  preview: {
    select: {title: 'title', text: 'text', service: 'service.name'},
    prepare: ({title, text, service}) => ({title, subtitle: service ? `→ ${service}` : text}),
  },
})
