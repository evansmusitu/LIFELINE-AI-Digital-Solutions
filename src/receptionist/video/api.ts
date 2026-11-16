import {
  VIDEO_END_PATH,
  VIDEO_START_PATH,
  type VideoEndRequest,
  type VideoStartRequest,
  type VideoStartResponse,
} from '../protocol'

/** Asks the Worker for a one-call token. Never throws: a failure comes back as "unavailable". */
export async function startVideoCall(request: VideoStartRequest): Promise<VideoStartResponse> {
  try {
    const res = await fetch(VIDEO_START_PATH, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
    })
    const data = (await res.json()) as Partial<VideoStartResponse> | null
    if (data?.type === 'ok' && typeof data.token === 'string') return data as VideoStartResponse
    if (data?.type === 'unavailable' && typeof data.reason === 'string') return data as VideoStartResponse
  } catch {
    // Offline or a broken response: treated the same way.
  }
  return { type: 'unavailable', reason: 'error' }
}

/** Tells the Worker the call is over, so it ends at once. Kept alive if the page is closing. */
export function endVideoCall(request: VideoEndRequest) {
  void fetch(VIDEO_END_PATH, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request),
    keepalive: true,
  }).catch(() => {
    // The Worker ends the call at its time limit anyway.
  })
}
