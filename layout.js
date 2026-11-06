// Project contributions to the framework's layout regions (see the package's
// src/utils/loadLayoutSlots.js and modules/otus/constants/regions.js).
// Imported eagerly at app start. The curator entries render only in curator
// mode, see panels/_shared/curatorMode/readme.md; the news dot is described in
// panels/_shared/newsUnread/readme.md.
import CuratorModeButton from './panels/_shared/curatorMode/CuratorModeButton.vue'
import OtuTaxonWorksButton from './panels/_shared/curatorMode/OtuTaxonWorksButton.vue'
import NewsUnreadDot from './panels/_shared/newsUnread/NewsUnreadDot.vue'
import RobotsMeta from './panels/_shared/seo/RobotsMeta.vue'
// Side effect: old /#/... addresses -> /... once hash_mode is off.
import './panels/_shared/seo/hashRedirect.js'

export default {
  // Renders nothing here: the "Leave curator mode" button moves itself into
  // the top bar.
  // The news dot also renders nothing here: it marks the News link with CSS.
  // RobotsMeta adds a robots meta tag when config sets `robots`.
  'header:after': [CuratorModeButton, NewsUnreadDot, RobotsMeta],

  // Taxon page, next to the JSON and DwC download buttons.
  'taxa_page:header:actions:end': OtuTaxonWorksButton
}
