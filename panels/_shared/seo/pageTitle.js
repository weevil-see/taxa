// The taxon page on screen: its title ("<name> | <site>") and name, set by
// TaxonHead.vue while it is mounted, read by PageTitle.vue.
import { ref } from 'vue'

export const taxonPageTitle = ref(null)
export const taxonPageName = ref(null)
