import '@touchcastllc/napster-companion-api/styles'
import {
  DataChannelMessageType,
  NapsterCompanionApiSdk,
  type NapsterCompanionApiConfig,
  type NapsterCompanionApiInstance,
} from '@touchcastllc/napster-companion-api'
import { ArrowLeft, Mic, MicOff, PhoneOff, Video } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, WhatsAppButton } from '../../components/Button'
import { SITE } from '../../config/site'
import type { DemoMeta } from '../../demos/registry'
import { cn } from '../../lib/cn'
import { paths } from '../../lib/router'
import { uid } from '../../lib/time'
import type { ChatMessage } from '../chat'
import { RECEPTIONIST_NAME, type VideoUnavailableReason } from '../protocol'
import { endVideoCall, startVideoCall } from './api'
import { callLength, clock, demosMentioned, readEvent, showDemo, Transcript } from './events'

/*
 * A live video call with Tari: a talking avatar that listens and answers out loud. The page asks
 * the Worker for a one-call token only after the visitor has allowed the microphone. The call ends
 * at its time limit, when the visitor hangs up or closes the chat, or when the page is left.
 */

/** Tari's photo, shown before the call and while it connects. */
const PHOTO = '/tari-video.jpg'
/** Seconds before the end when Tari is told to wrap up. */
const WRAP_UP_SECONDS = 30

type SessionStatus = Parameters<NonNullable<NapsterCompanionApiConfig['onSessionStatusChange']>>[0]
type Phase = 'intro' | 'connecting' | 'live' | 'ended' | 'unavailable'
type Problem = VideoUnavailableReason | 'failed' | 'mic'

const PROBLEMS: Record<Problem, string> = {
  daily: 'Video calls are fully booked for today. Try again tomorrow, or keep chatting here.',
  budget: 'Video calls are paused at the moment. Keep chatting here, or continue on WhatsApp.',
  busy: `${RECEPTIONIST_NAME} is on other calls right now. Please try again in a minute.`,
  visitor: 'You’ve had today’s video calls. Keep chatting here, or continue on WhatsApp.',
  off: 'Video calls aren’t available right now. Keep chatting here, or continue on WhatsApp.',
  error: 'Video calls aren’t available right now. Keep chatting here, or continue on WhatsApp.',
  failed: 'The call couldn’t connect. Check your internet connection and try again.',
  mic: `${RECEPTIONIST_NAME} needs your microphone to hear you. Allow microphone access for this site, then try again.`,
}

const ENDINGS = {
  limit: 'That’s the end of the call. Thanks for talking with me!',
  hangup: 'Call ended.',
  dropped: 'The call ended. The connection may have dropped.',
  idle: 'The call ended because it went quiet.',
  closed: 'Call ended.',
} as const
type Ending = keyof typeof ENDINGS

/** Phones show the call's name on the lock screen and in notifications. */
function nameMediaSession() {
  try {
    if ('mediaSession' in navigator && typeof MediaMetadata === 'function') {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `Video call with ${RECEPTIONIST_NAME}`,
        artist: SITE.brand,
        artwork: [{ src: '/logo.png', sizes: '768x768', type: 'image/png' }],
      })
    }
  } catch {
    // Not supported. Nothing to do.
  }
}

interface Props {
  page: string
  visitor: string
  /** False when the chat is closed: a running call ends. */
  active: boolean
  /** The WhatsApp message, with what was said on the call so far added to the chat's. */
  whatsappMessage: (call: ChatMessage[]) => string
  /** Called once per call that went live, with what to add to the chat. */
  onFinished: (record: ChatMessage[]) => void
  onBack: () => void
  onDemoLink: () => void
}

