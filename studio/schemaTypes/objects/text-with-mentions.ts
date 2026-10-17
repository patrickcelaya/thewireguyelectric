import {defineArrayMember, defineField, defineType} from 'sanity'
import {UserIcon} from '@sanity/icons/User'

// Short paragraphs where team members can be mentioned by name. Select a name
// (e.g. "Steven") and add a "Team member" mark: the site renders the name with
// the person's photo and links it to /our-team. Used by the Team intro section.
export const textWithMentions = defineType({
  name: 'textWithMentions',
  title: 'Text with team mentions',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [{title: 'Paragraph', value: 'normal'}],
      lists: [],
      marks: {
        decorators: [
          {title: 'Bold', value: 'strong'},
          {title: 'Italic', value: 'em'},
        ],
        annotations: [
          defineArrayMember({
            name: 'teamMemberMention',
            title: 'Team member',
            type: 'object',
            icon: UserIcon,
            fields: [
              defineField({
                name: 'member',
                type: 'reference',
                to: [{type: 'teamMember'}],
                validation: (rule) => rule.required(),
              }),
            ],
          }),
          defineArrayMember({
            name: 'link',
            title: 'Link',
            type: 'object',
            fields: [
              defineField({
                name: 'href',
                type: 'string',
                title: 'URL',
                description: 'Internal links start with / (e.g. /about-us). External: full https:// URL.',
                validation: (rule) =>
                  rule.required().custom((value) => {
                    if (!value) return true
                    if (value.startsWith('/') || value.startsWith('#') || /^(https?:|mailto:|tel:)/.test(value)) return true
                    return 'Use a path starting with / or a full URL'
                  }),
              }),
            ],
          }),
        ],
      },
    }),
  ],
})
