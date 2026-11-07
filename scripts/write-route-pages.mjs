// Run after `npm run build` (the deploy workflow does) when hash_mode is off.
//
// GitHub Pages has no server logic: a visitor or search engine opening
// /otus/723601/overview asks for a file of that name. This writes, into dist/:
// - a copy of the app's entry page (index.html, about 2 KB) for every page
//   search engines should find: the fixed pages and every OTU's overview under
//   ROOT_TAXON_NAME_ID, as <route>.html (GitHub Pages serves /a/b from
//   a/b.html), so they answer normally (HTTP 200). Each carries its own
//   title, description, canonical address and link-preview (Open Graph)
//   tags, and a taxon page its schema.org Taxon data (JSON-LD, the shape the
//   framework adds at runtime), for crawlers that don't run JavaScript; a taxon's description comes
//   from panels/_shared/seo/taxonDescription.js, as on the live page. The
//   tags are marked data-route-page; the app drops them when it starts
//   (staticHead.js) and sets its own;
// - 404.html, the same copy, for every other address (other tabs, news items,
//   OTUs added since this ran): visitors see the right page, only the HTTP
//   status is 404, so search engines skip those until the next deploy;
// - sitemap.xml, listing the pages written.
// The app reads the address and shows the page, as it does anyway.
//
//   node scripts/write-route-pages.mjs

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rankName, taxonDescription, taxonTitle } from '../panels/_shared/seo/taxonDescription.js'

// Curculionoidea: the OTUs whose pages are listed (not host plants and other
// association partners, which have pages too but aren't this catalog's
// subject). Same root as the home page's statistics.
const ROOT_TAXON_NAME_ID = 809411

const FIXED_ROUTES = {
  about: 'About',
  news: 'News',
  keys: 'Keys',
  'bibliography/search': 'Bibliography search',
  'bibliography/recent': 'Recently published'
}

const PER = 500
const PARALLEL = 6

const root = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url))
const config = (file) => readFileSync(root(`config/${file}`), 'utf8')
const setting = (text, key) => text.match(new RegExp(`^\\s*${key}:\\s*['"]?([^'"\\s]+)`, 'm'))?.[1]

const api = config('api.yml')
const BASE = setting(api, 'url')
const TOKEN = setting(api, 'project_token')

if (setting(config('router.yml'), 'hash_mode') === 'true') {
  console.log('hash_mode is on: no route pages needed.')
  process.exit(0)
}

