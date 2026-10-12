import {defineArrayMember, defineField, defineType} from 'sanity'

// Body copy for posts, services and locations. Mirrors what the Webflow rich text
// fields contained (headings, lists, links, figures, tables, video embeds) so the
// import is lossless.
export const richText = defineType({
  name: 'richText',
  title: 'Rich text',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [
        {title: 'Paragraph', value: 'normal'},
        {title: 'Heading 2', value: 'h2'},
        {title: 'Heading 3', value: 'h3'},
        {title: 'Heading 4', value: 'h4'},
        {title: 'Heading 5', value: 'h5'},
        {title: 'Heading 6', value: 'h6'},
        {title: 'Quote', value: 'blockquote'},
      ],
      lists: [
        {title: 'Bullet', value: 'bullet'},
        {title: 'Numbered', value: 'number'},
      ],
      marks: {
        decorators: [
          {title: 'Bold', value: 'strong'},
          {title: 'Italic', value: 'em'},
          {title: 'Superscript', value: 'sup'},
          {title: 'Subscript', value: 'sub'},
          {title: 'Underline', value: 'underline'},
        ],
        annotations: [
          defineArrayMember({
            name: 'link',
            type: 'object',
            title: 'Link',
            fields: [
              defineField({
                name: 'href',
                type: 'string',
                title: 'URL',
                description: 'Internal links: start with / (e.g. /services/panels). External: full https:// URL.',
                validation: (rule) =>
                  rule.required().custom((value) => {
                    if (!value) return true
                    if (value.startsWith('/') || value.startsWith('#') || /^(https?:|mailto:|tel:)/.test(value)) return true
                    return 'Use a path starting with / or a full URL'
                  }),
              }),
              defineField({name: 'openInNewTab', type: 'boolean', title: 'Open in new tab', initialValue: false}),
            ],
          }),
        ],
      },
    }),
    defineArrayMember({
      type: 'image',
      name: 'figure',
      title: 'Image',
      options: {hotspot: true},
      fields: [
        defineField({name: 'alt', type: 'string', title: 'Alt text', validation: (rule) => rule.required().warning('Add alt text')}),
        defineField({name: 'caption', type: 'string', title: 'Caption'}),
      ],
    }),
    defineArrayMember({type: 'table'}),
    defineArrayMember({type: 'videoEmbed'}),
    defineArrayMember({type: 'callToAction'}),
  ],
})
