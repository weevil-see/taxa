import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fixedPageTitle, pageTitle } from './pageTitles.js'

test('titles put the page first, the site after', () => {
  assert.equal(pageTitle('Aus bus L.', 'Site'), 'Aus bus L. | Site')
  assert.equal(pageTitle(null, 'Site'), 'Site')
})

test('fixed pages are found by their route path', () => {
  assert.equal(fixedPageTitle('/about', 'Site'), 'About | Site')
  assert.equal(fixedPageTitle('/bibliography/search/', 'Site'), 'Bibliography search | Site')
  assert.equal(fixedPageTitle('/otus/1/overview', 'Site'), null)
})
