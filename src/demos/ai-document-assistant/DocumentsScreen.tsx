import { BookOpen, ClipboardPaste, FilePlus2, FileUp, Lock, MessageSquareText, Search, Trash2, TriangleAlert, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { cn } from '../../lib/cn'
import { num, shortDate } from '../../lib/format'
import { uid } from '../../lib/time'
import { appButton, td, th } from '../styles'
import { AppButton, Badge, Field, Modal, Notice, Panel, Segmented, TextArea, TextInput, Toggle } from '../ui'
import { EXAMPLES } from './data'
import { DELIVERY } from './docs'
import { suggestQuestions, type SearchIndex } from './engine'
import { DocIcon } from './parts'
import { MAX_FILE_BYTES, docFromUpload, docSize, formatFromName, looksLikeCsv, type UploadFormat } from './parse'
import type { Doc } from './types'

const ERRORS = {
  unsupported: 'This demo reads .txt, .csv and .md files. Your version reads PDF, Word and Excel too.',
  big: 'That file is over 300 KB. Try a smaller file, or paste the part you need.',
  empty: 'That file is empty.',
  unreadable: 'We couldn’t read any text in that file. Save it as .txt, .csv or .md and try again.',
  paste: 'Paste some text first.',
}

interface Props {
  docs: Doc[]
  usage: Record<string, number>
  index: SearchIndex
  now: number
  onToggle: (id: string, enabled: boolean) => void
  onAdd: (doc: Doc) => void
  onRemove: (id: string) => void
  onAsk: (question: string) => void
}

export function DocumentsScreen({ docs, usage, index, now, onToggle, onAdd, onRemove, onAsk }: Props) {
  const [openId, setOpenId] = useState<string | null>(null)
  const open = docs.find((d) => d.id === openId)

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <Panel title="Library" description="The documents the assistant answers from. Switch one off to leave it out of answers.">
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {docs.map((doc) => (
            <li key={doc.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3">
              <div className="flex items-start gap-3">
                <DocIcon doc={doc} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold break-words text-slate-900">{doc.title}</p>
                  <p className="mt-1 flex flex-wrap gap-1.5">
                    <Badge tone={doc.table ? 'blue' : 'neutral'}>{doc.label}</Badge>
                    {doc.origin === 'visitor' && <Badge tone="accent">Your document</Badge>}
                    {doc.origin === 'team' && <Badge tone="violet">Added by the team</Badge>}
                    {doc.transient && <Badge tone="amber">This visit only</Badge>}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-600">
                    {doc.origin === 'team' ? `${doc.sections?.length ?? 0} answers` : docSize(doc)} · Updated {shortDate(doc.updatedAt)}
                  </p>
                  <p className="text-xs text-slate-600">
                    Used in {num(usage[doc.id] ?? 0)} {usage[doc.id] === 1 ? 'answer' : 'answers'} today
                  </p>
                </div>
              </div>
              <Toggle
                checked={doc.enabled}
                onChange={(on) => onToggle(doc.id, on)}
                label="Use in answers"
                ariaLabel={`Use ${doc.title} in answers`}
                description={doc.enabled ? undefined : 'Switched off: the assistant ignores it'}
              />
              <div className="mt-auto flex flex-wrap gap-2">
                <AppButton size="sm" variant="secondary" icon={BookOpen} onClick={() => setOpenId(doc.id)} aria-label={`Open ${doc.title}`}>
                  Open
                </AppButton>
                {doc.origin === 'visitor' && (
                  <AppButton size="sm" variant="danger" icon={Trash2} onClick={() => onRemove(doc.id)} aria-label={`Remove ${doc.title}`}>
                    Remove
                  </AppButton>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <UploadPanel docs={docs} index={index} now={now} onAdd={onAdd} onAsk={onAsk} />

      {open && <DocModal doc={open} onClose={() => setOpenId(null)} />}
    </div>
  )
}

interface Picked {
  name: string
  size: number
  text: string
  format: UploadFormat
}

function UploadPanel({ docs, index, now, onAdd, onAsk }: { docs: Doc[]; index: SearchIndex; now: number; onAdd: (doc: Doc) => void; onAsk: (q: string) => void }) {
  const [mode, setMode] = useState<'file' | 'paste'>('file')
  const [picked, setPicked] = useState<Picked | null>(null)
  const [paste, setPaste] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [addedId, setAddedId] = useState<string | null>(null)
  const added = docs.find((d) => d.id === addedId)
  // Reading a file is async: skip the update if the visitor has left the screen.
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  const suggestions = useMemo(() => (added ? suggestQuestions(added, index, DELIVERY) : []), [added, index])

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    setError('')
    setPicked(null)
    if (!file) return
    const format = formatFromName(file.name)
    if (format === 'unsupported') return setError(ERRORS.unsupported)
    if (file.size > MAX_FILE_BYTES) return setError(ERRORS.big)
    if (file.size === 0) return setError(ERRORS.empty)
    try {
      const text = await file.text()
      if (!alive.current) return
      if (!text.trim()) return setError(ERRORS.empty)
      setPicked({ name: file.name, size: file.size, text, format })
      if (!name.trim()) setName(file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '))
    } catch {
      if (alive.current) setError(ERRORS.unreadable)
    }
  }

  const add = () => {
    setError('')
    const source = mode === 'file' ? picked : paste.trim() ? { text: paste, format: looksLikeCsv(paste) ? ('csv' as const) : ('markdown' as const) } : null
    if (!source) return setError(mode === 'file' ? 'Choose a file first.' : ERRORS.paste)
    if (source.text.length > MAX_FILE_BYTES) return setError('That text is over 300 KB. Paste the part you need.')
    const result = docFromUpload({ id: uid('doc'), name, text: source.text, format: source.format, at: now })
    if (typeof result === 'string') return setError(ERRORS[result])
    onAdd(result)
    setAddedId(result.id)
    setPicked(null)
    setPaste('')
    setName('')
  }

  const example = (kind: keyof typeof EXAMPLES) => {
    setMode('paste')
    setPaste(EXAMPLES[kind].text)
    setName(EXAMPLES[kind].name)
    setError('')
  }

  return (
    <Panel title="Try your own document" description="Add a price list or policy, then ask the assistant about it">
      <div className="space-y-4">
        <Segmented
          label="How to add it"
          value={mode}
          onChange={(m) => {
            setMode(m)
            setError('')
          }}
          options={[
            { value: 'file', label: 'Upload a file', icon: FileUp },
            { value: 'paste', label: 'Paste text', icon: ClipboardPaste },
          ]}
          className="w-full sm:w-auto"
        />
        {mode === 'file' ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <input id="doc-file" type="file" accept=".txt,.csv,.md,.markdown,.pdf,.doc,.docx,.xls,.xlsx,text/plain,text/csv,text/markdown" onChange={choose} className="peer sr-only" />
              <label htmlFor="doc-file" className={appButton('secondary', 'md', 'cursor-pointer peer-focus-visible:ring-2 peer-focus-visible:ring-(--accent)')}>
                <FileUp className="size-4" aria-hidden="true" />
                Choose a file
              </label>
              <span className="text-xs text-slate-600">.txt, .csv or .md, up to 300 KB</span>
            </div>
            {picked && (
              <p className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800 ring-1 ring-slate-200">
                <span className="min-w-0 flex-1 break-all">
                  {picked.name} · {picked.size < 1024 ? `${picked.size} bytes` : `${Math.round(picked.size / 1024)} KB`}
                </span>
                <button type="button" onClick={() => setPicked(null)} aria-label="Clear the chosen file" className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-slate-200">
                  <X className="size-4" aria-hidden="true" />
                </button>
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Field label="Text or CSV" htmlFor="doc-paste" hint="Headings and paragraphs, or rows with a header row">
              <TextArea id="doc-paste" rows={7} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="Paste a policy, a price list or a CSV" aria-describedby="doc-paste-hint" />
            </Field>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-600">No file to hand?</span>
              <AppButton size="sm" variant="ghost" onClick={() => example('csv')}>
                Example price list
              </AppButton>
              <AppButton size="sm" variant="ghost" onClick={() => example('policy')}>
                Example policy
              </AppButton>
            </div>
          </div>
        )}
        <p className="flex items-center gap-2 text-xs font-medium text-slate-700">
          <Lock className="size-3.5 shrink-0" aria-hidden="true" />
          Your file stays in this browser. Nothing is uploaded anywhere.
        </p>
        <Field label="Document name" htmlFor="doc-name">
          <TextInput id="doc-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="For example, Hire shop terms" />
        </Field>
        {error && (
          <div role="alert">
            <Notice tone="amber" icon={TriangleAlert}>
              {error}
            </Notice>
          </div>
        )}
        <AppButton icon={FilePlus2} onClick={add} className="w-full sm:w-auto">
          Add to the assistant
        </AppButton>
        {added && (
          <div role="status">
            <Notice tone="green" icon={MessageSquareText} title={`${added.title} is in the library`}>
              <p>The assistant can answer from it now{added.transient ? '.' : ', and it stays here when you come back today.'}</p>
              {added.transient && <p className="mt-1 font-medium">Too large to keep after you leave this page.</p>}
              {suggestions.length > 0 ? (
                <div className="mt-2 flex flex-col items-start gap-1.5">
                  {suggestions.map((q) => (
                    <button key={q} type="button" onClick={() => onAsk(q)} className="rounded-md text-left text-sm font-semibold break-words underline underline-offset-2 hover:no-underline">
                      Ask: {q}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-1">Ask about it on the Ask tab.</p>
              )}
            </Notice>
          </div>
        )}
      </div>
    </Panel>
  )
}

function DocModal({ doc, onClose }: { doc: Doc; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const rows = doc.table?.rows.filter((r) => !q || r.join(' ').toLowerCase().includes(q)) ?? []
  return (
    <Modal open onClose={onClose} title={doc.title} description={`${doc.label} · ${doc.origin === 'team' ? `${doc.sections?.length ?? 0} answers` : docSize(doc)}`} size="lg">
      {doc.table ? (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <label htmlFor="doc-search" className="sr-only">
              Search the price list
            </label>
            <TextInput id="doc-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products or codes" className="pl-9" />
          </div>
          <p className="text-xs text-slate-600" aria-live="polite">
            {rows.length} of {doc.table.rows.length} rows
          </p>
          <div className="relative hidden overflow-x-auto rounded-lg border border-slate-200 md:block">
            <table className="w-full min-w-[36rem]">
              <thead className="bg-slate-50">
                <tr>
                  {doc.table.columns.map((c) => (
                    <th key={c} className={th}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((cell, c) => (
                      <td key={c} className={cn(td, 'text-xs', c === 1 && 'font-medium text-slate-900')}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-2 md:hidden">
            {rows.map((r, i) => (
              <li key={i} className="rounded-lg border border-slate-200 p-3 text-sm">
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5">
                  {doc.table!.columns.map((c, ci) => (
                    <div key={c} className="contents">
                      <dt className="text-xs text-slate-600">{c}</dt>
                      <dd className="text-xs break-words text-slate-900">{r[ci] || '–'}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
          {rows.length === 0 && <p className="py-6 text-center text-sm text-slate-600">No rows match “{query}”.</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {(doc.sections ?? []).map((s) => (
            <section key={s.id}>
              <h3 className="text-sm font-semibold text-slate-900">{s.heading || doc.title}</h3>
              {s.paragraphs.map((p, i) => (
                <p key={i} className="mt-1 text-sm leading-relaxed break-words text-slate-700">
                  {p}
                </p>
              ))}
            </section>
          ))}
          {!doc.sections?.length && <p className="text-sm text-slate-600">No answers yet. Add one from Insights.</p>}
        </div>
      )}
    </Modal>
  )
}
