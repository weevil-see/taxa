// The page files scripts/write-route-pages.mjs writes carry their own title,
// description and link-preview tags (marked data-route-page) for crawlers
// that don't run JavaScript. Once the app runs it manages the head itself
// (App.vue, the taxon page, TaxonHead.vue), so the static tags are removed
// here, before it starts, to leave no duplicates. Imported by layout.js.

if (typeof document !== 'undefined') {
  document.querySelectorAll('[data-route-page]').forEach((element) => element.remove())
}
