import {defineField, defineType} from 'sanity'
import {PlayIcon} from '@sanity/icons/Play'

export const videoEmbed = defineType({
  name: 'videoEmbed',
  title: 'Video',
  type: 'object',
  icon: PlayIcon,
  fields: [
    defineField({
      name: 'url',
      type: 'url',
      title: 'Video URL',
      description: 'YouTube or Vimeo link. Rendered as a lightweight click-to-play embed so it does not slow the page.',
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'title', type: 'string', title: 'Video title', description: 'Used for accessibility and VideoObject schema'}),
  ],
  preview: {select: {title: 'title', subtitle: 'url'}},
})
