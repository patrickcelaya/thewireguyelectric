import {defineArrayMember, defineField, defineType} from 'sanity'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import {fieldGroups, imageField, legacyIdField, seoField, urlSlugField, wordCount} from '../shared/fields'

export const post = defineType({
  name: 'post',
  title: 'Blog post',
  type: 'document',
  icon: DocumentTextIcon,
  groups: fieldGroups,
  fields: [
    defineField({name: 'title', type: 'string', group: 'content', validation: (rule) => rule.required()}),
    urlSlugField('/blog-posts'),
    defineField({name: 'excerpt', title: 'Summary', type: 'text', rows: 3, group: 'content', description: 'Shown on the blog grid and used as the default meta description'}),
    defineField({
      name: 'quickAnswer',
      title: 'Quick answer',
      type: 'text',
      rows: 4,
      group: 'content',
      description:
        'Answer-first summary shown above the article: 40–60 words that answer the title\'s question directly. Do not repeat the title. The first related service is linked right after it.',
      validation: (rule) =>
        rule.custom((value) => {
          const words = wordCount(value as string | undefined)
          if (!words) return true
          return words < 40 || words > 60 ? ({message: `${words} words; aim for 40–60`, level: 'warning'} as const) : true
        }),
    }),
    imageField('mainImage', 'Main image', {group: 'content'}),
    defineField({name: 'body', type: 'richText', group: 'content'}),
    defineField({name: 'category', type: 'reference', to: [{type: 'postCategory'}], group: 'content'}),
    defineField({
      name: 'author',
      type: 'reference',
      to: [{type: 'teamMember'}],
      group: 'content',
      description: 'A real licensed electrician as author is a strong E-E-A-T signal for home-service content',
    }),
    defineField({name: 'reviewedBy', type: 'reference', to: [{type: 'teamMember'}], group: 'content', description: 'Optional: licensed electrician who fact-checked the post'}),
    defineField({name: 'publishedAt', type: 'datetime', group: 'content', validation: (rule) => rule.required()}),
    defineField({name: 'updatedAt', title: 'Last meaningful update', type: 'datetime', group: 'content', description: 'Set only when the content materially changes. Shown as "Updated" and used in schema.'}),
    defineField({name: 'featured', type: 'boolean', group: 'content', initialValue: false}),
    defineField({name: 'relatedServices', type: 'array', group: 'content', of: [defineArrayMember({type: 'reference', to: [{type: 'service'}]})], description: 'The service pages this post supports. The first one is the primary service, linked right after the quick answer.'}),
    defineField({name: 'faqs', title: 'FAQs', type: 'array', group: 'content', of: [defineArrayMember({type: 'faqItem'})]}),
    seoField,
    legacyIdField,
  ],
  orderings: [{title: 'Newest', name: 'publishedDesc', by: [{field: 'publishedAt', direction: 'desc'}]}],
  preview: {select: {title: 'title', subtitle: 'publishedAt', media: 'mainImage'}, prepare: ({title, subtitle, media}) => ({title, subtitle: subtitle?.slice(0, 10), media})},
})
