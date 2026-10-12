import {defineArrayMember, defineField, defineType} from 'sanity'
import {UserIcon} from '@sanity/icons/User'
import {imageField} from '../shared/fields'

export const teamMember = defineType({
  name: 'teamMember',
  title: 'Team member',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({name: 'name', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'slug', type: 'slug', options: {source: 'name'}}),
    defineField({name: 'role', type: 'string', description: 'e.g. "Owner & Master Electrician"'}),
    imageField('photo', 'Photo'),
    defineField({name: 'bio', type: 'richText'}),
    defineField({name: 'credentials', type: 'array', of: [defineArrayMember({type: 'string'})], description: 'Licenses, certifications, years in the trade'}),
    defineField({name: 'yearsExperience', type: 'number'}),
    defineField({name: 'sameAs', title: 'Profiles', type: 'array', of: [defineArrayMember({type: 'url'})], description: 'LinkedIn etc.'}),
    defineField({name: 'showOnTeamPage', type: 'boolean', initialValue: true}),
    defineField({name: 'order', type: 'number'}),
  ],
  preview: {select: {title: 'name', subtitle: 'role', media: 'photo'}},
})
