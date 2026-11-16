#!/usr/bin/env node
/*
 * One-time (and re-runnable) setup of Tari's video call on the Napster Omniagent API:
 * the show_demo tool and two agents, one for the live site and one shared by Previews.
 * Run it again to apply changes made here. The Worker keeps each agent's instructions
 * in step with the site by itself (worker/video-calls.ts), so this only sets the rest.
 *
 *   NAPSTER_API_KEY=... node scripts/napster-setup.mjs
 *
 * It prints the agent IDs to put in wrangler.jsonc (NAPSTER_AGENT_ID). IDs aren't secret:
 * they are useless without the API key.
 */

const BASE = 'https://companion-api.napster.com'
const KEY = process.env.NAPSTER_API_KEY
if (!KEY) {
  console.error('Set NAPSTER_API_KEY first.')
  process.exit(1)
}

/** Kai Mercer from the Napster stock catalogue. He also has a v2 avatar, for when v2 is enabled. */
const COMPANION_ID = 'bf0a1b4c-e0f5-4bf2-a0f2-7b0762cc8540'
const VOICE = 'cedar'
const AGENTS = [
  { name: 'Tari (website)', tag: 'production' },
  { name: 'Tari (previews)', tag: 'preview' },
]

const SHOW_DEMO = {
  data: {
    name: 'show_demo',
    description: 'Shows a link to one of the demos on the visitor’s screen, under the video.',
    parameters: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          description: 'The demo’s ID from your demo list, for example salon-spa-booking.',
        },
      },
      required: ['slug'],
    },
  },
  flow: 'implicit',
  prompt:
    'Call this whenever you recommend a specific demo, once per demo, so its link appears on the visitor’s screen. Say the demo’s name aloud and that its link is now on their screen. Never read out IDs or web addresses. At most two demos per answer.',
  tags: { app: 'lifeline-studio' },
}

async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'X-Api-Key': KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${typeof data === 'string' ? data : JSON.stringify(data)}`)
  return data
}

const items = (data) => (Array.isArray(data) ? data : (data?.items ?? []))

async function ensureFunction() {
  const existing = items(await api('GET', '/public/functions?pageSize=100')).find((f) => f.data?.name === 'show_demo' || f.name === 'show_demo')
  if (existing) {
    await api('PUT', `/public/functions/${existing.id}`, SHOW_DEMO)
    console.log(`show_demo tool updated: ${existing.id}`)
    return existing.id
  }
  const created = await api('POST', '/public/functions', SHOW_DEMO)
  console.log(`show_demo tool created: ${created.id}`)
  return created.id
}

async function ensureAgent({ name, tag }, functionId) {
  const settings = {
    companionId: COMPANION_ID,
    name,
    voiceId: VOICE,
    functions: [functionId],
    useWebSearch: false,
    disableIdleTimeout: false,
    tags: { app: 'lifeline-studio', env: tag },
  }
  const existing = items(await api('GET', '/public/agents')).find((a) => a.name === name)
  let id
  if (existing) {
    // providerSettings is left alone: the Worker owns the instructions.
    await api('PATCH', `/public/agents/${existing.id}`, settings)
    id = existing.id
    console.log(`${name} updated: ${id}`)
  } else {
    const created = await api('POST', '/public/agents', {
      ...settings,
      // Replaced with the real instructions before the first call (worker/video-calls.ts).
      providerSettings: { instructions: 'You are Tari, the AI receptionist for LIFELINE AI CONCIERGE.', temperature: 0.7 },
    })
    id = created.id
    console.log(`${name} created: ${id}`)
  }
  // Start talking with audio first and let the video join a moment later, so calls start faster.
  await api('PUT', `/public/agents/${id}/channels/webrtc`, { videoPolicy: 'deferred' })
  return id
}

const functionId = await ensureFunction()
for (const agent of AGENTS) await ensureAgent(agent, functionId)
