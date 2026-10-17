import {defineField, defineType} from 'sanity'
import {DoubleQuoteIcon} from '@sanity/icons/DoubleQuote'

// A short quote from a real customer review, e.g. "Went above and beyond, great
// prices too!". Shown in heroes as social proof. Never write one: copy it from a
// real review, and link the review document when there is one.
export const reviewSnippet = defineType({
  name: 'reviewSnippet',
  title: 'Review quote',
  type: 'object',
  icon: DoubleQuoteIcon,
  fields: [
    defineField({
      name: 'text',
      title: 'Quote',
      type: 'string',
      description: 'Verbatim words from a real review, without quotation marks (the design adds them).',
      validation: (rule) => [rule.required(), rule.max(140).warning('Keep hero quotes short (under ~140 characters)')],
    }),
    defineField({
      name: 'review',
      type: 'reference',
      to: [{type: 'review'}],
      description: 'Optional. The full review this quote comes from; its author, date and rating are shown when set.',
    }),
    defineField({
      name: 'rating',
      type: 'number',
      description: 'Star rating of the original review (1–5). Leave empty when unknown; ignored when a review is linked.',
      validation: (rule) => rule.min(1).max(5).integer(),
    }),
  ],
  preview: {
    select: {title: 'text', author: 'review.authorName'},
    prepare: ({title, author}) => ({title: title ? `“${title}”` : 'Review quote', subtitle: author}),
  },
})
