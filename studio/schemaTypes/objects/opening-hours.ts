import {defineArrayMember, defineField, defineType} from 'sanity'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export const openingHours = defineType({
  name: 'openingHours',
  title: 'Opening hours',
  type: 'object',
  fields: [
    defineField({
      name: 'days',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      options: {list: DAYS.map((d) => ({title: d, value: d}))},
      validation: (rule) => rule.required().min(1),
    }),
    defineField({name: 'opens', type: 'string', description: '24h format, e.g. 08:00', validation: (rule) => rule.regex(/^\d{2}:\d{2}$/)}),
    defineField({name: 'closes', type: 'string', description: '24h format, e.g. 17:00', validation: (rule) => rule.regex(/^\d{2}:\d{2}$/)}),
  ],
  preview: {
    select: {days: 'days', opens: 'opens', closes: 'closes'},
    prepare: ({days, opens, closes}) => ({title: (days ?? []).join(', '), subtitle: `${opens ?? '?'}–${closes ?? '?'}`}),
  },
})
