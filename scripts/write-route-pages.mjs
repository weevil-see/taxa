// Run after `npm run build` (the deploy workflow does) when hash_mode is off.
//
// GitHub Pages has no server logic: a visitor or search engine opening
// /otus/723601/overview asks for a file of that name. This writes, into dist/:
// - a copy of the app's entry page (index.html, about 2 KB) for every page
//   search engines should find: the fixed pages and every OTU's overview under
//   ROOT_TAXON_NAME_ID, as <route>.html (GitHub Pages serves /a/b from
//   a/b.html), so they answer normally (HTTP 200);
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

// Curculionoidea: the OTUs whose pages are listed (not host plants and other
// association partners, which have pages too but aren't this catalog's
// subject). Same root as the home page's statistics.
const ROOT_TAXON_NAME_ID = 809411

const FIXED_ROUTES = ['about', 'news', 'keys', 'bibliography/search', 'bibliography/recent']

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

const DIST = root('dist/')
const entryPage = `${DIST}index.html`

function writePage(route) {
  const file = `${DIST}${route}.html`

  mkdirSync(dirname(file), { recursive: true })
  copyFileSync(entryPage, file)
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

// Every OTU under the root, all pages, a few side by side.
async function otuIds() {
  const params = [
    ['taxon_name_id[]', ROOT_TAXON_NAME_ID],
    ['descendants', 'true'],
    ['per', PER]
  ]
  const first = await get('/otus', [...params, ['page', 1]])
  const pages = Number(first.headers.get('pagination-total-pages')) || 1
  const ids = first.data.map((otu) => otu.id)
  let next = 2

  await Promise.all(
    Array.from({ length: PARALLEL }, async () => {
      while (next <= pages) {
        const { data } = await get('/otus', [...params, ['page', next++]])

        ids.push(...data.map((otu) => otu.id))
      }
    })
  )

  return [...new Set(ids)].sort((a, b) => a - b)
}

copyFileSync(entryPage, `${DIST}404.html`)
FIXED_ROUTES.forEach(writePage)

const ids = await otuIds()
const otuRoutes = ids.map((id) => `otus/${id}/overview`)

otuRoutes.forEach(writePage)

const urls = ['', ...FIXED_ROUTES, ...otuRoutes]

writeFileSync(
  `${DIST}sitemap.xml`,
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((route) => `  <url><loc>${siteUrl}${route}</loc></url>`).join('\n') +
    '\n</urlset>\n'
)

console.log(
  `Wrote 404.html, ${FIXED_ROUTES.length} fixed pages, ${otuRoutes.length} OTU pages ` +
    `and sitemap.xml (${urls.length} addresses under ${siteUrl}).`
)
