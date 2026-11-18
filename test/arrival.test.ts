import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EVENT_LABELS } from '../worker/stats-page'
import { byEvent, BY_TAGS, isPageEvent, PAGE_EVENTS, refEvent, WORKER_EVENTS } from '../src/lib/count-events'

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

  it('counts ?by= as its own event, once per tab session, alongside ?ref=', async () => {
    await arrive('?ref=walk-in&by=team-b')
    await arrive('?ref=walk-in&by=team-b')
    expect(sent.sort()).toEqual(['{"event":"by_team_b"}', '{"event":"ref_walk_in"}'])
    store.clear()
    sent.length = 0
    await arrive('?by=team-c&for=Mama')
    expect(sent.sort()).toEqual(['{"event":"by_team_c"}', '{"event":"link_personalised"}'])
  })

  it('never sends an unknown ?by= value', async () => {
    await arrive('?by=Evans%20M')
    expect(sent).toEqual(['{"event":"by_other"}'])
    expect(sent.join()).not.toContain('Evans')
  })

  it('counts nothing without ?ref= or a valid ?for=', async () => {
    await arrive('')
    await arrive('?for=%3Cimg%3E')
    expect(sent).toEqual([])
  })
})

describe('byEvent', () => {
  it('maps each listed person to its own event, ignoring case and spaces', () => {
    for (const tag of BY_TAGS) expect(byEvent(` ${tag.toUpperCase()} `)).toBe(`by_${tag.replace('-', '_')}`)
    expect(byEvent('team-a')).toBe('by_team_a')
  })

  it('counts any other text as other, and no value as nothing', () => {
    for (const raw of ['team-d', 'team_a', '', '<script>', '__proto__']) expect(byEvent(raw)).toBe('by_other')
    expect(byEvent(null)).toBeNull()
    expect(byEvent(undefined)).toBeNull()
  })

  it('only gives events the Worker accepts', () => {
    for (const raw of ['team-a', 'x', '__proto__']) expect(isPageEvent(byEvent(raw))).toBe(true)
    expect(isPageEvent('by_team-a')).toBe(false)
  })
})
