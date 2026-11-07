<!--
  Search-engine and link-preview tags of a taxon page: description, canonical
  address and Open Graph tags, and the name-first title (applied by
  PageTitle.vue: the framework's taxon page sets its own title, which
  outlives the page). Title and description are the ones
  scripts/write-route-pages.mjs writes into the page's static file
  (pageTitles.js, taxonDescription.js), so a page says the same with and
  without JavaScript.

  Placed in the taxon page header by the project's layout.js; renders
  nothing itself. One request, the name's ancestors for its classification:
  sent when the browser is idle, so it never competes with the page's own
  requests, and kept per name for the visit.
-->
<template>
  <span hidden />
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useHead } from '@unhead/vue'
import { makeAPIRequest } from '@/utils/request'
import { ancestorsOf, taxonDescription } from './taxonDescription.js'
import { pageTitle } from './pageTitles.js'
import { taxonPageName, taxonPageTitle } from './pageTitle.js'

const props = defineProps({
  otuId: { type: [Number, String], default: null },
  taxon: { type: Object, default: null }
})

const { project_name: projectName, site_url, project_url } = __APP_ENV__
const siteUrl = String(site_url || project_url || '').replace(/\/?$/, '/')

const ancestorCache = new Map() // taxonNameId -> Promise<ancestors>

function whenIdle() {
  return new Promise((resolve) =>
    typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback(resolve, { timeout: 3000 })
      : setTimeout(resolve, 1000)
  )
}

// From the root down to the parent. The API lists them by id, so they are
// ordered by following parent ids (ancestorsOf).
function loadAncestors(id) {
  if (!ancestorCache.has(id)) {
    const promise = whenIdle()
      .then(() =>
        makeAPIRequest.get('/taxon_names', {
          params: { 'taxon_name_id[]': id, ancestors: true, per: 100 }
        })
      )
      .then(({ data }) => {
        const byId = new Map(data.map((name) => [name.id, name]))

        return ancestorsOf(byId.get(id) || { id, parent_id: null }, byId)
      })

    promise.catch(() => ancestorCache.delete(id))
    ancestorCache.set(id, promise)
  }

  return ancestorCache.get(id)
}

const ancestors = ref([])

watch(
  () => props.taxon?.id,
  async (id) => {
    ancestors.value = []
    if (!id) return

    try {
      const list = await loadAncestors(id)

      if (props.taxon?.id === id) ancestors.value = list
    } catch {}
  },
  { immediate: true }
)

const description = computed(() =>
  props.taxon?.full_name
    ? taxonDescription(
        {
          fullName: props.taxon.full_name,
          rankString: props.taxon.rank_string,
          isValid: props.taxon.is_valid !== false,
          validFullName: props.taxon.valid_name?.valid_full_name,
          ancestors: ancestors.value
        },
        projectName
      )
    : null
)

const title = computed(() =>
  props.taxon?.full_name ? pageTitle(props.taxon.full_name, projectName) : null
)

watch(title, (value) => (taxonPageTitle.value = value), { immediate: true })
watch(() => props.taxon?.full_name, (name) => (taxonPageName.value = name || null), { immediate: true })
onBeforeUnmount(() => {
  taxonPageTitle.value = null
  taxonPageName.value = null
})

const url = computed(() => (props.otuId ? `${siteUrl}otus/${props.otuId}/overview` : null))

useHead(
  computed(() =>
    description.value
      ? {
          meta: [
            { name: 'description', content: description.value },
            { property: 'og:title', content: title.value },
            { property: 'og:description', content: description.value },
            { property: 'og:url', content: url.value },
            { property: 'og:type', content: 'website' },
            { property: 'og:site_name', content: projectName }
          ],
          link: url.value ? [{ rel: 'canonical', href: url.value }] : []
        }
      : {}
  )
)
</script>
