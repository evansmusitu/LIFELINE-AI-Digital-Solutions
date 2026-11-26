/*
 * The four ads: what is said, what is shown, and what is tapped. render.mjs does the recording and encoding.
 * Rules for every line: no price, no city, no real-client claims, nothing about the hosting or code platforms.
 * Captions use **word** for the cyan highlight. Keep captions to about two lines (35 characters or fewer per line is safe).
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export const WHATSAPP = '+263 781 572 008' // SITE.whatsappDisplay in src/config/site.ts

const SAMPLE_TAG = 'Sample business demo'

/* ---------- 1. WhatsApp ordering ---------- */

const whatsappOrdering = {
  id: 'whatsapp-ordering',
  file: '1-whatsapp-ordering',
  tag: SAMPLE_TAG,
  cover: { headline: 'Orders on **WhatsApp**, minus the chaos', at: 11, focus: 30 },
  lines: {
    hook: { kind: 'hook', cap: 'Still taking orders by **voice notes**?', say: 'Still taking orders by WhatsApp voice notes?' },
    browse: { cap: 'Customers **browse** your menu', say: 'Let customers browse your menu on their phone.' },
    add: { cap: 'Tap to **add** what they want', say: 'They tap to add what they want.' },
    review: { cap: 'Delivery or **collection**', say: 'Then choose delivery or collection.' },
    preview: { cap: 'You get a **clear order** message', say: 'Your shop gets a clear order. Nothing missed.' },
    shop: { cap: 'The shop sees it **instantly**', say: 'And sees it straight away, ready to confirm.' },
  },
  async run(r, page) {
    await r.goto('/demos/whatsapp-ordering')
    await r.jump(page.getByRole('tablist').first(), 235)
    await page.waitForTimeout(600)
    r.start()
    r.cue('hook')
    await r.settle(0.2)

    r.cue('browse')
    await page.evaluate(() => scrollBy({ top: 220, behavior: 'smooth' }))
    await r.pause(1.3)
    await page.evaluate(() => scrollBy({ top: -220, behavior: 'smooth' }))
    await r.settle(0.1)

    r.cue('add')
    await r.show(page.getByRole('button', { name: /^Add Butter croissant/ }), 330)
    await r.tap(page.getByRole('button', { name: /^Add Butter croissant/ }), 700)
    await r.show(page.getByRole('button', { name: /^Add Cinnamon roll/ }), 330)
    await r.tap(page.getByRole('button', { name: /^Add Cinnamon roll/ }), 700)
    await r.show(page.getByRole('button', { name: /^Add Steak and onion pie/ }), 330)
    await r.tap(page.getByRole('button', { name: /^Add Steak and onion pie/ }), 700)
    await r.settle()
    await r.tap(page.getByRole('button', { name: 'Review order' }), 900)

    r.cue('review')
    await r.show(page.getByText('Your details').first(), 250)
    await r.tap(page.getByRole('button', { name: /Fill in sample details/ }), 900)
    await r.settle()

    r.cue('preview')
    await r.tap(page.getByRole('button', { name: /Preview my WhatsApp order/ }), 900)
    await r.show(page.getByText('This is what the bakery receives').first(), 250, 500)
    await page.evaluate(() => scrollBy({ top: -330, behavior: 'smooth' }))
    await r.settle(0.6)

    r.cue('shop')
    await r.tap(page.getByRole('button', { name: /Place it without WhatsApp/ }), 900)
    await r.tap(page.getByRole('button', { name: /See it in Shop orders/ }), 1000)
    await r.show(page.getByRole('tablist').first(), 235, 600)
    await r.settle(0.3)
  },
}

/* ---------- 2. Tari, the AI receptionist (text chat) ---------- */

/** Stand-in replies for the demo recording, written in Tari's voice and matching the real reply format. */
const TARI_REPLIES = [
  'Yes. For a salon I can answer client questions, take bookings and send reminders, so your team is not stuck on the phone. Try the Salon and spa booking demo at /demos/salon-spa-booking. It runs on sample data.',
  'Yes, every demo is free to try and needs no sign-up. When you are ready for one built for your business, tap Continue on WhatsApp and the team will reply.',
]

