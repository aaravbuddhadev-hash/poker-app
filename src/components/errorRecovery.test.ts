import { describe, expect, it } from 'vitest'
import { isStaleDownload } from './ErrorBoundary'

describe('isStaleDownload', () => {
  it("recognizes each browser's message for a screen file that no longer exists", () => {
    expect(isStaleDownload(new TypeError('Failed to fetch dynamically imported module: https://x/assets/GlossaryPage-abc.js'))).toBe(true) // Chrome
    expect(isStaleDownload(new TypeError('Importing a module script failed.'))).toBe(true) // Safari
    expect(isStaleDownload(new TypeError('error loading dynamically imported module: https://x/a.js'))).toBe(true) // Firefox
  })

  it('leaves ordinary errors alone, so they are reported instead of reloading', () => {
    expect(isStaleDownload(new TypeError("Cannot read properties of undefined (reading 'map')"))).toBe(false)
    expect(isStaleDownload(new Error('Failed to fetch'))).toBe(false) // a network call, not a missing screen file
    expect(isStaleDownload('nope')).toBe(false)
  })
})
