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

describe('captureBusinessName', () => {
  /** A minimal page: an address, a history, and a tab's sessionStorage. */
  async function inPage(href: string) {
    const store = new Map<string, string>()
    const replaced: string[] = []
    const win = {
      location: new URL(href),
      history: { state: { scrollY: 5 }, replaceState: (_s: unknown, _t: string, url: string) => void replaced.push(url) },
      sessionStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) },
    }
    const saved = globalThis.window
    Object.assign(globalThis, { window: win })
    const { vi } = await import('vitest')
    vi.resetModules()
    const mod = await import('../src/lib/business-name')
    return { mod, store, replaced, restore: () => Object.assign(globalThis, { window: saved }) }
  }

  it('keeps the name in the tab and takes it out of the address, keeping everything else', async () => {
    const page = await inPage('https://lifeline.example/demos/whatsapp-ordering?ref=walk-in&for=Mama%27s+Kitchen#top')
    try {
      page.mod.captureBusinessName()
      expect(page.replaced).toEqual(['/demos/whatsapp-ordering?ref=walk-in#top'])
      expect(page.store.get('lifeline.for')).toBe("Mama's Kitchen")
      expect(page.mod.getBusinessName()).toBe("Mama's Kitchen")
    } finally {
      page.restore()
    }
  })

  it('leaves an address without ?for= alone', async () => {
    const page = await inPage('https://lifeline.example/demos/whatsapp-ordering?ref=status')
    try {
      page.mod.captureBusinessName()
      expect(page.replaced).toEqual([])
    } finally {
      page.restore()
    }
  })

  it('also removes a name that is not accepted, so it is never sent anywhere', async () => {
    const page = await inPage('https://lifeline.example/?for=%3Cscript%3E')
    try {
      page.mod.captureBusinessName()
      expect(page.replaced).toEqual(['/'])
      expect(page.mod.getBusinessName()).toBeNull()
    } finally {
      page.restore()
    }
  })
})

describe('saved order updates', () => {
  const order = { customer: 'Tendai M', ref: 'JR-2418', total: 12.5, time: 'Today 5pm', method: 'collection', area: 'Avondale' } as never

  it('are saved with the sample name, and show the visitor’s name only when displayed', async () => {
    const { BUSINESS } = await import('../src/demos/whatsapp-ordering/data')
    const { personalised, statusMessage } = await import('../src/demos/whatsapp-ordering/message')
    const saved = statusMessage(order, 'Confirmed')
    expect(saved).toContain(BUSINESS)
    expect(saved).not.toContain("Mama's Kitchen")
    expect(personalised(saved, "Mama's Kitchen")).toContain("thanks for ordering from Mama's Kitchen")
    expect(personalised(saved, "Mama's Kitchen")).not.toContain(BUSINESS)
    expect(personalised(saved, BUSINESS)).toBe(saved)
  })
})
