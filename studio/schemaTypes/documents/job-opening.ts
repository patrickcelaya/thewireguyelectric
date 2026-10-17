import {defineField, defineType} from 'sanity'
import {CaseIcon} from '@sanity/icons/Case'

// Rendered on /careers with JobPosting schema (eligible for Google Jobs).
export const jobOpening = defineType({
  name: 'jobOpening',
  title: 'Job opening',
  type: 'document',
  icon: CaseIcon,
  fields: [
    defineField({name: 'title', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'description', type: 'richText', validation: (rule) => rule.required()}),
    defineField({name: 'employmentType', type: 'string', options: {list: ['FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'TEMPORARY', 'INTERN']}, initialValue: 'FULL_TIME'}),
    defineField({name: 'datePosted', type: 'date', validation: (rule) => rule.required()}),
    defineField({name: 'validThrough', type: 'date'}),
    defineField({
      name: 'minExperienceMonths',
      title: 'Minimum experience (months)',
      type: 'number',
      description: 'The experience the posting asks for, in months: 48 for "4+ years". Goes into the JobPosting markup; empty = left out. Keep it equal to what the description says.',
      validation: (rule) => rule.integer().min(0),
    }),
    defineField({
      name: 'baseSalary',
      type: 'object',
      fields: [
        defineField({name: 'min', type: 'number'}),
        defineField({name: 'max', type: 'number'}),
        defineField({name: 'unit', type: 'string', options: {list: ['HOUR', 'YEAR']}, initialValue: 'HOUR'}),
      ],
    }),
    defineField({name: 'isOpen', type: 'boolean', initialValue: true}),
  ],
  preview: {select: {title: 'title', subtitle: 'employmentType'}},
})
