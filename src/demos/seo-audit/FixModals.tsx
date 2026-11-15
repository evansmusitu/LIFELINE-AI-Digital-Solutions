import { Check, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/cn'
import { AppButton, Modal, Notice, TextArea } from '../ui'
import { altSuggestions, DESCRIPTION_SUGGESTIONS } from './data'
import { cleanText, DESCRIPTION_LIMIT } from './engine'
import type { Site } from './types'

export function DescriptionsModal({
  site,
  onClose,
  onSave,
}: {
  site: Site
  onClose: () => void
  onSave: (values: Record<string, string>) => void
}) {
  const [missing] = useState(() => site.pages.filter((p) => !p.description.trim()))
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(missing.map((p) => [p.id, DESCRIPTION_SUGGESTIONS[p.id] ?? ''])),
  )
  const filled = missing.filter((p) => cleanText(values[p.id] ?? ''))

  const save = () => onSave(Object.fromEntries(filled.map((p) => [p.id, cleanText(values[p.id])])))

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Write missing descriptions"
      description={`${missing.length} ${missing.length === 1 ? 'page needs' : 'pages need'} one. Edit any suggestion before you save.`}
      footer={
        <>
          <AppButton variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton icon={Check} onClick={save} disabled={!filled.length}>
            Use these descriptions
          </AppButton>
        </>
      }
    >
      <Notice tone="accent" icon={Sparkles}>
        AI writes these from each page’s text. In this demo they’re pre-written.
      </Notice>
      <ul className="mt-4 space-y-5">
        {missing.map((page) => {
          const length = cleanText(values[page.id] ?? '').length
          const over = length > DESCRIPTION_LIMIT
          return (
            <li key={page.id}>
              <label htmlFor={`seo-desc-${page.id}`} className="block text-sm font-semibold text-slate-900">
                {page.name}
              </label>
              <p className="text-xs break-all text-slate-600">{page.path}</p>
              <TextArea
                id={`seo-desc-${page.id}`}
                rows={3}
                value={values[page.id] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [page.id]: e.target.value }))}
                aria-describedby={`seo-desc-${page.id}-count`}
                className="mt-1.5"
              />
              <p
                id={`seo-desc-${page.id}-count`}
                className={cn('mt-1 text-xs', over ? 'font-medium text-amber-800' : 'text-slate-600')}
              >
                {length} of {DESCRIPTION_LIMIT} characters
                {over && ' · too long, search results will cut it off'}
                {!length && ' · left empty, this page stays on the fix list'}
              </p>
            </li>
          )
        })}
      </ul>
    </Modal>
  )
}

export function AltTextModal({ site, onClose, onAccept }: { site: Site; onClose: () => void; onAccept: (count: number) => void }) {
  const items = altSuggestions(site)
  const pages = site.pages.filter((p) => items.some((i) => i.pageId === p.id))

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Add alt text"
      description={`${items.length} images on ${pages.length} pages, each with a suggested description.`}
      footer={
        <>
          <AppButton variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton icon={Check} onClick={() => onAccept(items.length)} disabled={!items.length}>
            Accept all {items.length}
          </AppButton>
        </>
      }
    >
      <Notice tone="accent" icon={Sparkles}>
        AI describes each photo. In this demo the suggestions are pre-written.
      </Notice>
      <ul className="mt-4 space-y-4">
        {pages.map((page) => (
          <li key={page.id}>
            <p className="text-sm font-semibold text-slate-900">
              {page.name} <span className="font-normal break-all text-slate-600">{page.path}</span>
            </p>
            <ul className="mt-1.5 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {items
                .filter((i) => i.pageId === page.id)
                .map((item) => (
                  <li key={item.key} className="px-3 py-2">
                    <p className="font-mono text-xs break-all text-slate-600">{item.file}</p>
                    <p className="text-sm text-slate-900">{item.alt}</p>
                  </li>
                ))}
            </ul>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
