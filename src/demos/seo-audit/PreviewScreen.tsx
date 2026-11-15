import { Monitor, Save, Smartphone, Sparkles, TriangleAlert, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/cn'
import { AppButton, Badge, Field, Panel, Segmented, SelectInput, TextArea, TextInput } from '../ui'
import { BUSINESS, PREVIEW_PAGES, type PreviewPageId } from './data'
import { breadcrumb, cleanText, previewDescription, previewTitle, snippetChecks, type PreviewText } from './engine'
import { CheckRow } from './parts'
import type { Device, Site } from './types'

interface Props {
  site: Site
  pageId: PreviewPageId
  onPage: (id: PreviewPageId) => void
  onSave: (pageId: string, title: string, description: string) => void
}

interface Draft {
  title: string
  description: string
}

function Counter({ id, text, emptyNote }: { id: string; text: PreviewText; emptyNote: string }) {
  return (
    <p id={id} className={cn('mt-1 flex items-center gap-1 text-xs', text.over ? 'font-medium text-amber-800' : 'text-slate-600')}>
      {text.over && <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />}
      <span>
        {text.length} of {text.limit} characters
        {text.over && ' · too long'}
        {!text.length && ` · ${emptyNote}`}
      </span>
    </p>
  )
}

export function PreviewScreen({ site, pageId, onPage, onSave }: Props) {
  const [device, setDevice] = useState<Device>('phone')
  const [drafts, setDrafts] = useState<Partial<Record<PreviewPageId, Draft>>>({})
  const config = PREVIEW_PAGES.find((p) => p.id === pageId) ?? PREVIEW_PAGES[0]
  const page = site.pages.find((p) => p.id === config.id)
  if (!page) return null

  const isDirty = (id: PreviewPageId) => {
    const d = drafts[id]
    const p = site.pages.find((x) => x.id === id)
    return Boolean(d && p && (cleanText(d.title) !== p.title || cleanText(d.description) !== p.description))
  }
  const draft = drafts[config.id] ?? { title: page.title, description: page.description }
  const dirty = isDirty(config.id)
  // Lengths and limits are the same on every device. Only the cut-off point in the preview changes.
  const title = previewTitle(draft.title, device)
  const description = previewDescription(draft.description, device)
  const checks = snippetChecks(site, page.id, draft.title, draft.description, config.terms)
  const passed = checks.filter((c) => c.pass).length

  const update = (patch: Partial<Draft>) => setDrafts((d) => ({ ...d, [config.id]: { ...draft, ...patch } }))
  const discard = () =>
    setDrafts((d) => {
      const next = { ...d }
      delete next[config.id]
      return next
    })
  const save = () => {
    if (!cleanText(draft.title)) return
    onSave(page.id, cleanText(draft.title), cleanText(draft.description))
    discard()
  }

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Page" htmlFor="seo-preview-page" className="min-w-0 sm:w-80">
          <SelectInput id="seo-preview-page" value={config.id} onChange={(e) => onPage(e.target.value as PreviewPageId)}>
            {PREVIEW_PAGES.map((p) => (
              <option key={p.id} value={p.id}>
                {site.pages.find((x) => x.id === p.id)?.name ?? p.id}
                {isDirty(p.id) ? ' (unsaved changes)' : ''}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Segmented
          label="Preview on"
          value={device}
          onChange={setDevice}
          options={[
            { value: 'phone', label: 'Phone', icon: Smartphone },
            { value: 'desktop', label: 'Desktop', icon: Monitor },
          ]}
          className="w-full sm:w-auto"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <Panel
          title="How it looks in search results"
          description={device === 'phone' ? 'Phone results show a little more of the title and less of the description.' : 'Desktop results'}
          className="lg:sticky lg:top-4 lg:order-2"
        >
          <div
            className={cn(
              'mx-auto w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm motion-safe:transition-[max-width]',
              device === 'phone' ? 'max-w-[23rem]' : 'max-w-[40rem]',
            )}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="grid size-7 shrink-0 place-items-center rounded-full bg-(--accent-soft) text-xs font-bold text-(--accent-ink)"
                aria-hidden="true"
              >
                A
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm text-slate-900">{BUSINESS.name}</p>
                <p className="truncate text-xs text-slate-600">{breadcrumb(site.domain, page.path)}</p>
              </div>
            </div>
            <p className={cn('mt-2 break-words text-blue-800', device === 'phone' ? 'text-lg leading-snug' : 'text-xl leading-snug')}>
              {title.text || <span className="text-slate-600 italic">No title</span>}
            </p>
            {description.text ? (
              <p className="mt-1 text-sm break-words text-slate-700">{description.text}</p>
            ) : (
              <p className="mt-1 text-sm text-slate-600 italic">No description, so search engines will show some text from the page instead.</p>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {title.truncated && <Badge tone="amber">Title cut off on {device === 'phone' ? 'phones' : 'desktop'}</Badge>}
            {description.truncated && <Badge tone="amber">Description cut off</Badge>}
            {!title.truncated && !description.truncated && title.text && <Badge tone="green">Shows in full</Badge>}
          </div>
          <p className="mt-3 text-xs text-slate-600">A preview of the usual layout. Search engines sometimes rewrite titles.</p>
        </Panel>

        <Panel title={`Edit: ${page.name}`} description={page.path} className="lg:order-1">
          <div className="space-y-4">
            <div>
              <label htmlFor="seo-title" className="mb-1 block text-xs font-semibold text-slate-700">
                Title
              </label>
              <TextInput
                id="seo-title"
                value={draft.title}
                onChange={(e) => update({ title: e.target.value })}
                aria-describedby="seo-title-count"
                aria-invalid={!title.length ? true : undefined}
              />
              <Counter id="seo-title-count" text={title} emptyNote="add a title to save" />
            </div>
            <div>
              <label htmlFor="seo-description" className="mb-1 block text-xs font-semibold text-slate-700">
                Description
              </label>
              <TextArea
                id="seo-description"
                rows={4}
                value={draft.description}
                onChange={(e) => update({ description: e.target.value })}
                aria-describedby="seo-description-count"
              />
              <Counter id="seo-description-count" text={description} emptyNote="search engines will pick text from the page" />
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-700">
                Checks <span className="font-normal text-slate-600">({passed} of {checks.length} passed)</span>
              </p>
              <ul className="mt-1.5 space-y-1">
                {checks.map((c) => (
                  <CheckRow key={c.id} pass={c.pass} label={c.label} />
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-2">
              <AppButton icon={Save} onClick={save} disabled={!dirty || !title.length}>
                Save changes
              </AppButton>
              <AppButton variant="secondary" icon={Sparkles} onClick={() => update(config.suggestion)}>
                Suggest with AI
              </AppButton>
              {dirty && (
                <AppButton variant="ghost" icon={Undo2} onClick={discard}>
                  Undo changes
                </AppButton>
              )}
            </div>
            <p className="text-xs text-slate-600">AI suggestions are pre-written in this demo. Saved changes are checked in the next audit.</p>
          </div>
        </Panel>
      </div>
    </div>
  )
}
