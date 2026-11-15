import { Inbox, Lock, PhoneCall, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { WhatsAppIcon } from '../../components/WhatsAppIcon'
import { cn } from '../../lib/cn'
import { clockTime } from '../../lib/format'
import { AppButton, Modal, Notice, Panel, Segmented } from '../ui'
import { BUSINESS, FONTS, PALETTES, TOPICS } from './data'
import { contrastRatio, validateMessage, whatsappMessage } from './engine'
import { scrollWithin } from './hooks'
import { NewSite, type ScrollTarget, type SiteEnquiry } from './NewSite'
import type { FontId, SiteStyle, TopicId } from './types'

interface Props {
  siteStyle: SiteStyle
  now: number
  onStyle: (style: SiteStyle) => void
  onFormEnquiry: (enquiry: SiteEnquiry) => string
  onWhatsAppEnquiry: (topic: TopicId, message: string) => string
  /** Returns false when a call from this visitor was logged a few minutes ago. */
  onCall: () => boolean
  onOpenEnquiries: () => void
}

type SiteNotice = { kind: 'call'; logged: boolean } | { kind: 'sent'; ref: string }

export function SiteScreen({ siteStyle, now, onStyle, onFormEnquiry, onWhatsAppEnquiry, onCall, onOpenEnquiries }: Props) {
  const viewRef = useRef<HTMLDivElement>(null)
  const [notice, setNotice] = useState<SiteNotice | null>(null)
  const [whatsApp, setWhatsApp] = useState(false)
  const palette = PALETTES.find((p) => p.id === siteStyle.palette) ?? PALETTES[0]
  const font = FONTS.find((f) => f.id === siteStyle.font) ?? FONTS[0]

  // In-page links scroll the site's own frame. The page URL and the page scroll stay put.
  const scrollTo = (target: ScrollTarget) => {
    const view = viewRef.current
    const el = view?.querySelector(`[data-section="${target}"]`)
    if (!view || !el) return
    const header = view.querySelector('header')?.offsetHeight ?? 0
    scrollWithin(view, el, target === 'home' ? header : header + 12)
  }

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <Panel title="Try a different look" description="Changes the new site live, here and in Before & after." bodyClassName="flex flex-wrap gap-x-10 gap-y-4">
        <fieldset className="min-w-0">
          <legend className="text-xs font-semibold text-slate-700">Colours</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={p.id === siteStyle.palette}
                onClick={() => onStyle({ ...siteStyle, palette: p.id })}
                className={cn(
                  'inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition',
                  p.id === siteStyle.palette ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-800 hover:border-slate-400',
                )}
              >
                <span className="size-4 rounded-full ring-2 ring-white/80" style={{ background: p.base }} aria-hidden="true" />
                {p.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-slate-600">
            White text on {palette.label.toLowerCase()}: {contrastRatio('#ffffff', palette.base).toFixed(1)}:1, which passes WCAG AA.
          </p>
        </fieldset>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-700">Fonts</p>
          <Segmented<FontId>
            label="Fonts"
            value={siteStyle.font}
            onChange={(id) => onStyle({ ...siteStyle, font: id })}
            options={FONTS.map((f) => ({ value: f.id, label: f.label }))}
            className="mt-1.5"
          />
          <p className="mt-1.5 text-xs text-slate-600">{font.detail}.</p>
        </div>
      </Panel>

      <section aria-label="Kopje Spring Drilling new website" className="overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-300">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-100 px-3 py-2">
          <span className="flex shrink-0 gap-1" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-slate-300" />
            <span className="size-2.5 rounded-full bg-slate-300" />
            <span className="size-2.5 rounded-full bg-slate-300" />
          </span>
          <span className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-white px-2.5 py-0.5 text-xs text-slate-700">
            <Lock className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{BUSINESS.domain}</span>
          </span>
        </div>
        {/* Always present, so screen readers announce the notice when it appears. */}
        <div role="status" className={notice ? 'border-b border-slate-200 bg-white p-2' : undefined}>
          {notice && (
            <Notice tone={notice.kind === 'call' ? 'neutral' : 'accent'} icon={notice.kind === 'call' ? PhoneCall : Inbox}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <p className="min-w-0 flex-1 basis-48">
                  {notice.kind === 'call' ? (
                    <>
                      This is a demo: in the real site this calls {BUSINESS.phone}.{' '}
                      {notice.logged ? 'We logged it as a call-button enquiry.' : 'Your call from a few minutes ago is already in Enquiries.'}
                    </>
                  ) : (
                    <>Enquiry {notice.ref} is in the team’s inbox.</>
                  )}
                </p>
                <span className="flex gap-1">
                  <AppButton size="sm" onClick={onOpenEnquiries}>
                    See it in Enquiries
                  </AppButton>
                  <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="grid size-8 place-items-center rounded-lg hover:bg-black/5">
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </span>
              </div>
            </Notice>
          )}
        </div>
        <div ref={viewRef} className="h-[min(40rem,78dvh)] overflow-x-hidden overflow-y-auto">
          <NewSite
            siteStyle={siteStyle}
            onNav={scrollTo}
            onCall={() => setNotice({ kind: 'call', logged: onCall() })}
            onWhatsApp={() => setWhatsApp(true)}
            onSubmit={(enquiry) => {
              const ref = onFormEnquiry(enquiry)
              setNotice({ kind: 'sent', ref })
              return ref
            }}
          />
        </div>
      </section>
      <p className="text-xs text-slate-600">
        In this demo the Call and WhatsApp buttons don’t leave the page. They log an enquiry, so you can see it arrive in Enquiries.
      </p>

      {whatsApp && (
        <WhatsAppSheet
          time={clockTime(now)}
          onClose={() => setWhatsApp(false)}
          onOpenEnquiries={onOpenEnquiries}
          onSend={(topic, message) => {
            const ref = onWhatsAppEnquiry(topic, message)
            setNotice({ kind: 'sent', ref })
          }}
        />
      )}
    </div>
  )
}

function WhatsAppSheet({
  time,
  onClose,
  onSend,
  onOpenEnquiries,
}: {
  time: string
  onClose: () => void
  onSend: (topic: TopicId, message: string) => void
  onOpenEnquiries: () => void
}) {
  const id = useId()
  const [topic, setTopic] = useState<TopicId>('borehole')
  const [text, setText] = useState(() => whatsappMessage('borehole'))
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<string | null>(null)

  const send = () => {
    const problem = validateMessage(text)
    setError(problem)
    if (problem) return
    onSend(topic, text.trim())
    setSent(text.trim())
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="WhatsApp Kopje Spring Drilling"
      description="A demo chat. Nothing is sent outside this page."
      footer={
        sent ? (
          <>
            <AppButton variant="secondary" onClick={onClose}>
              Close
            </AppButton>
            <AppButton
              onClick={() => {
                onClose()
                onOpenEnquiries()
              }}
            >
              See it in Enquiries
            </AppButton>
          </>
        ) : (
          <>
            <AppButton variant="secondary" onClick={onClose}>
              Cancel
            </AppButton>
            <button
              type="button"
              onClick={send}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0f7a40] px-4 text-sm font-semibold text-white hover:bg-[#0c6b37]"
            >
              <WhatsAppIcon className="size-4" />
              Send
            </button>
          </>
        )
      }
    >
      <div className="-mx-5 -my-4 bg-[#efeae2]">
        <div className="flex items-center gap-3 bg-[#075e54] px-4 py-2.5 text-white">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/15 text-sm font-bold" aria-hidden="true">
            KS
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{BUSINESS.name}</p>
            <p className="truncate text-xs text-white/85">Business account · replies in working hours</p>
          </div>
        </div>
        <div className="space-y-2 p-3" aria-live="polite">
          <p className="max-w-[88%] rounded-lg rounded-tl-none bg-white px-3 py-2 text-sm text-slate-900 shadow-sm">
            Hello, thanks for getting in touch. Tell us what you need and where you are, and we’ll reply with a time for a site
            survey.
          </p>
          {sent && (
            <p className="ml-auto max-w-[88%] rounded-lg rounded-tr-none bg-[#d9fdd3] px-3 py-2 text-sm whitespace-pre-line text-slate-900 shadow-sm">
              <span className="sr-only">You: </span>
              {sent}
              <span className="mt-0.5 block text-right text-[0.7rem] text-slate-600">{time} · Sent</span>
            </p>
          )}
        </div>
        {!sent && (
          <div className="space-y-2 border-t border-black/5 bg-[#f0f2f5] p-3">
            <div role="group" aria-label="What is it about?" className="flex flex-wrap gap-1.5">
              {TOPICS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={t.id === topic}
                  onClick={() => {
                    setTopic(t.id)
                    setText(whatsappMessage(t.id))
                    setError(null)
                  }}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                    t.id === topic ? 'bg-[#075e54] text-white' : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:ring-slate-400',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <label htmlFor={`${id}-msg`} className="sr-only">
              Your message
            </label>
            <textarea
              id={`${id}-msg`}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                if (error) setError(null)
              }}
              rows={4}
              maxLength={600}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-msg-error` : undefined}
              className="block w-full resize-none rounded-lg bg-white px-3 py-2 text-sm leading-relaxed text-slate-900 ring-1 ring-slate-300"
            />
            {error && (
              <p id={`${id}-msg-error`} className="text-xs font-medium text-red-700">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
