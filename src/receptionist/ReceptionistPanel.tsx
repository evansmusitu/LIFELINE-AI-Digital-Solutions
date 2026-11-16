import { Mic, RotateCcw, SendHorizontal, Sparkles, Square, Volume2, VolumeX, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { WhatsAppButton } from '../components/Button'
import { cn } from '../lib/cn'
import { paths } from '../lib/router'
import { usePersistentState } from '../lib/storage'
import { cleanReply, replyParts, spokenText, suggestions, whatsappSummary, type ChatMessage } from './chat'
import { PANEL_FRAME } from './frame'
import { LIMITS, RECEPTIONIST_NAME } from './protocol'
import { canSpeak, speak, stopSpeaking, unlockSpeech, useDictation, type DictationProblem } from './speech'
import { useReceptionistChat } from './useReceptionistChat'


const DICTATION_PROBLEMS: Record<DictationProblem, string> = {
  blocked: 'Microphone access is blocked for this site. You can allow it in your browser settings, or type instead.',
  'no-speech': 'I didn’t hear anything. Tap the microphone and try again.',
  failed: 'Voice typing isn’t working right now. Please type your message.',
}

interface Props {
  open: boolean
  /** "home" or the slug of the demo on screen. */
  page: string
  /** True on phones, where the chat covers the whole screen and the page behind is inert. */
  fullScreen: boolean
  onClose: () => void
}

export default function ReceptionistPanel({ open, page, fullScreen, onClose }: Props) {
  const id = useId()
  const [voiceOn, setVoiceOn] = usePersistentState('receptionist.voice', () => false)
  const voice = useRef(voiceOn)
  const isOpen = useRef(open)
  const [announcement, setAnnouncement] = useState('')
  const [draft, setDraft] = useState('')
  const input = useRef<HTMLTextAreaElement>(null)
  const log = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLElement>(null)

  useEffect(() => {
    voice.current = voiceOn
    if (!voiceOn) stopSpeaking()
  }, [voiceOn])

  useEffect(() => {
    isOpen.current = open
  }, [open])

  const onReply = useCallback((text: string) => {
    const spoken = spokenText(text)
    setAnnouncement(`${RECEPTIONIST_NAME}: ${spoken}`)
    // Not when the chat was closed while the reply was on its way.
    if (voice.current && isOpen.current) speak(spoken)
  }, [])

  const chat = useReceptionistChat(page, onReply)
  const { send: sendMessage } = chat
  /** Every send starts from a tap, the moment iPhones allow speech to be unlocked. */
  const send = useCallback(
    (text: string) => {
      if (voice.current) unlockSpeech()
      void sendMessage(text)
    },
    [sendMessage],
  )
  const dictation = useDictation(send)
  const { cancel: cancelDictation } = dictation

  // On opening: focus the message box, except on touch screens, where that would pop up the keyboard at once.
  useEffect(() => {
    if (!open) return
    const touch = window.matchMedia('(pointer: coarse)').matches
    ;((touch ? null : input.current) ?? panel.current)?.focus()
  }, [open])

  // Full screen on phones: stop the page behind from scrolling.
  useEffect(() => {
    if (!open || !fullScreen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open, fullScreen])

  useEffect(() => {
    if (open) return
    stopSpeaking()
    cancelDictation()
  }, [open, cancelDictation])

  // Escape closes the chat while focus is in it, or nowhere in particular (after the button pressed has gone).
  useEffect(() => {
    if (!open) return
    const onKey = (event: globalThis.KeyboardEvent) => {
      // Not while an input method (for example a Chinese or Japanese keyboard) is mid-word.
      if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing) return
      const active = document.activeElement
      if (active === document.body || active === null || panel.current?.contains(active)) {
        event.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const items: { message: ChatMessage; streaming: boolean }[] = chat.messages.map((message) => ({ message, streaming: false }))
  if (chat.pending) {
    items.push({ message: { id: chat.pending.id, role: 'assistant', text: chat.pending.text, source: 'ai' }, streaming: true })
  }

  const lastText = chat.pending?.text
  useLayoutEffect(() => {
    const box = log.current
    if (box) box.scrollTop = box.scrollHeight
  }, [chat.messages.length, lastText, open])

  // The message box grows with the text, up to about five lines.
  useLayoutEffect(() => {
    const box = input.current
    if (!box) return
    box.style.height = 'auto'
    box.style.height = `${Math.min(box.scrollHeight, 132)}px`
  }, [draft, dictation.interim])

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    const text = draft.trim()
    if (!text || chat.busy) return
    setDraft('')
    send(text)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  // A demo link inside the chat opens the demo. On phones the chat covers it, so close the chat first.
  const onDemoLink = () => {
    if (fullScreen) onClose()
  }

  const restart = () => {
    stopSpeaking()
    cancelDictation()
    chat.restart()
    setDraft('')
    setAnnouncement('')
    input.current?.focus()
  }

  return (
    <section
      ref={panel}
      role="dialog"
      aria-modal={fullScreen || undefined}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-role`}
      hidden={!open}
      tabIndex={-1}
      className={PANEL_FRAME}
    >
      <header className="flex items-center gap-3 border-b border-white/10 bg-ink-900 px-4 py-3">
        <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-brand-gradient text-ink-950" aria-hidden="true">
          <Sparkles className="size-5" />
          <span className="absolute right-0 bottom-0 size-3 rounded-full border-2 border-ink-900 bg-emerald-400" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`${id}-title`} className="font-display text-base leading-tight font-bold text-white">
            {RECEPTIONIST_NAME}
          </h2>
          <p id={`${id}-role`} className="truncate text-xs text-mist-300">
            AI receptionist
          </p>
        </div>
        {canSpeak() && (
          <IconButton
            label="Read replies aloud"
            pressed={voiceOn}
            onClick={() => {
              if (!voiceOn) unlockSpeech()
              setVoiceOn((on) => !on)
            }}
          >
            {voiceOn ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
          </IconButton>
        )}
        <IconButton label="Start a new chat" onClick={restart}>
          <RotateCcw className="size-5" />
        </IconButton>
        <IconButton label="Close chat" onClick={onClose}>
          <X className="size-5" />
        </IconButton>
      </header>

      <div ref={log} aria-label="Conversation" role="region" className="relative flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {/* One list, so the streaming bubble and the finished reply (same id) stay the same element. */}
        {items.map(({ message, streaming }) =>
          streaming && !message.text ? (
            <Typing key={message.id} />
          ) : (
            <Bubble key={message.id} message={message} onDemoLink={onDemoLink} streaming={streaming} />
          ),
        )}
      </div>
      {/* Finished replies only, so screen readers don't read every word as it streams in. */}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {!chat.asked && (
        <div className="flex flex-wrap gap-2 px-4 pb-3">
          {suggestions(page).map((text) => (
            <button
              key={text}
              type="button"
              disabled={chat.busy || dictation.listening}
              onClick={() => {
                // The suggestions disappear once one is sent, so keep focus in the chat.
                input.current?.focus({ preventScroll: true })
                send(text)
              }}
              className="rounded-full border border-brand-cyan/40 bg-brand-cyan/5 px-3 py-1.5 text-left text-sm text-mist-100 transition hover:border-brand-cyan hover:bg-brand-cyan/10 disabled:opacity-50"
            >
              {text}
            </button>
          ))}
        </div>
      )}

      <footer className="space-y-2.5 border-t border-white/10 bg-ink-900 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {chat.asked && (
          <WhatsAppButton
            size="sm"
            message={whatsappSummary(chat.messages, page)}
            label="Continue on WhatsApp"
            className="w-full"
          />
        )}

        {chat.limitReached ? (
          <p className="rounded-xl bg-white/5 px-3 py-2 text-sm text-mist-200">
            That’s a long chat! The team can go into more detail on WhatsApp, or start a new chat here.
          </p>
        ) : (
          <form onSubmit={submit} className="flex items-end gap-2">
            <label htmlFor={`${id}-input`} className="sr-only">
              Message {RECEPTIONIST_NAME}
            </label>
            <textarea
              id={`${id}-input`}
              ref={input}
              rows={1}
              value={dictation.listening ? dictation.interim : draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
              readOnly={dictation.listening}
              maxLength={LIMITS.visitorChars}
              enterKeyHint="send"
              placeholder={dictation.listening ? 'Listening…' : 'Ask about our services or demos'}
              className="block min-h-11 flex-1 resize-none rounded-2xl border border-white/15 bg-ink-950 px-4 py-2.5 text-[0.95rem] leading-snug text-white placeholder:text-mist-400 hover:border-white/25"
            />
            {dictation.supported && (
              <IconButton
                label="Voice typing"
                pressed={dictation.listening}
                disabled={chat.busy}
                onClick={dictation.listening ? dictation.stop : dictation.start}
                className={cn('size-11 border border-white/15', dictation.listening && 'animate-pulse-ring border-brand-cyan text-brand-cyan')}
              >
                {dictation.listening ? <Square className="size-4" /> : <Mic className="size-5" />}
              </IconButton>
            )}
            <button
              type="submit"
              aria-label="Send"
              disabled={!draft.trim() || chat.busy || dictation.listening}
              className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-gradient text-ink-950 transition hover:brightness-110 disabled:opacity-40"
            >
              <SendHorizontal className="size-5" aria-hidden="true" />
            </button>
          </form>
        )}

        {dictation.problem && (
          <p role="status" className="text-xs text-[#ffb4c1]">
            {DICTATION_PROBLEMS[dictation.problem]}
          </p>
        )}
      </footer>
    </section>
  )
}

function IconButton({
  label,
  pressed,
  disabled,
  onClick,
  className,
  children,
}: {
  label: string
  pressed?: boolean
  disabled?: boolean
  onClick: () => void
  className?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'grid size-10 shrink-0 place-items-center rounded-full text-mist-200 transition hover:bg-white/10 hover:text-white disabled:opacity-40 [&>svg]:pointer-events-none',
        pressed && 'bg-white/10 text-white',
        className,
      )}
    >
      {children}
    </button>
  )
}

function ReplyText({ text, onDemoLink }: { text: string; onDemoLink: () => void }) {
  return replyParts(cleanReply(text)).map((part, index) =>
    part.kind === 'demo' ? (
      <a
        key={index}
        href={paths.demo(part.slug)}
        onClick={onDemoLink}
        className="font-semibold text-brand-cyan underline underline-offset-2 hover:text-white"
      >
        {part.title}
      </a>
    ) : (
      <span key={index}>{part.text}</span>
    ),
  )
}

function Bubble({ message, onDemoLink, streaming }: { message: ChatMessage; onDemoLink: () => void; streaming?: boolean }) {
  if (message.role === 'note') {
    return (
      <p className="mx-auto w-fit max-w-[92%] rounded-2xl bg-white/5 px-3 py-1.5 text-center text-xs leading-snug text-mist-300">
        {message.text}
      </p>
    )
  }
  const mine = message.role === 'user'
  return (
    <div className={cn('flex animate-fade-up flex-col', mine ? 'items-end' : 'items-start')}>
      <p
        className={cn(
          'max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[0.95rem] leading-relaxed break-words whitespace-pre-line',
          mine ? 'rounded-br-md bg-brand-gradient text-ink-950' : 'rounded-bl-md border border-white/10 bg-ink-850 text-mist-100',
        )}
      >
        <span className="sr-only">{mine ? 'You: ' : `${RECEPTIONIST_NAME}: `}</span>
        {mine ? message.text : <ReplyText text={message.text} onDemoLink={onDemoLink} />}
        {streaming && <span aria-hidden="true" className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-brand-cyan" />}
      </p>
      {message.source === 'saved' && <span className="mt-1 ml-1 text-[0.7rem] text-mist-400">Saved answer</span>}
    </div>
  )
}

function Typing() {
  return (
    <div className="flex items-start">
      <p className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-white/10 bg-ink-850 px-4 py-3.5">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            aria-hidden="true"
            className="size-2 animate-typing rounded-full bg-mist-300"
            style={{ animationDelay: `${dot * 0.15}s` }}
          />
        ))}
        <span className="sr-only">{RECEPTIONIST_NAME} is typing</span>
      </p>
    </div>
  )
}
