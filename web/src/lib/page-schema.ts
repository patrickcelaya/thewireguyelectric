// JSON-LD for page-builder pages, built from the sections the page shows, so the
// structured data describes exactly what is visible: a Person per team card, a
// JobPosting per open job shown (directApply when the page has the application form),
// and one FAQPage from the visible questions (collectPageFaqs + faqNode).
import type {PageDoc, SiteSettings} from './types'
import {BUSINESS_ID, faqNode, jobPostingNode, webPageNode} from './schema'
import {absoluteUrl, type Crumb} from './seo'
import {collectPageFaqs} from './queries'
import {currentJobs} from './jobs'
import {imageUrl, hasImage} from './image'

type Node = Record<string, unknown>

/** A Person node for each team member a team section shows (de-duplicated). */
function personNodes(page: Pick<PageDoc, 'sections'>): Node[] {
  const seen = new Set<string>()
  const nodes: Node[] = []
  for (const section of page.sections ?? []) {
    if (section._type !== 'teamSection') continue
    for (const m of section.members) {
      if (seen.has(m._id)) continue
      seen.add(m._id)
      nodes.push({
        '@type': 'Person',
        '@id': absoluteUrl(`/our-team#${m.slug ?? m._id}`),
        name: m.name,
        jobTitle: m.role,
        image: hasImage(m.photo) ? imageUrl(m.photo, {width: 600, format: 'jpg'}) : undefined,
        hasCredential: m.credentials?.length ? m.credentials : undefined,
        worksFor: {'@id': BUSINESS_ID},
      })
    }
  }
  return nodes
}

/** A JobPosting for each open job a jobs section shows. */
function jobNodes(page: Pick<PageDoc, 'sections'>, settings: SiteSettings): Node[] {
  const sections = page.sections ?? []
  const directApply = sections.some((s) => s._type === 'contactSection' && s.formType === 'careers')
  return sections.flatMap((s) =>
    s._type === 'jobsSection' ? currentJobs(s.jobs).map((job) => ({...jobPostingNode(job, settings), ...(directApply ? {directApply: true} : {})})) : [],
  )
}

/**
 * The page's own nodes for SiteLayout's `schema`: the WebPage (typed AboutPage,
 * ContactPage, CollectionPage… as the live page was), the people, the jobs and the
 * one FAQPage, plus any extra nodes the route adds (the blog's Blog node).
 */
export function pageSchema(opts: {
  page: Pick<PageDoc, 'sections'>
  settings: SiteSettings
  path: string
  title: string
  description?: string
  type?: string
  crumbs?: Crumb[]
  /** What the page is about, e.g. the business (/about-us) or the list it shows (/services). */
  mainEntity?: Node
  extra?: Array<Node | undefined>
}): Array<Node | undefined> {
  const {page, settings, path, title, description, type, crumbs, mainEntity, extra = []} = opts
  return [
    {...webPageNode({path, title, description, type, breadcrumbs: crumbs}), ...(mainEntity ? {mainEntity} : {})},
    ...personNodes(page),
    ...jobNodes(page, settings),
    faqNode(path, collectPageFaqs(page)),
    ...extra,
  ]
}
