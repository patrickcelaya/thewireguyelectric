import {defineArrayMember, defineField} from 'sanity'
import {EnvelopeIcon} from '@sanity/icons/Envelope'
import {HomeIcon} from '@sanity/icons/Home'
import {BoltIcon} from '@sanity/icons/Bolt'
import {eyebrowField, sectionHeadingField} from '../shared/fields'
import {sectionPreview} from './preview'

// Contact: forms, offices and the closing call to action. Phone, email,
// addresses and hours always come from Site settings (one source of NAP).

const API_VERSION = '2026-10-01'

const CONTACT_DETAILS = [
  {title: 'Phone', value: 'phone'},
  {title: 'Email', value: 'email'},
  {title: 'Office addresses', value: 'offices'},
  {title: 'Opening hours', value: 'hours'},
]

export const contactSection = defineArrayMember({
  name: 'contactSection',
  title: 'Contact form',
  type: 'object',
  icon: EnvelopeIcon,
  description: 'A form (free estimate or job application) with the contact details from Site settings beside it.',
  fields: [
    eyebrowField,
    sectionHeadingField(),
    defineField({name: 'text', type: 'text', rows: 2}),
    defineField({
      name: 'detailsHeading',
      type: 'string',
      description: 'Optional line above the contact details, e.g. "We\'re Located in Mesa, Arizona and serve the entire Phoenix Valley".',
    }),
    defineField({
      name: 'contactDetails',
      title: 'Contact details to show',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      options: {list: CONTACT_DETAILS, layout: 'grid'},
      initialValue: ['phone', 'email', 'offices', 'hours'],
      description: 'Values come from Site settings. Leave all off to show only the form.',
    }),
    defineField({
      name: 'formType',
      type: 'string',
      options: {
        list: [
          {title: 'Free estimate request', value: 'estimate'},
          {title: 'Job application', value: 'careers'},
        ],
        layout: 'radio',
      },
      initialValue: 'estimate',
    }),
    defineField({name: 'formHeading', type: 'string', description: 'Heading over the form, e.g. "Start a request" or "Apply Now".'}),
    defineField({name: 'submitLabel', title: 'Submit button label', type: 'string', description: 'e.g. "Submit Request". Defaults to "Send".'}),
    defineField({
      name: 'successMessage',
      type: 'text',
      rows: 2,
      description: 'Shown after a successful submit, e.g. "Thank you! Your submission has been received. We will reach back out within one business day!" Only promise what the office does.',
    }),
  ],
  preview: {
    select: {title: 'heading', formType: 'formType'},
    prepare: sectionPreview('Contact form', (v) => (v.formType === 'careers' ? 'job application' : 'estimate request')),
  },
})

export const officeLocationsSection = defineArrayMember({
  name: 'officeLocationsSection',
  title: 'Office locations',
  type: 'object',
  icon: HomeIcon,
  description:
    'Office cards (name, address, phone, directions) from Site settings → Addresses. Keep the addresses identical to each Google Business Profile.',
  fields: [
    eyebrowField,
    sectionHeadingField(),
    defineField({name: 'intro', type: 'text', rows: 2}),
    defineField({
      name: 'offices',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      options: {layout: 'tags'},
      description: 'Optional. The city of each office to show, exactly as in Site settings (e.g. "Scottsdale"). Leave empty to show every office.',
      validation: (rule) =>
        rule.custom(async (cities, context) => {
          if (!Array.isArray(cities) || !cities.length) return true
          const known = await context
            .getClient({apiVersion: API_VERSION})
            .fetch<string[] | null>(`*[_id == "siteSettings"][0].addresses[].addressLocality`)
          const missing = (cities as string[]).filter((c) => !(known ?? []).includes(c))
          return missing.length ? `No office in Site settings for: ${missing.join(', ')}` : true
        }),
    }),
  ],
  preview: {
    select: {title: 'heading', offices: 'offices'},
    prepare: sectionPreview('Office locations', (v) => (Array.isArray(v.offices) && v.offices.length ? (v.offices as string[]).join(', ') : 'all offices')),
  },
})

export const ctaSection = defineArrayMember({
  name: 'ctaSection',
  title: 'Call to action band',
  type: 'object',
  icon: BoltIcon,
  description: 'The closing band ("We\'re ready to work for you"). Leave the heading empty to use the site-wide band from Site settings → Shared copy.',
  fields: [defineField({name: 'cta', type: 'callToAction'})],
  preview: {select: {title: 'cta.heading'}, prepare: (value) => sectionPreview('CTA band')({...value, title: (value.title as string | undefined) || 'Site-wide CTA band'})},
})
