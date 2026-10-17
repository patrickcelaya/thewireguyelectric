import type {PreviewValue} from 'sanity'

// Shared preview helpers for page-builder sections: the Studio list shows the
// section's heading (or its type when there is none) plus a short summary.

/** Title = heading (or the section label), subtitle = section label plus optional detail. */
export function sectionPreview(label: string, detail?: (value: Record<string, unknown>) => string | undefined) {
  return (value: Record<string, unknown>): PreviewValue => {
    const extra = detail?.(value)
    return {
      title: (value.title as string | undefined) || label,
      subtitle: [label, extra].filter(Boolean).join(' · '),
      media: value.media as PreviewValue['media'],
    }
  }
}

export function countLabel(items: unknown, singular: string, plural = `${singular}s`) {
  const n = Array.isArray(items) ? items.length : 0
  return n ? `${n} ${n === 1 ? singular : plural}` : undefined
}
