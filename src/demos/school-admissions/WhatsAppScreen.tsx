import { FastForward, MessageCircle, Play, RotateCcw, StepForward } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { initials } from '../../lib/format'
import { AppButton, Notice } from '../ui'
import { SCHOOL } from './business'
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
  onOffice: () => void
}

const WHO: Record<ScriptLine['from'], string> = { parent: 'Parent', school: 'Assistant (AI)' }

export function WhatsAppScreen({ business, lines, shown, playing, onNext, onPlay, onRestart, onOffice }: Props) {
  const listRef = useRef<HTMLDivElement>(null)
  const name = business ?? SCHOOL.name
  const done = shown >= lines.length
  const visible = lines.slice(0, shown)
  const handedOver = visible.some((l) => l.action === 'handover')

  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [shown])

  return (
    <div className="grid grid-cols-1 gap-4 p-3 sm:p-5 lg:grid-cols-[1fr_23rem] lg:items-start lg:gap-6">
      <div className="contents lg:block lg:space-y-4">
        <Notice tone="amber" icon={MessageCircle} title="Simulation" className="order-1">
          A scripted WhatsApp conversation. No real WhatsApp messages are sent. The tour offered comes from the same calendar as the tour page, and the
          enquiry and tour appear in the admissions office.
        </Notice>
        <div className="order-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
          <p className="font-semibold text-slate-900">What it shows</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>A parent in Johannesburg writes in Shona about a mid-year transfer.</li>
            <li>The assistant answers in Shona, then in English when she switches.</li>
            <li>It gives the documents, and the fees in USD and ZiG from the school’s own fee list.</li>
            <li>It explains how her family in the UK can pay, and books a tour.</li>
            <li>It passes the payment plan question to the bursar.</li>
          </ol>
        </div>
      </div>

      <div className="order-2 space-y-3 lg:col-start-2 lg:row-start-1">
        <PhoneFrame
          title={name}
          subtitle={handedOver ? 'Business account · with the bursar' : 'Business account · replies instantly'}
          initials={initials(name)}
          label="Simulated WhatsApp chat between a parent and the school"
        >
          <div ref={listRef} className="h-[28rem] space-y-2 overflow-y-auto p-3">
            <p className="mx-auto w-fit rounded-md bg-amber-100 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-900 shadow-sm">Simulation · nothing is sent</p>
            {visible.length === 0 && (
              <p className="mx-auto mt-24 w-fit max-w-[80%] rounded-md bg-white/80 px-3 py-2 text-center text-xs text-slate-600 shadow-sm">
                Tap “Next message” or “Play all” to start the conversation.
              </p>
            )}
            {visible.map((line, i) => (
              <WaBubble
                key={i}
                text={personalised(line.text, business)}
                translation={line.translation ? personalised(line.translation, business) : undefined}
                mine={line.from === 'parent'}
                author={line.from === 'school' ? `${SCHOOL.assistant} (AI assistant)` : undefined}
              />
            ))}
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
          <AppButton variant="secondary" onClick={onOffice} className="w-full">
            Open the admissions office
          </AppButton>
        )}
      </div>
    </div>
  )
}
