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
