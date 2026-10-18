#!/usr/bin/env node
// Writes web/src/lib/library-photos.json, the site's register of the owner's photo
// library, from library.json (what each photo shows, its head boxes, its roles) and
// assets.json (the Sanity asset each file became; run upload.mjs first).
//
//   node migration/brand-photos/registry.mjs
//
// lib/brand-photos.ts merges it into JOB_PHOTO_LIST (photos without people) and
// PHOTO_FACES (photos of people), and lib/image-names.ts into IMAGE_NAMES.

import {readFile, writeFile} from 'node:fs/promises'

const DIR = new URL('./', import.meta.url)
const OUT = new URL('../../web/src/lib/library-photos.json', import.meta.url)

const library = JSON.parse(await readFile(new URL('library.json', DIR), 'utf8'))
const assets = JSON.parse(await readFile(new URL('assets.json', DIR), 'utf8'))
const byKey = new Map((assets.library ?? []).map((a) => [a.key, a]))

const photos = library.photos.map((p) => {
  const asset = byKey.get(p.key)
  if (!asset) throw new Error(`${p.key} (${p.file}) is not in assets.json: run upload.mjs`)
  if (p.kind === 'people' && !p.faces) throw new Error(`${p.key}: a photo of people needs its head boxes`)
  if (p.kind === 'job' && !p.photoSubject) throw new Error(`${p.key}: a job photo needs a subject`)
  return {
    id: asset.assetId,
    name: p.name,
    alt: p.alt,
    caption: p.caption,
    kind: p.kind,
    // what the library's catalogue says it shows (finer than `subject`: chandelier-pendant, tech-at-work, crew-group, …)
    shows: p.subject,
    ...(p.photoSubject ? {subject: p.photoSubject} : {}),
    services: p.services,
    ...(p.faces ? {faces: p.faces} : {}),
    orientation: p.orientation,
    quality: p.quality,
    roles: p.roles,
    ...(p.heroCrop ? {heroCrop: p.heroCrop} : {}),
    // photos from one shoot of one subject (the same truck): a page shows at most one of them
    ...(p.group ? {group: p.group} : {}),
    // where the subject sits, for frames that crop the photo
    ...(p.hotspot ? {hotspot: p.hotspot} : {}),
  }
})

await writeFile(OUT, JSON.stringify(photos, null, 1) + '\n')
console.log(`Wrote ${OUT.pathname}: ${photos.length} photos (${photos.filter((p) => p.kind === 'people').length} with people)`)
