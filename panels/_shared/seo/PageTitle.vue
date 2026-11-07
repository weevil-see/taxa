<!--
  The title and the citation tags of every page, the same ones the page files
  of scripts/write-route-pages.mjs carry.

  Citation (citation.js, from project.yml): Google Scholar citation_* tags
  and DC.bibliographicCitation, for reference managers like Zotero, which
  read the live page. What is cited: the taxon name, the page label, or the
  site name; at the page's current address.

  Title, one title template for every page (pageTitles.js):
  - a taxon page: "<name> | <site>" (taxonPageTitle, from TaxonHead.vue), the
    site name while the taxon loads;
  - a fixed page: "<label> | <site>" (FIXED_PAGES);
  - anything else: the site name.

  Needed because the framework's taxon page sets its title ("<site> -
  <name>") outside its component's lifecycle, so that title outlives the
  page: going back to the home page, or on to another taxon, used to show the
  last taxon's title. Only App.vue (the site name) and the taxon page set
  titles.

  Placed on every page by the project's layout.js; renders nothing itself.
-->
<template>
  <span hidden />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import { taxonPageName, taxonPageTitle } from './pageTitle.js'
import { FIXED_PAGES, fixedPageTitle } from './pageTitles.js'
import { citationTags } from './citation.js'

const {
  project_name: projectName,
  project_authors,
  project_citation,
  project_author_details,
  site_url,
  project_url
} = __APP_ENV__
const siteUrl = String(site_url || project_url || '').replace(/\/?$/, '/')
const route = useRoute()

const title = computed(() =>
  route.path.startsWith('/otus/')
    ? taxonPageTitle.value || projectName
    : fixedPageTitle(route.path, projectName) || projectName
)

const citedTitle = computed(() =>
  route.path.startsWith('/otus/')
    ? taxonPageName.value
    : FIXED_PAGES[route.path.replace(/^\/+|\/+$/g, '')] || projectName
)

useHead(
  computed(() => ({
    titleTemplate: () => title.value,
    meta: citedTitle.value
      ? citationTags(
          { title: citedTitle.value, url: `${siteUrl}${route.path.replace(/^\//, '')}` },
          { project_authors, project_citation, project_author_details }
          // A key per tag: the head manager would otherwise keep only one of
          // the repeated citation_author tags.
        ).map((tag, i) => ({ ...tag, key: `citation-${i}` }))
      : []
  }))
)
</script>
