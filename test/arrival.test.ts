import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EVENT_LABELS } from '../worker/stats-page'
import { isPageEvent, PAGE_EVENTS, refEvent, WORKER_EVENTS } from '../src/lib/count-events'

describe('refEvent', () => {
  it('maps each listed tag to its own event', () => {
    expect(refEvent('walk-in')).toBe('ref_walk_in')
    expect(refEvent('status')).toBe('ref_status')
    expect(refEvent('tiktok')).toBe('ref_tiktok')
    expect(refEvent('facebook')).toBe('ref_facebook')
    expect(refEvent('instagram')).toBe('ref_instagram')
    expect(refEvent('referral')).toBe('ref_referral')
    expect(refEvent('flyer')).toBe('ref_flyer')
  })

  it('ignores case and surrounding spaces', () => {
    expect(refEvent('  TikTok ')).toBe('ref_tiktok')
  })

  it('counts any other text as other, and no tag as nothing', () => {
    expect(refEvent('garbage')).toBe('ref_other')
    expect(refEvent('<script>')).toBe('ref_other')
    expect(refEvent('walk_in')).toBe('ref_other')
    expect(refEvent('')).toBe('ref_other')
    expect(refEvent(null)).toBeNull()
  })

  it('only ever returns an event the Worker accepts', () => {
    for (const tag of ['walk-in', 'x', '__proto__', 'ref_status'])
      expect(isPageEvent(refEvent(tag))).toBe(true)
  })
})

describe('labels', () => {
  it('cover every event, and the Worker rejects non-page events', () => {
    for (const e of [...PAGE_EVENTS, ...WORKER_EVENTS]) expect(EVENT_LABELS[e]).toBeTruthy()
    expect(isPageEvent('ref_walk-in')).toBe(false)
    expect(isPageEvent('chat_started')).toBe(false)
  })
})

describe('countArrival', () => {
  const sent: string[] = []
  const store = new Map<string, string>()
  const saved = { window: (globalThis as { window?: unknown }).window, fetch: globalThis.fetch }

  beforeEach(() => {
    sent.length = 0
    store.clear()
    Object.assign(globalThis, {
      window: {
        location: { search: '' },
        sessionStorage: {
          getItem: (k: string) => store.get(k) ?? null,
          setItem: (k: string, v: string) => void store.set(k, v),
        },
      },
      fetch: async (_: string, o: RequestInit) => {
        sent.push(String(o.body))
        return new Response(null, { status: 204 })
      },
    })
  })
  afterEach(() => Object.assign(globalThis, saved))

  async function arrive(search: string) {
    // A fresh module each time stands for a fresh page load.
    const mod = (vi.resetModules(), await import('../src/lib/counts'))
    mod.countArrival(search)
  }

  it('counts a tag once per tab session, and again in a new tab', async () => {
    await arrive('?ref=walk-in')
    await arrive('?ref=walk-in')
    expect(sent).toEqual(['{"event":"ref_walk_in"}'])
    store.clear()
    await arrive('?ref=walk-in')
    expect(sent).toHaveLength(2)
  })

  it('never sends an unknown tag', async () => {
    await arrive('?ref=garbage')
    expect(sent).toEqual(['{"event":"ref_other"}'])
  })

  it('counts a personalised link without the name', async () => {
    await arrive('?for=Mama%27s+Kitchen&ref=walk-in')
    expect(sent.sort()).toEqual(['{"event":"link_personalised"}', '{"event":"ref_walk_in"}'])
    expect(sent.join()).not.toContain('Mama')
  })

  it('counts nothing without ?ref= or a valid ?for=', async () => {
    await arrive('')
    await arrive('?for=%3Cimg%3E')
    expect(sent).toEqual([])
  })
})
