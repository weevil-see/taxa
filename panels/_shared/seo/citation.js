// How to cite a page, from project.yml (project_authors, project_citation),
// as machine-readable tags: Google Scholar's citation_* tags (one
// citation_author per author) and the full text as DC.bibliographicCitation,
// the footer's citation without its "Retrieved on" date (a date written into
// a page file would be the build date, not the reader's). Shared by
// scripts/write-route-pages.mjs (the page files) and PageTitle.vue (the
// running app, which reference managers like Zotero read). No Vue and no '@/'
// imports, so node can use it.

/**
 * "Yunakov, N., Girón Duque, J.C., del Río, M.G. (2026)." ->
 * { authors: ['Yunakov, N.', 'Girón Duque, J.C.', 'del Río, M.G.'], year: '2026' }
 * Each author is a surname, a comma and initials ("J.C.", "R.-S.").
 */
export function parseAuthors(text = '') {
  const year = String(text).match(/\((\d{4})\)/)?.[1] ?? null
  const list = String(text).replace(/\(\d{4}\)\.?\s*$/, '')
  const authors = [...list.matchAll(/\s*([^,]+?),\s*((?:\p{Lu}\.\s?-?)+)/gu)].map(
    ([, surname, initials]) => `${surname.trim()}, ${initials.replace(/\s+/g, '')}`
  )

  return { authors, year }
}

/**
 * The tags for one page, as [{ name, content }].
 * @param {object} page
 * @param {string} page.title   what is cited: the taxon name, the page's label
 * @param {string|null} page.url the page's address (none: no url tags)
 * @param {object} project      { project_authors, project_citation }
 */
export function citationTags({ title, url }, { project_authors, project_citation }) {
  if (!project_authors && !project_citation) return []

  const { authors, year } = parseAuthors(project_authors)
  const text = [project_authors, project_citation && `${project_citation}.`, url]
    .filter(Boolean)
    .join(' ')

  return [
    { name: 'citation_title', content: title },
    ...authors.map((author) => ({ name: 'citation_author', content: author })),
    ...(year ? [{ name: 'citation_publication_date', content: year }] : []),
    ...(url ? [{ name: 'citation_public_url', content: url }] : []),
    { name: 'DC.bibliographicCitation', content: text }
  ]
}
