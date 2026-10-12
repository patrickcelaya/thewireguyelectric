import {defineField, defineType} from 'sanity'
import {HelpCircleIcon} from '@sanity/icons/HelpCircle'

// Inline question/answer for page-specific FAQs. Shared FAQs live in the `faq` document type.
export const faqItem = defineType({
  name: 'faqItem',
  title: 'Question',
  type: 'object',
  icon: HelpCircleIcon,
  fields: [
    defineField({name: 'question', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'answer', type: 'richText', validation: (rule) => rule.required()}),
  ],
  preview: {select: {title: 'question'}},
})
