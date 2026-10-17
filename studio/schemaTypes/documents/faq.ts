import {defineArrayMember, defineField, defineType} from 'sanity'
import {HelpCircleIcon} from '@sanity/icons/HelpCircle'
import {FAQ_TOPICS} from '../shared/fields'

// Shared FAQs, reused on the /faq page and on relevant service and city pages.
export const faq = defineType({
  name: 'faq',
  title: 'FAQ',
  type: 'document',
  icon: HelpCircleIcon,
  fields: [
    defineField({name: 'question', type: 'string', validation: (rule) => rule.required()}),
    defineField({
      name: 'answer',
      type: 'richText',
      description: 'Answer the question in the first sentence. The visible answer and the FAQPage structured data both come from here, so they always match.',
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'topic', type: 'string', description: 'Groups the question on the FAQ page and lets FAQ sections pull every question on a topic', options: {list: FAQ_TOPICS}}),
    defineField({name: 'services', type: 'array', of: [defineArrayMember({type: 'reference', to: [{type: 'service'}]})]}),
    defineField({name: 'order', type: 'number'}),
  ],
  preview: {select: {title: 'question', subtitle: 'topic'}},
})
