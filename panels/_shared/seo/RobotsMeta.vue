<!--
  <meta name="robots" content="..."> from the `robots` setting in config
  (e.g. `robots: "noindex, nofollow"` in config/project.yml), so a copy of the
  site, like a test fork, stays out of search engines. No setting: no tag.
  Placed on every page by the project's layout.js; renders nothing itself.
  (A robots.txt can't do this for a project site under a sub-path: search
  engines only read robots.txt at the domain's root.)
-->
<template>
  <span hidden />
</template>

<script setup>
import { useHead } from '@unhead/vue'

const { robots } = __APP_ENV__

if (robots) {
  useHead({ meta: [{ name: 'robots', content: robots }] })
}
</script>
