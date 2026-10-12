import type {StructureResolver} from 'sanity/structure'
import {CogIcon} from '@sanity/icons/Cog'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem().title('Site settings').id('siteSettings').icon(CogIcon).child(S.document().schemaType('siteSettings').documentId('siteSettings')),
      S.divider(),
      S.documentTypeListItem('page').title('Pages'),
      S.documentTypeListItem('service').title('Services'),
      S.documentTypeListItem('serviceCategory').title('Service categories'),
      S.documentTypeListItem('location').title('Service areas (cities)'),
      S.documentTypeListItem('serviceLocation').title('Service-in-city pages'),
      S.divider(),
      S.documentTypeListItem('post').title('Blog posts'),
      S.documentTypeListItem('postCategory').title('Blog categories'),
      S.documentTypeListItem('teamMember').title('Team'),
      S.documentTypeListItem('project').title('Projects'),
      S.documentTypeListItem('review').title('Reviews'),
      S.documentTypeListItem('faq').title('FAQs'),
      S.documentTypeListItem('jobOpening').title('Job openings'),
      S.divider(),
      S.documentTypeListItem('redirect').title('Redirects'),
    ])
