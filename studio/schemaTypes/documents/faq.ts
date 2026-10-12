import {defineArrayMember, defineField, defineType} from 'sanity'
import {HelpCircleIcon} from '@sanity/icons/HelpCircle'

// Shared FAQs, reused on the /faq page and on relevant service and city pages.
export const faq = defineType({
  name: 'faq',
  title: 'FAQ',
  type: 'document',
  icon: HelpCircleIcon,
  fields: [
    defineField({name: 'question', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'answer', type: 'richText', validation: (rule) => rule.required()}),
    defineField({name: 'topic', type: 'string', options: {list: ['Pricing', 'Panels', 'EV chargers', 'Lighting', 'Troubleshooting', 'Safety', 'Permits', 'Company', 'Commercial']}}),
    defineField({name: 'services', type: 'array', of: [defineArrayMember({type: 'reference', to: [{type: 'service'}]})]}),
    defineField({name: 'order', type: 'number'}),
  ],
  preview: {select: {title: 'question', subtitle: 'topic'}},
})
