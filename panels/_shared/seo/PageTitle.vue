<!--
  One title template for every page: on a taxon page its name-first title
  (taxonPageTitle, from TaxonHead.vue), everywhere else the site name.

  Needed because the framework's taxon page sets its title ("<site> -
  <name>") outside its component's lifecycle, so that title outlives the
  page: going back to the home page used to keep the last taxon's title.
  Only App.vue (the site name) and the taxon page set titles.

  Placed on every page by the project's layout.js; renders nothing itself.
-->
<template>
  <span hidden />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import { taxonPageTitle } from './pageTitle.js'

const { project_name: projectName } = __APP_ENV__
const route = useRoute()

const isTaxonPage = computed(() => route.path.startsWith('/otus/'))

useHead(
  computed(() => {
    const title = isTaxonPage.value ? taxonPageTitle.value : projectName

    return title ? { titleTemplate: () => title } : {}
  })
)
</script>
