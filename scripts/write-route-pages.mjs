// Run after `npm run build` (the deploy workflow does) when hash_mode is off.
//
// GitHub Pages has no server logic: a visitor or search engine opening
// /otus/723601/overview asks for a file of that name. This writes, into dist/:
// - 404.html, a copy of the app's entry page, for every address without its
//   own file (other tabs, news items, OTUs added since this ran): visitors
//   see the right page, only the HTTP status is 404, so search engines skip
//   those until the next deploy. Written first and without any request, so
//   deep links work even if TaxonWorks can't be reached;
// - a copy of the entry page for every page search engines should find: the
//   fixed pages and every OTU's overview under ROOT_TAXON_NAME_ID, as
//   <route>.html (GitHub Pages serves /a/b from a/b.html), so they answer
//   normally (HTTP 200). Each carries its own title, description, canonical
//   address and link-preview (Open Graph) tags, and a taxon page its
//   schema.org Taxon data (JSON-LD, the shape the framework adds at runtime),
//   for crawlers that don't run JavaScript, and how to cite it (Google
//   Scholar citation_* tags, DC.bibliographicCitation; from project.yml).
//   Titles, descriptions and citations come from panels/_shared/seo/
//   (pageTitles.js, taxonDescription.js, citation.js), as on the live page. The tags are marked data-route-page; the app drops them when it
//   starts (staticHead.js) and sets its own;
// - sitemap.xml, listing the pages written.
// If TaxonWorks fails, only 404.html is written and the deploy goes on.
// Safe to run twice on one build: the head block is replaced, not stacked.
//
//   node scripts/write-route-pages.mjs

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ROOT_TAXON_NAME_ID,
  ancestorsOf,
  rankName,
  taxonDescription
} from '../panels/_shared/seo/taxonDescription.js'
import { FIXED_PAGES, pageTitle } from '../panels/_shared/seo/pageTitles.js'
import { citationTags } from '../panels/_shared/seo/citation.js'

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
const quoted = (key) => project.match(new RegExp(`^\\s*${key}:\\s*['"]?(.+?)['"]?\\s*$`, 'm'))?.[1]
const projectName = quoted('project_name')
// A robots tag from config (the fork test site sets "noindex, nofollow"),
// in the files too: RobotsMeta.vue only sets it once the app runs.
const robots = quoted('robots')
const citationSource = { project_authors: quoted('project_authors'), project_citation: quoted('project_citation') }
const siteDescription =
  config('metadata.yml').match(/name:\s*description\s*\n\s*content:\s*['"]?(.+?)['"]?\s*$/m)?.[1] ?? ''

const DIST = root('dist/')
const PLACEHOLDER = '<!--head-tags-->'
const BLOCK = /<!--route-page-->[\s\S]*?<!--\/route-page-->/

// The built entry page as the build left it: a previous run's head block
// (between the route-page markers) is put back to the placeholder.
const entryHtml = readFileSync(`${DIST}index.html`, 'utf8').replace(BLOCK, PLACEHOLDER)

if (!entryHtml.includes(PLACEHOLDER)) throw new Error(`no ${PLACEHOLDER} in dist/index.html`)

const escapeHtml = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// The entry page with a page's own head tags in place of the placeholder.
// `route` null: no address of its own (404.html), so no canonical, og:url or
// citation. `cited`: what the citation names (taxon name, page label).
function pageHtml({ title, description, route, jsonLd, cited }) {
  const url = route === null ? null : `${siteUrl}${route}`
  const tags = [
    `<title data-route-page>${escapeHtml(title)}</title>`,
    ...(robots ? [`<meta data-route-page name="robots" content="${escapeHtml(robots)}" />`] : []),
    `<meta data-route-page name="description" content="${escapeHtml(description)}" />`,
    ...(url ? [`<link data-route-page rel="canonical" href="${escapeHtml(url)}" />`] : []),
    `<meta data-route-page property="og:title" content="${escapeHtml(title)}" />`,
    `<meta data-route-page property="og:description" content="${escapeHtml(description)}" />`,
    ...(url ? [`<meta data-route-page property="og:url" content="${escapeHtml(url)}" />`] : []),
    `<meta data-route-page property="og:type" content="website" />`,
    `<meta data-route-page property="og:site_name" content="${escapeHtml(projectName)}" />`,
    ...(url
      ? citationTags({ title: cited || projectName, url }, citationSource).map(
          ({ name, content }) => `<meta data-route-page name="${name}" content="${escapeHtml(content)}" />`
        )
      : [])
  ]

  if (jsonLd) {
    // "<" escaped so no name can close the script element.
    const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': [{ '@id': url, ...jsonLd }] })

    tags.push(`<script data-route-page type="application/ld+json">${json.replace(/</g, '\\u003c')}</script>`)
  }

  return entryHtml.replace(PLACEHOLDER, `<!--route-page-->\n    ${tags.join('\n    ')}\n    <!--/route-page-->`)
}

function writeFile(file, html) {
  mkdirSync(dirname(`${DIST}${file}`), { recursive: true })
  writeFileSync(`${DIST}${file}`, html)
}

const writePage = (route, head) => writeFile(`${route || 'index'}.html`, pageHtml({ ...head, route }))

// 1. The fallback, before anything that needs TaxonWorks.
writeFile('404.html', pageHtml({ title: projectName, description: siteDescription, route: null }))

async function get(path, params) {
  const query = new URLSearchParams([['project_token', TOKEN], ...params])

  for (let attempt = 1; ; attempt++) {
    const response = await fetch(`${BASE}${path}?${query}`)

    if (response.ok) return { data: await response.json(), headers: response.headers }
    if (attempt === 3) throw new Error(`${response.status} ${path}`)
    await new Promise((resolve) => setTimeout(resolve, 2000 * attempt))
  }
}

// Every record of an index request, a few pages side by side.
async function getAll(path, params) {
  const first = await get(path, [...params, ['per', PER], ['page', 1]])
  const pages = Number(first.headers.get('pagination-total-pages')) || 1
  const all = [...first.data]
  let next = 2

  await Promise.all(
    Array.from({ length: PARALLEL }, async () => {
      while (next <= pages) all.push(...(await get(path, [...params, ['per', PER], ['page', next++]])).data)
    })
  )

  return all
}

const fullName = (name) => [name.cached, name.cached_author_year].filter(Boolean).join(' ')

async function writeRoutePages() {
  const underRoot = [['taxon_name_id[]', ROOT_TAXON_NAME_ID], ['descendants', 'true']]
  const [otus, names] = await Promise.all([getAll('/otus', underRoot), getAll('/taxon_names', underRoot)])
  const nameById = new Map(names.map((name) => [name.id, name]))

  // Valid names outside the root (a synonym moved elsewhere): looked up, so
  // the page still says "a synonym of …", as the live page does.
  const missingValid = [
    ...new Set(names.map((n) => n.cached_valid_taxon_name_id).filter((id) => id && !nameById.has(id)))
  ]

  for (let i = 0; i < missingValid.length; i += 100) {
    const batch = missingValid.slice(i, i + 100)

    ;(await getAll('/taxon_names', batch.map((id) => ['taxon_name_id[]', id]))).forEach((name) =>
      nameById.set(name.id, name)
    )
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
      title: pageTitle(fullName(name), projectName),
      cited: fullName(name),
      jsonLd: taxonJsonLd(name),
      description: taxonDescription(
        {
          fullName: fullName(name),
          rankString: name.rank_string,
          isValid: name.cached_is_valid !== false,
          validFullName: valid ? fullName(valid) : undefined,
          ancestors: ancestorsOf(name, nameById)
        },
        projectName
      )
    }
  }

  writePage('', { title: projectName, description: siteDescription })
  Object.entries(FIXED_PAGES).forEach(([route, label]) =>
    writePage(route, { title: pageTitle(label, projectName), description: siteDescription, cited: label })
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

  const urls = ['', ...Object.keys(FIXED_PAGES), ...otuRoutes]

  writeFile(
    'sitemap.xml',
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls.map((route) => `  <url><loc>${siteUrl}${route}</loc></url>`).join('\n') +
      '\n</urlset>\n'
  )

  console.log(
    `Wrote 404.html, ${Object.keys(FIXED_PAGES).length} fixed pages, ${otuRoutes.length} OTU pages ` +
      `and sitemap.xml (${urls.length} addresses under ${siteUrl}).`
  )
}

// 2. Everything that needs TaxonWorks. A failure leaves the site deployable
// (the app and 404.html work); it only lacks page files and sitemap this time.
try {
  await writeRoutePages()
} catch (error) {
  console.log(`::warning::Route pages not written (${error.message}); 404.html only, pages still work.`)
}