const tariChat = {
  id: 'tari-chat',
  file: '2-tari-ai-receptionist',
  tag: 'Tari is an AI, not a person',
  cover: { headline: 'Meet **Tari**, your AI receptionist', at: 16, focus: 0 },
  lines: {
    hook: { kind: 'hook', cap: 'A receptionist who answers at **2am**?', say: 'A receptionist who answers at two a.m.?' },
    meet: { cap: 'Meet **Tari**, an AI receptionist', say: 'Meet Tari, an AI receptionist for your business.' },
    ask: { cap: 'Ask anything, **by chat**', say: 'Customers just ask, by chat.' },
    reply: { cap: 'Answers in **seconds**', say: 'And Tari answers in seconds.' },
    free: { cap: 'Free to try. **No sign-up**', say: 'Free to try, and no sign-up needed.' },
  },
  onReceptionist: async (route) => {
    const body = JSON.parse(route.request().postData() ?? '{}')
    const asked = (body.messages ?? []).filter((m) => m.role === 'user').length
    const reply = TARI_REPLIES[Math.min(asked, TARI_REPLIES.length) - 1] ?? TARI_REPLIES[0]
    await new Promise((res) => setTimeout(res, 1100))
    const words = reply.split(/(?<= )/)
    const lines = words.map((text) => JSON.stringify({ type: 'delta', text }))
    lines.push(JSON.stringify({ type: 'done' }))
    return route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: lines.join('\n') + '\n' })
  },
  async run(r, page) {
    await r.goto('/')
    await r.reveal()
    await page.waitForTimeout(500)
    r.start()
    r.cue('hook')
    await r.settle(0.6)

    r.cue('meet')
    await page.evaluate(() => scrollTo({ top: 0 }))
    const tari = page.getByText('Meet Tari, our AI receptionist').first()
    await r.show(tari, 330, 600)
    await r.pause(0.9)
    await r.settle(0.1)
    await r.tap(page.getByRole('button', { name: 'Chat with Tari' }).first(), 1200)

    r.cue('ask')
    await r.type(page.getByPlaceholder('Ask about our services or demos'), 'I run a salon. Can you help with bookings?', 35)
    await r.tap(page.getByRole('button', { name: 'Send', exact: true }), 400)
    await r.settle(0.2)

    r.cue('reply')
    await r.pause(2.2)
    await r.settle()

    r.cue('free')
    await r.type(page.getByPlaceholder('Ask about our services or demos'), 'Can I try it first?', 55)
    await r.tap(page.getByRole('button', { name: 'Send', exact: true }), 400)
    await r.pause(2.6)
    await r.settle()
  },
}

/* ---------- 3. Salon and spa booking ---------- */

const salon = {
  id: 'salon-booking',
  file: '3-salon-booking',
  tag: SAMPLE_TAG,
  cover: { headline: 'Let clients **book online**, any time', at: 12, focus: 30 },
  lines: {
    hook: { kind: 'hook', cap: 'Still booking clients **by phone**?', say: 'Still booking clients by phone?' },
    service: { cap: 'Clients pick a **service**', say: 'Clients pick a service,' },
    time: { cap: 'Then a **time that fits**', say: 'then a time that really fits the diary.' },
    details: { cap: 'Add their **details**', say: 'They add their details.' },
    done: { cap: 'Booked. **Confirmation sent**', say: 'Booked. A confirmation goes out on WhatsApp.' },
    cal: { cap: 'It lands in your **calendar**', say: 'And it lands in your team calendar.' },
  },
  async run(r, page) {
    await r.goto('/demos/salon-spa-booking')
    await r.jump(page.getByRole('tablist').first(), 235)
    await page.waitForTimeout(600)
    r.start()
    r.cue('hook')
    await r.settle(0.5)

    r.cue('service')
    await r.show(page.getByText('Choose a service').first(), 260)
    await r.settle(0.2)
    const manicure = page.getByRole('button', { name: /^Blow-dry/ })
    await r.show(manicure, 330, 700)
    await r.tap(manicure, 800)
    await r.show(page.getByText('Choose who').first(), 250, 600)
    await r.tap(page.getByRole('button', { name: /Anyone available/ }), 900)

    r.cue('time')
    await r.show(page.getByText('Choose a time').first(), 250, 700)
    await r.pause(0.5)
    const slot = page.locator('[role=group][aria-label$=" times"] button').nth(2)
    await r.tap(slot, 700)
    await r.settle()
    await r.tap(page.getByRole('button', { name: /^Continue/ }), 900)

    r.cue('details')
    await r.show(page.getByText('Your details').first(), 250, 700)
    await r.type(page.locator('#bk-name'), 'Thandi', 70)
    await r.type(page.locator('#bk-phone'), '082 555 0142', 60)
    await r.settle(0.1)

    r.cue('done')
    await r.show(page.locator('#bk-confirm'), 400, 600)
    await r.tap(page.locator('#bk-confirm'), 1200)
    await r.show(page.getByText(/Confirmation sent/).first(), 330, 800)
    await r.settle(0.9)

    r.cue('cal')
    await r.show(page.getByRole('tablist').first(), 235, 600)
    await r.tap(page.getByRole('tab', { name: /Calendar/ }), 1400)
    await r.show(page.getByRole('tablist').first(), 235, 600)
    await r.settle(0.9)
  },
}

/* ---------- 4. Try the demos (montage) ---------- */

const registry = readFileSync(join(dirname(new URL(import.meta.url).pathname), '../../src/demos/registry.ts'), 'utf8')
const titleOf = (slug) => new RegExp(`slug: '${slug}',\\s*title: '([^']+)'`).exec(registry)?.[1] ?? slug

const MONTAGE = [
  ['restaurant-delivery', 'Restaurant delivery'],
  ['crm-pipeline', 'Sales pipeline'],
  ['clinic-pharmacy', 'Clinic and pharmacy'],
  ['ai-support-desk', 'Customer support desk'],
  ['events-ticketing', 'Events and tickets'],
].map(([slug, short]) => ({ slug, short, title: titleOf(slug) }))