export default function VideoCall({ page, visitor, active, whatsappMessage, onFinished, onBack, onDemoLink }: Props) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [problem, setProblem] = useState<Problem | null>(null)
  const [ending, setEnding] = useState<Ending>('hangup')
  const [status, setStatus] = useState<SessionStatus | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [caption, setCaption] = useState('')
  const [spoken, setSpoken] = useState('')
  const [demos, setDemos] = useState<DemoMeta[]>([])
  const [micMuted, setMicMuted] = useState(false)
  const [idle, setIdle] = useState(false)
  const [length, setLength] = useState(0)
  const [announcement, setAnnouncement] = useState('')

  const mount = useRef<HTMLDivElement>(null)
  const instance = useRef<NapsterCompanionApiInstance | null>(null)
  const call = useRef<{ callId: string; endKey: string; maxSeconds: number } | null>(null)
  const unavailable = useRef<VideoUnavailableReason | null>(null)
  /** The SDK asks for a token only once the microphone works, so an error before that is a microphone problem. */
  const tokenAsked = useRef(false)
  const startedAt = useRef<number | null>(null)
  const timer = useRef<number | null>(null)
  const wrapped = useRef(false)
  const transcript = useRef(new Transcript())
  const shared = useRef<DemoMeta[]>([])
  const finished = useRef(true)
  /** True while the SDK's "still there?" countdown is showing, so a call it ends is called quiet, not dropped. */
  const inactive = useRef(false)
  const phaseRef = useRef<Phase>('intro')
  /** Counts call attempts. A token that arrives for an attempt that has since been cancelled is ended at once. */
  const attempt = useRef(0)
  const endButton = useRef<HTMLButtonElement>(null)
  const endedHeading = useRef<HTMLHeadingElement>(null)

  const go = (next: Phase) => {
    phaseRef.current = next
    setPhase(next)
  }

  /** Stops the SDK and tells the Worker. Safe to call more than once. Cancels an attempt still connecting. */
  const teardown = useCallback(() => {
    attempt.current += 1
    if (timer.current !== null) window.clearInterval(timer.current)
    timer.current = null
    const current = instance.current
    instance.current = null
    try {
      current?.destroy()
    } catch {
      // Already torn down by the SDK.
    }
    if (call.current) endVideoCall({ callId: call.current.callId, endKey: call.current.endKey })
    call.current = null
  }, [])

  /** What was said on the call, as chat messages. */
  const callMessages = useCallback((): ChatMessage[] => {
    const record: ChatMessage[] = transcript.current.lines
      .filter((line) => line.text.trim())
      .map((line): ChatMessage =>
        line.who === 'visitor'
          ? { id: uid('you'), role: 'user', text: line.text.trim(), fromCall: true }
          : { id: uid('tari'), role: 'assistant', text: line.text.trim(), source: 'ai', fromCall: true },
      )
    if (shared.current.length) {
      const links = shared.current.map((d) => `/demos/${d.slug}`).join(' and ')
      record.push({
        id: uid('tari'),
        role: 'assistant',
        text: `Here ${shared.current.length > 1 ? 'are the demos' : 'is the demo'} I showed you on the call: ${links}.`,
        source: 'ai',
        fromCall: true,
      })
    }
    return record
  }, [])

  /** Ends the call and, if it went live, hands the conversation to the chat. */
  const finish = useCallback(
    (why: Ending) => {
      if (finished.current) return
      finished.current = true
      const wasLive = startedAt.current !== null
      const seconds = wasLive ? (Date.now() - (startedAt.current ?? Date.now())) / 1000 : 0
      teardown()
      if (!wasLive) return
      setLength(seconds)
      setEnding(why)
      setAnnouncement(ENDINGS[why])
      go('ended')
      onFinished([
        { id: uid('note'), role: 'note', text: `Video call with ${RECEPTIONIST_NAME} · ${callLength(seconds)}` },
        ...callMessages(),
      ])
    },
    [callMessages, onFinished, teardown],
  )
  const finishRef = useRef(finish)
  useEffect(() => {
    finishRef.current = finish
  }, [finish])

  const tick = useCallback(() => {
    const limits = call.current
    if (!limits || startedAt.current === null) return
    const left = limits.maxSeconds - (Date.now() - startedAt.current) / 1000
    setSecondsLeft(left)
    if (left <= WRAP_UP_SECONDS && !wrapped.current) {
      wrapped.current = true
      instance.current?.sendCommand({
        type: DataChannelMessageType.SEND_MESSAGE,
        data: { role: 'system', text: `Note: the call ends in ${WRAP_UP_SECONDS} seconds.`, trigger_response: false },
      })
    }
    if (left <= 0) finish('limit')
  }, [finish])

  const goLive = useCallback(() => {
    if (startedAt.current !== null) return
    startedAt.current = Date.now()
    setSecondsLeft(call.current?.maxSeconds ?? 0)
    setAnnouncement(`Call started. ${RECEPTIONIST_NAME} can hear you now.`)
    go('live')
    nameMediaSession()
    window.setTimeout(nameMediaSession, 2000)
    timer.current = window.setInterval(tick, 250)
  }, [tick])

  const share = useCallback((demo: DemoMeta) => {
    if (shared.current.includes(demo)) return
    shared.current = [...shared.current, demo]
    setDemos(shared.current)
  }, [])

  const onEvent = useCallback((raw: unknown) => {
    const event = readEvent(raw)
    if (!event) return
    if (event.kind === 'item') {
      transcript.current.add(event)
    } else if (event.kind === 'tari' || event.kind === 'visitor') {
      transcript.current.add(event)
      setCaption(transcript.current.caption)
      if (event.kind === 'tari' && event.final) {
        const line = transcript.current.tariLine(event.itemId)
        setSpoken(`${RECEPTIONIST_NAME}: ${line}`)
        // Every demo Tari names gets its link, whether or not she called show_demo.
        demosMentioned(line).forEach(share)
      }
      inactive.current = false
      setIdle(false)
    } else if (event.kind === 'tool' && event.name === 'show_demo') {
      const { demo, output } = showDemo(event.args)
      if (demo) share(demo)
      instance.current?.sendCommand({
        type: DataChannelMessageType.FUNCTION_CALL_OUTPUT,
        data: { call_id: event.callId, output },
      })
    } else if (event.kind === 'idle') {
      inactive.current = true
      setIdle(true)
    } else if (event.kind === 'ended') {
      finish('dropped')
    }
  }, [finish, share])

  const start = async () => {
    const container = mount.current
    if (!container || phaseRef.current === 'connecting' || phaseRef.current === 'live') return
    teardown()
    const mine = attempt.current
    const stale = () => attempt.current !== mine
    finished.current = false
    unavailable.current = null
    tokenAsked.current = false
    startedAt.current = null
    wrapped.current = false
    inactive.current = false
    transcript.current = new Transcript()
    shared.current = []
    setDemos([])
    setCaption('')
    setSpoken('')
    setMicMuted(false)
    setIdle(false)
    setProblem(null)
    setStatus(null)
    setAnnouncement(`Connecting to ${RECEPTIONIST_NAME}…`)
    go('connecting')
    // Let the video area appear first: the SDK sizes itself to it.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    if (stale()) return

    const fail = (why: Problem) => {
      if (stale()) return
      if (phaseRef.current === 'live') {
        finish('dropped')
        return
      }
      finished.current = true
      teardown()
      setProblem(why)
      go(why === 'mic' ? 'intro' : 'unavailable')
    }

    try {
      instance.current = await NapsterCompanionApiSdk.init(
        async () => {
          tokenAsked.current = true
          const result = await startVideoCall({ page, visitor })
          // Cancelled while the token was on its way: end that call straight away.
          if (stale()) {
            if (result.type === 'ok') endVideoCall({ callId: result.callId, endKey: result.endKey })
            throw new Error('Video call cancelled')
          }
          if (result.type !== 'ok') {
            unavailable.current = result.reason
            throw new Error(`Video call unavailable: ${result.reason}`)
          }
          call.current = { callId: result.callId, endKey: result.endKey, maxSeconds: result.maxSeconds }
          return result.token
        },
        {
          layout: { type: 'inline', mountContainer: container },
          style: { view: 'rectangle', accentColor: '#00d4ff', className: 'lifeline-video' },
          agent: { photoUrl: PHOTO },
          features: {
            controls: { enabled: false },
            disclaimer: { enabled: false },
            pictureInPicture: { enabled: false },
            screenShare: { enabled: false },
            faceTracking: { enabled: false },
            // Ends a silent call after a minute, with a 20-second countdown, so idle calls cost little.
            inactiveTimeout: { enabled: true, duration: 60_000, countdown: 20 },
          },
          onSessionStatusChange: (next) => {
            setStatus(next)
            if (next === 'readyAudio' || next === 'readyVideo') goLive()
            else if (next === 'permissionDismissed') fail('mic')
            else if (next === 'entry' && phaseRef.current === 'live') finish(inactive.current ? 'idle' : 'dropped')
          },
          onInactivityStatusChange: (isInactive) => {
            inactive.current = isInactive
            setIdle(isInactive)
          },
          // The SDK also calls this with false while it shuts down, which isn't the call going live.
          onAvatarReady: (ready) => {
            if (ready === false) return
            goLive()
            nameMediaSession()
          },
          onData: onEvent,
          // Before the call is live an error means it couldn't start. Once live, the SDK also reports
          // errors it recovers from, so the call ends only when the session does (status "entry").
          onError: () => {
            if (phaseRef.current !== 'live') fail(unavailable.current ?? (tokenAsked.current ? 'failed' : 'mic'))
          },
        },
      )
      if (stale()) {
        // Cancelled while the SDK was starting: this instance belongs to no attempt.
        instance.current?.destroy()
        instance.current = null
      } else if (finished.current) teardown()
    } catch {
      fail(unavailable.current ?? (tokenAsked.current ? 'failed' : 'mic'))
    }
  }

  // Focus follows the call: the end button while it connects or runs, the heading when it ends.
  useEffect(() => {
    if (phase === 'connecting') endButton.current?.focus({ preventScroll: true })
    if (phase === 'ended') endedHeading.current?.focus({ preventScroll: true })
  }, [phase])

  // Closing the chat ends a call that is running or connecting.
  useEffect(() => {
    if (active) return
    if (phaseRef.current === 'live' || phaseRef.current === 'connecting') {
      if (phaseRef.current === 'live') finish('closed')
      else {
        finished.current = true
        teardown()
        go('intro')
      }
    }
  }, [active, finish, teardown])

  // Leaving the page ends the call at once (keepalive request). Leaving the call screen (back to the
  // chat, or a new chat) ends it too, and a call that was live still goes into the chat.
  useEffect(() => {
    const onHide = () => teardown()
    window.addEventListener('pagehide', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
      if (phaseRef.current === 'live') finishRef.current('closed')
      else teardown()
    }
  }, [teardown])

  const toggleMic = () => {
    const current = instance.current
    if (!current) return
    if (current.isMicMuted) current.unmuteMic()
    else current.muteMic()
    setMicMuted(current.isMicMuted)
  }

  const onStage = phase === 'connecting' || phase === 'live'
  const whatsapp = whatsappMessage(phase === 'live' ? callMessages() : [])
  /** Opening WhatsApp ends a live call, so it doesn't keep running (and costing) in the background. */
  const endForWhatsApp = () => {
    if (phaseRef.current === 'live') finish('hangup')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* The video. Kept in the page while connecting and live: the SDK draws inside it, so React leaves it empty. */}
      <div className={cn('relative min-h-0 flex-1 overflow-hidden bg-ink-950', !onStage && 'hidden')}>
        {/* isolate keeps the SDK's own layers inside this box, under the countdown and captions. */}
        <div ref={mount} className="lifeline-video-stage absolute inset-0 isolate" />
        <p className="pointer-events-none absolute top-3 left-3 z-10 flex items-center gap-2 rounded-full bg-ink-950/80 px-3 py-1 text-xs font-semibold text-white">
          {phase === 'live' ? (
            <>
              <span className="size-2 animate-pulse rounded-full bg-red-500" aria-hidden="true" />
              Live · {clock(secondsLeft)} left
            </>
          ) : (
            <>{status === 'permissionPending' || status === 'permissionBlocked' ? 'Waiting for your microphone…' : 'Connecting…'}</>
          )}
        </p>
        {caption && phase === 'live' && (
          <p className="pointer-events-none absolute inset-x-3 bottom-3 z-10 line-clamp-3 rounded-xl bg-ink-950/80 px-3 py-2 text-sm leading-snug text-white" aria-hidden="true">
            {caption}
          </p>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {spoken}
      </p>
      <p className="sr-only" role="status">
        {announcement}
      </p>

      {phase === 'intro' && (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
          <img src={PHOTO} alt="" className="aspect-video w-full rounded-2xl object-cover" loading="lazy" />
          <h3 className="mt-4 font-display text-lg font-bold text-white">Video call with {RECEPTIONIST_NAME}</h3>
          <p className="mt-1 text-sm text-mist-200">
            Talk face to face with our AI receptionist about your business. Calls last up to 3 minutes, and{' '}
            {RECEPTIONIST_NAME} can show you the demos that fit.
          </p>
          <p className="mt-2 text-xs text-mist-400">
            Your browser will ask to use your microphone. A call uses about as much data as a normal video call, and our
            video call provider keeps a transcript of it.
          </p>
          {problem && (
            <p role="alert" className="mt-3 rounded-xl border border-[#ff8fa3]/40 bg-[#ff8fa3]/10 px-3 py-2 text-sm text-mist-100">
              {PROBLEMS[problem]}
            </p>
          )}
          <div className="mt-auto flex flex-col gap-2 pt-4">
            <Button size="lg" onClick={() => void start()} className="w-full">
              <Video className="size-5" aria-hidden="true" />
              Start video call
            </Button>
            <Button variant="ghost" onClick={onBack} className="w-full">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to chat
            </Button>
          </div>
        </div>
      )}

      {phase === 'unavailable' && problem && (
        <div className="flex flex-1 flex-col justify-center gap-4 px-6 py-6 text-center">
          <p role="alert" className="text-mist-100">
            {PROBLEMS[problem]}
          </p>
          <div className="flex flex-col gap-2">
            <WhatsAppButton message={whatsapp} label="Continue on WhatsApp" className="w-full" />
            <Button variant="ghost" onClick={onBack} className="w-full">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to chat
            </Button>
          </div>
        </div>
      )}

      {phase === 'ended' && (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-6">
          <h3 ref={endedHeading} tabIndex={-1} className="font-display text-lg font-bold text-white outline-none">
            {ENDINGS[ending]}
          </h3>
          <p className="mt-1 text-sm text-mist-300">
            {callLength(length)}. What you talked about is now in the chat, and goes with your WhatsApp message.
          </p>
          <DemoLinks demos={demos} onDemoLink={onDemoLink} />
          <div className="mt-auto flex flex-col gap-2 pt-5">
            <WhatsAppButton message={whatsapp} label="Continue on WhatsApp" className="w-full" />
            <Button variant="ghost" onClick={onBack} className="w-full">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to chat
            </Button>
          </div>
        </div>
      )}

      {onStage && (
        <div className="space-y-2.5 border-t border-white/10 bg-ink-900 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {idle && phase === 'live' && (
            <p role="status" className="text-xs text-mist-200">
              Still there? Say something to keep the call going.
            </p>
          )}
          <DemoLinks demos={demos} onDemoLink={onDemoLink} compact />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleMic}
              disabled={phase !== 'live'}
              aria-pressed={micMuted}
              aria-label={micMuted ? 'Unmute microphone' : 'Mute microphone'}
              className={cn(
                'grid size-12 shrink-0 place-items-center rounded-full border border-white/15 text-white transition hover:bg-white/10 disabled:opacity-40',
                micMuted && 'border-transparent bg-amber-400 text-ink-950 hover:bg-amber-300',
              )}
            >
              {micMuted ? <MicOff className="size-5" aria-hidden="true" /> : <Mic className="size-5" aria-hidden="true" />}
            </button>
            <button
              ref={endButton}
              type="button"
              onClick={() => {
                if (phaseRef.current === 'live') finish('hangup')
                else {
                  finished.current = true
                  teardown()
                  go('intro')
                }
              }}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-red-600 font-semibold text-white transition hover:bg-red-500"
            >
              <PhoneOff className="size-5" aria-hidden="true" />
              {phase === 'live' ? 'End call' : 'Cancel'}
            </button>
          </div>
          <WhatsAppButton
            message={whatsapp}
            label="Continue on WhatsApp"
            size="sm"
            variant="secondary"
            className="w-full"
            onClick={endForWhatsApp}
          />
        </div>
      )}
    </div>
  )
}

function DemoLinks({ demos, onDemoLink, compact }: { demos: DemoMeta[]; onDemoLink: () => void; compact?: boolean }) {
  if (!demos.length) return null
  return (
    <div className={cn(!compact && 'mt-5')}>
      <p className="text-xs font-semibold tracking-[0.12em] text-mist-300 uppercase">Shown by {RECEPTIONIST_NAME}</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {demos.map((demo) => {
          const Icon = demo.icon
          return (
            <li key={demo.slug} className="animate-fade-up">
              <a
                href={paths.demo(demo.slug)}
                onClick={onDemoLink}
                className="inline-flex items-center gap-2 rounded-full border border-brand-cyan/50 bg-brand-cyan/10 px-3 py-1.5 text-sm font-semibold text-white hover:border-brand-cyan"
              >
                <Icon className="size-4 text-brand-cyan" aria-hidden="true" />
                {demo.title}
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
