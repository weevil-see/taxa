// The description of a taxon page for search engines and link previews.
// One formula for both places it is used, so a page says the same with and
// without JavaScript:
// - scripts/write-route-pages.mjs puts it in each page's static file;
// - TaxonHead.vue sets it once the app runs.
// No Vue and no '@/' imports, so node can use it.

const FAMILY_GROUP_RANKS = ['Subtribe', 'Tribe', 'Subfamily', 'Family']

// The catalog's root (Curculionoidea). Ancestors are taken from here down on
// both sides (the page files only know names under it; the API would also
// return Coleoptera and above), so both describe a taxon the same way.
export const ROOT_TAXON_NAME_ID = 809411

/**
 * The ancestors of a name, from ROOT_TAXON_NAME_ID down to its parent, by
 * following parent ids through `byId` (Map<id, { cached, rank_string,
 * parent_id }>). Not the order an API list comes in, which is by id.
 * @returns {Array<{ name: string, rankString: string }>}
 */
export function ancestorsOf(name, byId) {
  const out = []
  let current = name

  while (current && current.id !== ROOT_TAXON_NAME_ID) {
    const parent = byId.get(current.parent_id)

    if (!parent) break
    out.unshift({ name: parent.cached, rankString: parent.rank_string })
    current = parent
  }

  return out
}

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
