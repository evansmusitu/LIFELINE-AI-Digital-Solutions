import { RECEPTIONIST_NAME, VIDEO_START_PATH, type VideoStartResponse } from '../src/receptionist/protocol'
import { json, loadKnowledge, pageName, parseObject, readBody, rejectRequest, requestNetwork, visitorId } from './http'
import type { ChatLimiter } from './limiter'
import { videoOpening, videoPrompt } from './prompt'
import { videoLimits, type VideoCalls } from './video-calls'

/*
 * POST /api/video/start: checks the limits and returns a connection token for one video call.
 * The browser asks for it only after the visitor has allowed the microphone, because Napster
 * tokens are valid for a few seconds.
 * POST /api/video/end: ends the call straight away when the visitor hangs up.
 */

interface Namespaces {
  calls: DurableObjectNamespace<VideoCalls>
  limiter: DurableObjectNamespace<ChatLimiter>
}

const unavailable = (reason: Extract<VideoStartResponse, { type: 'unavailable' }>['reason']) =>
  json({ type: 'unavailable', reason } satisfies VideoStartResponse)

export async function handleVideo(request: Request, env: Env, path: string, ns: Namespaces): Promise<Response> {
  const rejected = rejectRequest(request)
  if (rejected) return rejected
  const raw = await readBody(request, 2000)
  if (raw === null) return json({ error: 'too_large' }, 413)
  const data = parseObject(raw)
  if (!data) return json({ error: 'bad_request' }, 400)
  const calls = ns.calls.getByName('calls')

  if (path !== VIDEO_START_PATH) {
    const callId = typeof data.callId === 'string' && /^[0-9a-f]{24}$/.test(data.callId) ? data.callId : null
    const endKey = typeof data.endKey === 'string' && /^[0-9a-f]{32}$/.test(data.endKey) ? data.endKey : null
    if (!callId || !endKey) return json({ error: 'bad_request' }, 400)
    return json({ ok: await calls.end(callId, endKey) })
  }

  const network = requestNetwork(request)
  const visitor = visitorId(data.visitor) || network
  // Stops one network from hammering the start endpoint. The daily call limits are in VideoCalls.
  try {
    if (!(await ns.limiter.getByName(`video:${network}`).allow(6, 40))) return unavailable('visitor')
  } catch {
    return unavailable('error')
  }

  const url = new URL(request.url)
  const knowledge = await loadKnowledge(env, url.origin)
  const demo = knowledge.demos.find((d) => d.slug === pageName(data.page))
  const page = demo ? demo.slug : 'home'
  const { maxSeconds } = videoLimits(env)
  try {
    return json(
      await calls.start({
        visitor,
        network,
        page,
        pageTitle: demo ? `${demo.title} demo` : 'Home page',
        instructions: videoPrompt(knowledge, maxSeconds),
        opening: videoOpening(knowledge, page, maxSeconds),
      }),
    )
  } catch (error) {
    console.warn(`video: ${RECEPTIONIST_NAME} call start failed`, error instanceof Error ? error.message : String(error))
    return unavailable('error')
  }
}
