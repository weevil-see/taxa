import { test } from 'node:test'
import assert from 'node:assert/strict'
import { citationTags, parseAuthors } from './citation.js'

const AUTHORS =
  'Yunakov, N., Girón Duque, J.C., Brown, S., Jilg, J., Schirok, T., Chamorro, L., Whitehouse, R.J., Meregalli, M., Anderson, R.S., del Río, M.G., Rincón, J., Cortés-Hernández, K., Cabras, A. (2026).'

test('the project.yml author list splits into its authors and year', () => {
  const { authors, year } = parseAuthors(AUTHORS)

  assert.equal(year, '2026')
  assert.equal(authors.length, 13)
  assert.deepEqual(authors.slice(0, 2), ['Yunakov, N.', 'Girón Duque, J.C.'])
  assert.ok(authors.includes('del Río, M.G.'))
  assert.ok(authors.includes('Cortés-Hernández, K.'))
  assert.equal(authors.at(-1), 'Cabras, A.')
})

test('a page gets title, authors, year, address and the full citation', () => {
  const tags = citationTags(
    { title: 'Aus bus L.', url: 'https://example.org/otus/1/overview' },
    { project_authors: 'Doe, J. (2026).', project_citation: 'Catalog. TaxonPages' }
  )

  assert.deepEqual(tags, [
    { name: 'citation_title', content: 'Aus bus L.' },
    { name: 'citation_author', content: 'Doe, J.' },
    { name: 'citation_publication_date', content: '2026' },
    { name: 'citation_public_url', content: 'https://example.org/otus/1/overview' },
    { name: 'DC.bibliographicCitation', content: 'Doe, J. (2026). Catalog. TaxonPages. https://example.org/otus/1/overview' }
  ])
})
