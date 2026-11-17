import { describe, expect, it } from 'vitest'
import { MAX_BUSINESS_NAME, parseBusinessName } from '../src/lib/business-name'

describe('parseBusinessName', () => {
  it('accepts a plain name', () => {
    expect(parseBusinessName('Bakehouse')).toBe('Bakehouse')
  })

  it('accepts apostrophes, ampersands and common punctuation', () => {
    expect(parseBusinessName("Mama's Kitchen")).toBe("Mama's Kitchen")
    expect(parseBusinessName('Mama’s Kitchen')).toBe('Mama’s Kitchen')
    expect(parseBusinessName('Sage & Co. (Harare), Ltd - 2020!')).toBe('Sage & Co. (Harare), Ltd - 2020!')
  })

  it('accepts accented letters and other scripts', () => {
    expect(parseBusinessName('Café Zoë')).toBe('Café Zoë')
    expect(parseBusinessName('Ñandú Süß')).toBe('Ñandú Süß')
  })

  it('decodes the way a link does: + and %20 are spaces, %27 an apostrophe', () => {
    expect(parseBusinessName(new URLSearchParams('for=Mama%27s+Kitchen').get('for'))).toBe("Mama's Kitchen")
    expect(parseBusinessName(new URLSearchParams('for=Mama%20Kitchen').get('for'))).toBe('Mama Kitchen')
  })

  it('trims and collapses spaces', () => {
    expect(parseBusinessName('  Mama   Kitchen \t ')).toBe('Mama Kitchen')
  })

  it('accepts the longest name and rejects one character more', () => {
    expect(parseBusinessName('a'.repeat(MAX_BUSINESS_NAME))).not.toBeNull()
    expect(parseBusinessName('a'.repeat(MAX_BUSINESS_NAME + 1))).toBeNull()
  })

  it('rejects HTML and script', () => {
    expect(parseBusinessName('<script>alert(1)</script>')).toBeNull()
    expect(parseBusinessName('<img src=x onerror=alert(1)>')).toBeNull()
    expect(parseBusinessName('Mama <b>Kitchen</b>')).toBeNull()
  })

  it('rejects empty and missing values', () => {
    expect(parseBusinessName('')).toBeNull()
    expect(parseBusinessName('   ')).toBeNull()
    expect(parseBusinessName(null)).toBeNull()
    expect(parseBusinessName(undefined)).toBeNull()
  })

  it('rejects names with no letter or digit', () => {
    expect(parseBusinessName("'&-.,!()")).toBeNull()
    expect(parseBusinessName('...')).toBeNull()
  })

  it('rejects control characters, quotes, slashes and other symbols', () => {
    expect(parseBusinessName('Mama\u0000Kitchen')).toBeNull()
    expect(parseBusinessName('Mama\u0007Kitchen')).toBeNull()
    expect(parseBusinessName('Mama\u202eKitchen')).toBeNull()
    expect(parseBusinessName('Mama "Kitchen"')).toBeNull()
    expect(parseBusinessName('Mama/Kitchen')).toBeNull()
    expect(parseBusinessName('javascript:alert(1)')).toBeNull()
    expect(parseBusinessName('Mama{{x}}')).toBeNull()
  })
})
