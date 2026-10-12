import {defineArrayMember, defineField, defineType} from 'sanity'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import {fieldGroups, imageField, legacyIdField, seoField, urlSlugField} from '../shared/fields'

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
    imageField('mainImage', 'Main image'),
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
    defineField({name: 'relatedServices', type: 'array', group: 'content', of: [defineArrayMember({type: 'reference', to: [{type: 'service'}]})], description: 'Links the post to the money pages it supports'}),
    defineField({name: 'faqs', title: 'FAQs', type: 'array', group: 'content', of: [defineArrayMember({type: 'faqItem'})]}),
    seoField,
    legacyIdField,
  ],
  orderings: [{title: 'Newest', name: 'publishedDesc', by: [{field: 'publishedAt', direction: 'desc'}]}],
  preview: {select: {title: 'title', subtitle: 'publishedAt', media: 'mainImage'}, prepare: ({title, subtitle, media}) => ({title, subtitle: subtitle?.slice(0, 10), media})},
})
