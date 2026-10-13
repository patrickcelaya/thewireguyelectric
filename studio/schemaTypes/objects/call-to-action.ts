import {defineField, defineType} from 'sanity'
import {BoltIcon} from '@sanity/icons/Bolt'

// A call to action: the closing "We're ready to work for you" band, the
// site-wide default in Site settings, and inline CTAs inside rich text.
export const callToAction = defineType({
  name: 'callToAction',
  title: 'Call to action',
  type: 'object',
  icon: BoltIcon,
  fields: [
    defineField({name: 'heading', type: 'string', description: 'Rendered as an H2 in bands (never an H1).'}),
    defineField({name: 'text', type: 'text', rows: 2}),
    defineField({name: 'label', type: 'string', title: 'Button label', initialValue: 'Get a free estimate'}),
    defineField({name: 'href', type: 'string', title: 'Button link', initialValue: '/contact-us'}),
    defineField({
      name: 'statusText',
      title: 'Status line',
      type: 'string',
      description: 'Optional short line near the button, e.g. "Free estimates available". Keep it true at every hour of the day.',
    }),
  ],
  preview: {select: {title: 'heading', subtitle: 'label'}, prepare: ({title, subtitle}) => ({title: title || 'Call to action', subtitle})},
})
