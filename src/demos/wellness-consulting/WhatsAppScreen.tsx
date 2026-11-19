import { FastForward, MessageCircle, Play, RotateCcw, StepForward } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { cn } from '../../lib/cn'
import { initials } from '../../lib/format'
import { AppButton, Notice } from '../ui'
import { BUSINESS } from './business'
import { personalised } from './engine'
import { PhoneFrame, WaBubble } from './parts'
import type { ScriptLine } from './whatsapp-script'

interface Props {
  business: string | null
  lines: ScriptLine[]
  shown: number
  playing: boolean
  onNext: () => void
  onPlay: () => void
  onRestart: () => void
  onOwner: () => void
}

const WHO: Record<ScriptLine['from'], string> = { client: 'Client', assistant: 'Assistant (AI)', system: 'System', owner: 'Owner' }

export function WhatsAppScreen({ business, lines, shown, playing, onNext, onPlay, onRestart, onOwner }: Props) {
  const listRef = useRef<HTMLDivElement>(null)
  const name = business ?? BUSINESS.name
  const done = shown >= lines.length
  const visible = lines.slice(0, shown)
  const handedOver = visible.some((l) => l.action === 'handover')

  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [shown])

  return (
    <div className="grid grid-cols-1 gap-4 p-3 sm:p-5 lg:grid-cols-[1fr_23rem] lg:items-start lg:gap-6">
      {/* Phones: the note, the phone, then the explanation. Laptops: the note and explanation beside the phone. */}
      <div className="contents lg:block lg:space-y-4">
        <Notice tone="amber" icon={MessageCircle} title="Simulation" className="order-1">
          A scripted WhatsApp conversation. No real WhatsApp messages are sent. The times offered come from the same calendar as the
          booking page, and the booking appears in the Owner view.
        </Notice>
        <div className="order-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
          <p className="font-semibold text-slate-900">What it shows</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>A client asks about online consultations on the practice’s WhatsApp number.</li>
            <li>The assistant answers from the practice’s own services and prices.</li>
            <li>It offers free times, books one and sends the confirmation.</li>
            <li>It declines a health question and points to a doctor and a consultation.</li>
            <li>It hands the chat to the owner, who replies in the same chat.</li>
          </ol>
        </div>
      </div>

      <div className="order-2 space-y-3 lg:col-start-2 lg:row-start-1">
        <PhoneFrame
          title={name}
          subtitle={handedOver ? 'Business account · with the team' : 'Business account · replies instantly'}
          initials={initials(name)}
          label="Simulated WhatsApp chat between a client and the practice"
        >
          <div ref={listRef} className="h-[28rem] space-y-2 overflow-y-auto p-3">
            <p className="mx-auto w-fit rounded-md bg-amber-100 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-900 shadow-sm">Simulation · nothing is sent</p>
            {visible.length === 0 && (
              <p className="mx-auto mt-24 w-fit max-w-[80%] rounded-md bg-white/80 px-3 py-2 text-center text-xs text-slate-600 shadow-sm">
                Tap “Next message” or “Play all” to start the conversation.
              </p>
            )}
            {visible.map((line, i) => {
              if (line.from === 'system') {
                return (
                  <p key={i} className="mx-auto w-fit max-w-[90%] rounded-md bg-[#fff3c4] px-2.5 py-1 text-center text-[0.7rem] text-slate-800 shadow-sm">
                    {line.text}
                  </p>
                )
              }
              const last = i === visible.length - 1
              return (
                <div key={i}>
                  <WaBubble
                    text={personalised(line.text, business)}
                    mine={line.from === 'client'}
                    read
                    author={line.from === 'owner' ? 'Team' : line.from === 'assistant' ? `${BUSINESS.assistant} (AI assistant)` : undefined}
                  />
                  {line.options && (
                    <div className="mt-1 grid max-w-[86%] gap-1">
                      {line.options.map((o, j) => (
                        <span
                          key={o}
                          className={cn('rounded-lg bg-white py-1.5 text-center text-[0.8rem] font-semibold text-sky-700 shadow-sm', !last && j === 0 && 'ring-2 ring-emerald-500')}
                        >
                          {o}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </PhoneFrame>
        <div className="flex flex-wrap justify-center gap-2">
          <AppButton icon={StepForward} onClick={onNext} disabled={done || playing}>
            Next message
          </AppButton>
          <AppButton variant="secondary" icon={playing ? FastForward : Play} onClick={onPlay} disabled={done || playing}>
            {playing ? 'Playing…' : 'Play all'}
          </AppButton>
          <AppButton variant="ghost" icon={RotateCcw} onClick={onRestart} disabled={shown === 0}>
            Start again
          </AppButton>
        </div>
        <p className="text-center text-xs text-slate-600" aria-live="polite">
          Message {Math.min(shown, lines.length)} of {lines.length}
          {visible.length ? `: ${WHO[visible[visible.length - 1].from]}` : ''}
        </p>
        {done && (
          <AppButton variant="secondary" onClick={onOwner} className="w-full">
            Open the Owner view
          </AppButton>
        )}
      </div>

    </div>
  )
}
