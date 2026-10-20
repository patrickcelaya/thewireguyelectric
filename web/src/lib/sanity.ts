// Data access. Reads from Sanity when PUBLIC_SANITY_PROJECT_ID is set; otherwise
// evaluates the same GROQ queries locally (groq-js) against the dataset generated
// from the Webflow export, so the site builds and can be parity-checked before
// the Sanity project exists.
import {createClient, type SanityClient} from '@sanity/client'
import {readFile} from 'node:fs/promises'
import path from 'node:path'

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID
const dataset = import.meta.env.PUBLIC_SANITY_DATASET || 'production'

export const sanityProjectId = projectId
export const sanityDataset = dataset

const client: SanityClient | null = projectId
  ? createClient({
      projectId,
      dataset,
      apiVersion: '2026-10-01',
      useCdn: false,
      perspective: 'published',
      token: import.meta.env.SANITY_API_READ_TOKEN,
    })
  : null

const LOCAL_DATASET = path.resolve(process.cwd(), '../migration/sanity-import/production.ndjson')
let localDocs: Promise<unknown[]> | undefined

async function loadLocalDocs() {
  localDocs ??= readFile(LOCAL_DATASET, 'utf8').then(
    (text) => {
      console.warn(`[sanity] PUBLIC_SANITY_PROJECT_ID not set; using local dataset ${LOCAL_DATASET}`)
      // In _id order, as Sanity returns documents: groq-js keeps dataset order for ties
      // and unordered queries, so file order would render pages production doesn't.
      return text
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line))
        .filter((doc) => !String(doc._id).startsWith('drafts.'))
        .sort((a, b) => (a._id < b._id ? -1 : a._id > b._id ? 1 : 0))
    },
    () => {
      console.warn('[sanity] No Sanity project and no local dataset; pages will render empty')
      return []
    },
  )
  return localDocs
}

export async function fetchQuery<T>(query: string, params: Record<string, unknown> = {}): Promise<T> {
  if (client) return client.fetch<T>(query, params)
  const {parse, evaluate} = await import('groq-js')
  const docs = await loadLocalDocs()
  const value = await evaluate(parse(query, {params}), {dataset: docs, params})
  return (await value.get()) as T
}
