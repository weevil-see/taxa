import { test } from 'node:test'
import assert from 'node:assert/strict'
import { taxonDescription } from './taxonDescription.js'

const ancestors = [
  { name: 'Curculionoidea', rankString: 'NomenclaturalRank::Iczn::FamilyGroup::Superfamily' },
  { name: 'Curculionidae', rankString: 'NomenclaturalRank::Iczn::FamilyGroup::Family' },
  { name: 'Entiminae', rankString: 'NomenclaturalRank::Iczn::FamilyGroup::Subfamily' },
  { name: 'Otiorhynchini', rankString: 'NomenclaturalRank::Iczn::FamilyGroup::Tribe' },
  { name: 'Otiorhynchus', rankString: 'NomenclaturalRank::Iczn::GenusGroup::Genus' }
]

test('a valid species names its nearest family-group taxa', () => {
  assert.equal(
    taxonDescription(
      { fullName: 'Otiorhynchus x (L., 1758)', rankString: 'NomenclaturalRank::Iczn::SpeciesGroup::Species', isValid: true, ancestors },
      'Site'
    ),
    'Otiorhynchus x (L., 1758), a species in Otiorhynchini, Entiminae, Curculionidae. Classification, distribution, specimens, images and literature in Site.'
  )
})

test('a synonym names its valid name', () => {
  assert.match(
    taxonDescription({ fullName: 'Aus bus', rankString: '', isValid: false, validFullName: 'Aus cus (L.)', ancestors }, 'Site'),
    /^Aus bus, a synonym of Aus cus \(L\.\)\. /
  )
})

test('a family-group taxon without family-group ancestors uses its parent', () => {
  assert.match(
    taxonDescription(
      { fullName: 'Curculionidae', rankString: 'NomenclaturalRank::Iczn::FamilyGroup::Family', isValid: true, ancestors: ancestors.slice(0, 1) },
      'Site'
    ),
    /^Curculionidae, a family in Curculionoidea\. /
  )
})

test('ancestors are ordered by parent links, not by id, and stop at the root', async () => {
  const { ancestorsOf, ROOT_TAXON_NAME_ID: ROOT } = await import('./taxonDescription.js')
  // ids deliberately out of depth order, as the API's id-sorted list can be
  const names = [
    { id: 5, cached: 'Coleoptera', rank_string: 'x::Order', parent_id: 1 },
    { id: ROOT, cached: 'Curculionoidea', rank_string: 'x::Superfamily', parent_id: 5 },
    { id: 3, cached: 'Otiorhynchini', rank_string: 'x::Tribe', parent_id: 9 },
    { id: 9, cached: 'Entiminae', rank_string: 'x::Subfamily', parent_id: ROOT },
    { id: 2, cached: 'Otiorhynchus', rank_string: 'x::Genus', parent_id: 3 },
    { id: 7, cached: 'Otiorhynchus x', rank_string: 'x::Species', parent_id: 2 }
  ]
  const byId = new Map(names.map((n) => [n.id, n]))

  assert.deepEqual(
    ancestorsOf(byId.get(7), byId).map((a) => a.name),
    ['Curculionoidea', 'Entiminae', 'Otiorhynchini', 'Otiorhynchus']
  )
  assert.deepEqual(ancestorsOf(byId.get(ROOT), byId), [])
})
