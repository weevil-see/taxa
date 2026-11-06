// The description of a taxon page for search engines and link previews.
// One formula for both places it is used, so a page says the same with and
// without JavaScript:
// - scripts/write-route-pages.mjs puts it in each page's static file;
// - TaxonHead.vue sets it once the app runs.
// No Vue and no '@/' imports, so node can use it.

const FAMILY_GROUP_RANKS = ['Subtribe', 'Tribe', 'Subfamily', 'Family']

// "NomenclaturalRank::Iczn::SpeciesGroup::Species" -> "Species"
export function rankName(rankString = '') {
  return String(rankString).split('::').pop() || ''
}

/**
 * @param {object} taxon
 * @param {string} taxon.fullName        name with author, as in the page title
 * @param {string} taxon.rankString      TaxonWorks rank_string
 * @param {boolean} taxon.isValid
 * @param {string} [taxon.validFullName] the valid name, for a synonym
 * @param {Array<{ name: string, rankString: string }>} [taxon.ancestors]
 *   from the root down to the parent
 * @param {string} projectName
 * @returns {string}
 */
export function taxonDescription(
  { fullName, rankString, isValid, validFullName, ancestors = [] },
  projectName
) {
  const suffix = `Classification, distribution, specimens, images and literature in ${projectName}.`

  if (!isValid && validFullName) {
    return `${fullName}, a synonym of ${validFullName}. ${suffix}`
  }

  // Nearest family-group names, e.g. "Otiorhynchini, Entiminae, Curculionidae".
  const groups = [...ancestors]
    .reverse()
    .filter((a) => FAMILY_GROUP_RANKS.includes(rankName(a.rankString)))
    .slice(0, 3)
    .map((a) => a.name)
  const within = groups.length ? groups : ancestors.slice(-1).map((a) => a.name)
  const rank = rankName(rankString).toLowerCase()

  return within.length && rank
    ? `${fullName}, a ${rank} in ${within.join(', ')}. ${suffix}`
    : `${fullName}. ${suffix}`
}