const montage = {
  id: 'try-the-demos',
  file: '4-try-the-demos-free',
  tag: 'Sample business demos',
  cover: { headline: '16 live demos. **Try them free**', at: 4, focus: 30 },
  lines: {
    hook: { kind: 'hook', cap: '**16 live demos.** Try them free', say: 'Sixteen live demos. Try them free.' },
    ...Object.fromEntries(MONTAGE.map((m) => [m.slug, { cap: `**${m.short}**`, say: `${m.short}.` }])),
    last: { cap: 'No sign-up. **Just tap and try**', say: 'No sign-up. Just tap and try.' },
  },
  async run(r, page) {
    await r.goto('/demos/' + MONTAGE[0].slug)
    await r.jump(page.getByRole('tablist').first(), 235)
    await page.waitForTimeout(600)
    r.start()
    r.cue('hook')
    await r.settle(0.5)

    for (const [i, m] of MONTAGE.entries()) {
      r.cue(m.slug)
      if (i > 0) {
        await r.goto('/demos/' + m.slug)
        await r.jump(page.getByRole('tablist').first(), 235)
      }
      await r.pause(0.9)
      await r.tap(page.getByRole('tab').nth(1), 900)
      await r.settle(0.5)
    }
    r.cue('last')
    await r.tap(page.getByRole('tab').nth(2), 900)
    await r.settle(0.6)
  },
}

export const VIDEOS = [whatsappOrdering, tariChat, salon, montage]

/* ---------- Translations ---------- */

/*
 * COPY[lang][videoId] holds what the viewer reads: the corner tag, cover headline, cover line and one caption per line key.
 * COPY[lang]._end is the closing card. English is built from the scenarios above.
 *
 * Shona (sn) is captions-only. No free, commercially usable Shona voice exists (see AUDIO-NOTES.md), so those videos carry
 * the CC0 music bed and no voice-over. Every Shona string is a draft written without a native speaker.
 * NATIVE REVIEW NEEDED for all of them. Plain English glosses are in POSTING-KIT.md. Mixed Shona and English words
 * (order, delivery, sign-up, calendar) follow how people write on WhatsApp in Zimbabwe, and a reviewer may prefer pure Shona.
 */
const en = {
  _end: { endTitle: 'Try it **free**', endLink: 'Link in bio', endNote: 'Demos use invented sample businesses', coverCta: 'Try it free, link in bio' },
  ...Object.fromEntries(
    VIDEOS.map((v) => [
      v.id,
      { tag: v.tag, headline: v.cover.headline, caps: Object.fromEntries(Object.entries(v.lines).map(([k, l]) => [k, l.cap])) },
    ]),
  ),
}

const sn = {
  _end: { endTitle: 'Yedza **mahara**', endLink: 'Link iri mu bio', endNote: 'Mabhizimisi emuenzaniso chete', coverCta: 'Yedza mahara, link iri mu bio' },
  'whatsapp-ordering': {
    tag: 'Bhizimisi remuenzaniso',
    headline: 'Maorder pa**WhatsApp**, pasina mhirizhonga',
    caps: {
      hook: 'Uchiri kutora **maorder** nemavoice notes?',
      browse: 'Vatengi **vanoona** menu pafoni',
      add: 'Vanodzvanya **kuwedzera** zvavanoda',
      review: 'Delivery kana **kuzvitorera**',
      preview: 'Unowana **order yakajeka**',
      shop: 'Shopu inoiona **pakarepo**',
    },
  },
  'tari-chat': {
    tag: 'Tari ndeye AI, haisi munhu',
    headline: 'Ona **Tari**, AI receptionist yako',
    caps: {
      hook: 'Receptionist anopindura pa**2am**?',
      meet: 'Ona **Tari**, AI receptionist',
      ask: 'Bvunza chero chii **pa-chat**',
      reply: 'Inopindura **nekukurumidza**',
      free: '**Mahara** kuyedza. Hapana sign-up',
    },
  },
  'salon-booking': {
    tag: 'Bhizimisi remuenzaniso',
    headline: 'Vatengi **vabhuke online**, nguva dzose',
    caps: {
      hook: 'Uchiri kutora **mabhuking** nefoni?',
      service: 'Vatengi vanosarudza **sevhisi**',
      time: 'Zvino **nguva inovakodzera**',
      done: 'Zvabhukwa. **Confirmation yatumirwa**',
      details: 'Vanonyora **ruzivo rwavo**',
      cal: 'Inowira mu**calendar** yenyu',
    },
  },
  'try-the-demos': {
    tag: 'Madhemo emabhizimisi emuenzaniso',
    headline: '**Madhemo 16.** Yedza mahara',
    caps: {
      hook: '**Madhemo 16.** Yedzai mahara',
      'restaurant-delivery': '**Restaurant delivery**',
      'crm-pipeline': '**Pipeline** yekutengesa',
      'clinic-pharmacy': '**Kiriniki** ne pharmacy',
      'ai-support-desk': '**Support** yevatengi',
      'events-ticketing': '**Zviitiko** netikiti',
      last: 'Hapana sign-up. **Dzvanya uyedze**',
    },
  },
}

export const COPY = { en, sn }
