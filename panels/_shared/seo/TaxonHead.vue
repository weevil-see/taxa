<!--
  Search-engine and link-preview tags of a taxon page: title (name first),
  description, canonical address and Open Graph tags. Title and description
  are the ones scripts/write-route-pages.mjs writes into the page's static
  file (taxonDescription.js), so a page says the same with and without
  JavaScript. The title itself is applied by PageTitle.vue (the framework's
  taxon page sets its own, which outlives the page).

  Placed in the taxon page header by the project's layout.js; renders
  nothing itself. One request: the name's ancestors, for its classification.
-->
<template>
  <span hidden />
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useHead } from '@unhead/vue'
import { makeAPIRequest } from '@/utils/request'
import { taxonDescription, taxonTitle } from './taxonDescription.js'
import { taxonPageTitle } from './pageTitle.js'

const props = defineProps({
  otuId: { type: [Number, String], default: null },
  taxon: { type: Object, default: null }
})

const { project_name: projectName, site_url, project_url } = __APP_ENV__
const siteUrl = String(site_url || project_url || '').replace(/\/?$/, '/')

const ancestors = ref([])

watch(
  () => props.taxon?.id,
  async (id) => {
    ancestors.value = []
    if (!id) return

    try {
      const { data } = await makeAPIRequest.get('/taxon_names', {
        params: { 'taxon_name_id[]': id, ancestors: true, per: 100 }
      })

      if (props.taxon?.id !== id) return
      ancestors.value = data
        .filter((name) => name.id !== id)
        .map((name) => ({ name: name.cached, rankString: name.rank_string }))
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
  props.taxon?.full_name ? taxonTitle(props.taxon.full_name, projectName) : null
)

watch(title, (value) => (taxonPageTitle.value = value), { immediate: true })
onBeforeUnmount(() => (taxonPageTitle.value = null))

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
