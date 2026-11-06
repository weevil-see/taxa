// Old hash-mode addresses keep working after hash_mode is turned off:
// <base>#/otus/723601/overview becomes <base>otus/723601/overview before the
// router reads the address (this module is imported by the project's
// layout.js, which loads before the router is created). Links of this form
// are cited in papers, so they must not break.
//
// Does nothing while hash_mode is on, or on the server.

const { hash_mode } = __APP_ENV__

if (!hash_mode && typeof window !== 'undefined' && window.location.hash.startsWith('#/')) {
  const path = window.location.hash.slice(2)

  window.history.replaceState(window.history.state, '', `${import.meta.env.BASE_URL}${path}`)
}
