// Page titles, shared by scripts/write-route-pages.mjs (the page files) and
// PageTitle.vue (the running app), so a page has the same title with and
// without JavaScript. No Vue and no '@/' imports, so node can use it.

// Fixed pages with their own file and title: route (no leading slash) -> label.
export const FIXED_PAGES = {
  about: 'About',
  news: 'News',
  keys: 'Keys',
  'bibliography/search': 'Bibliography search',
  'bibliography/recent': 'Recently published'
}

// Name (or label) first: search results cut long titles off, and the name is
// what people search for.
export function pageTitle(label, projectName) {
  return label ? `${label} | ${projectName}` : projectName
}

// The title of a fixed page by its route path ("/about"), or null.
export function fixedPageTitle(path, projectName) {
  const label = FIXED_PAGES[String(path).replace(/^\/+|\/+$/g, '')]

  return label ? pageTitle(label, projectName) : null
}