const project = config('project.yml')
const siteUrl = (setting(project, 'site_url') || setting(project, 'project_url')).replace(/\/?$/, '/')
const projectName = project.match(/^\s*project_name:\s*['"]?(.+?)['"]?\s*$/m)[1]
const siteDescription =
  config('metadata.yml').match(/name:\s*description\s*\n\s*content:\s*['"]?(.+?)['"]?\s*$/m)?.[1] ?? ''

const DIST = root('dist/')
const entryHtml = readFileSync(`${DIST}index.html`, 'utf8')
const PLACEHOLDER = '<!--head-tags-->'

if (!entryHtml.includes(PLACEHOLDER)) throw new Error(`no ${PLACEHOLDER} in dist/index.html`)

const escapeHtml = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// The entry page with a page's own head tags in place of the placeholder.
function pageHtml({ title, description, route, jsonLd }) {
  const url = `${siteUrl}${route}`
  const tags = [
    `<title data-route-page>${escapeHtml(title)}</title>`,
    `<meta data-route-page name="description" content="${escapeHtml(description)}" />`,
    `<link data-route-page rel="canonical" href="${escapeHtml(url)}" />`,
    `<meta data-route-page property="og:title" content="${escapeHtml(title)}" />`,
    `<meta data-route-page property="og:description" content="${escapeHtml(description)}" />`,
    `<meta data-route-page property="og:url" content="${escapeHtml(url)}" />`,
    `<meta data-route-page property="og:type" content="website" />`,
    `<meta data-route-page property="og:site_name" content="${escapeHtml(projectName)}" />`
  ]

  if (jsonLd) {
    // "<" escaped so no name can close the script element.
    const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': [{ '@id': url, ...jsonLd }] })

    tags.push(`<script data-route-page type="application/ld+json">${json.replace(/</g, '\\u003c')}</script>`)
  }

  return entryHtml.replace(PLACEHOLDER, tags.join('\n    '))
}

function writePage(route, head) {
  const file = `${DIST}${route || 'index'}.html`

  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, pageHtml({ ...head, route }))
}

async function get(path, params) {
  const query = new URLSearchParams([['project_token', TOKEN], ...params])

  for (let attempt = 1; ; attempt++) {
    const response = await fetch(`${BASE}${path}?${query}`)

    if (response.ok) return { data: await response.json(), headers: response.headers }
    if (attempt === 3) throw new Error(`${response.status} ${path}`)
    await new Promise((resolve) => setTimeout(resolve, 2000 * attempt))
  }
}

// Every record of an index request under the root, a few pages side by side.
async function allUnderRoot(path) {
  const params = [
    ['taxon_name_id[]', ROOT_TAXON_NAME_ID],
    ['descendants', 'true'],
    ['per', PER]
  ]
  const first = await get(path, [...params, ['page', 1]])
  const pages = Number(first.headers.get('pagination-total-pages')) || 1
  const all = [...first.data]
  let next = 2

  await Promise.all(
    Array.from({ length: PARALLEL }, async () => {
      while (next <= pages) all.push(...(await get(path, [...params, ['page', next++]])).data)
    })
  )

  return all
}

const [otus, names] = await Promise.all([allUnderRoot('/otus'), allUnderRoot('/taxon_names')])
const nameById = new Map(names.map((name) => [name.id, name]))
const fullName = (name) => [name.cached, name.cached_author_year].filter(Boolean).join(' ')

// The name's ancestors within the root, from the root down to its parent.
function ancestorsOf(name) {
  const out = []

  for (let parent = nameById.get(name.parent_id); parent; parent = nameById.get(parent.parent_id)) {
    out.unshift({ name: parent.cached, rankString: parent.rank_string })
  }

  return out
}

// Valid name id -> its synonyms' full names, for schema.org alternateName.
const synonymsOf = new Map()

for (const name of names) {
  if (name.cached_valid_taxon_name_id && name.cached_valid_taxon_name_id !== name.id) {
    const list = synonymsOf.get(name.cached_valid_taxon_name_id) || []

    list.push(fullName(name))
    synonymsOf.set(name.cached_valid_taxon_name_id, list)
  }
}

// Same shape as the framework's runtime Taxon (useSchemaOrg defineTaxon).
function taxonJsonLd(name) {
  const parent = nameById.get(name.parent_id)
  const synonyms = synonymsOf.get(name.id) || []

  return {
    '@type': 'Taxon',
    'http://purl.org/dc/terms/conformsTo': { '@id': 'https://bioschemas.org/profiles/Taxon/1.0-RELEASE' },
    additionalType: ['dwc:Taxon', 'http://rs.tdwg.org/ontology/voc/TaxonConcept#TaxonConcept'],
    name: fullName(name),
    ...(synonyms.length ? { alternateName: synonyms } : {}),
    scientificName: {
      '@type': 'TaxonName',
      name: fullName(name),
      ...(name.cached_author_year ? { author: name.cached_author_year } : {}),
      taxonRank: rankName(name.rank_string).toLowerCase()
    },
    ...(parent
      ? {
          parentTaxon: {
            '@type': 'Taxon',
            name: fullName(parent),
            taxonRank: rankName(parent.rank_string).toLowerCase()
          }
        }
      : {})
  }
}

function otuHead(otu) {
  const name = nameById.get(otu.taxon_name_id)

  if (!name) return { title: projectName, description: siteDescription }

  const valid = nameById.get(name.cached_valid_taxon_name_id)

  return {
    title: taxonTitle(fullName(name), projectName),
    jsonLd: taxonJsonLd(name),
    description: taxonDescription(
      {
        fullName: fullName(name),
        rankString: name.rank_string,
        isValid: name.cached_is_valid !== false,
        validFullName: valid ? fullName(valid) : undefined,
        ancestors: ancestorsOf(name)
      },
      projectName
    )
  }
}

const siteHead = { title: projectName, description: siteDescription }

writePage('', siteHead)
copyFileSync(`${DIST}index.html`, `${DIST}404.html`)
Object.entries(FIXED_ROUTES).forEach(([route, label]) =>
  writePage(route, { title: `${label} | ${projectName}`, description: siteDescription })
)

const seen = new Set()
const otuRoutes = []

for (const otu of otus.sort((a, b) => a.id - b.id)) {
  if (seen.has(otu.id)) continue
  seen.add(otu.id)

  const route = `otus/${otu.id}/overview`

  writePage(route, otuHead(otu))
  otuRoutes.push(route)
}

const urls = ['', ...Object.keys(FIXED_ROUTES), ...otuRoutes]

writeFileSync(
  `${DIST}sitemap.xml`,
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((route) => `  <url><loc>${siteUrl}${route}</loc></url>`).join('\n') +
    '\n</urlset>\n'
)

console.log(
  `Wrote 404.html, ${Object.keys(FIXED_ROUTES).length} fixed pages, ${otuRoutes.length} OTU pages ` +
    `and sitemap.xml (${urls.length} addresses under ${siteUrl}).`
)
