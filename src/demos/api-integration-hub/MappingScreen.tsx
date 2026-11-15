import { ArrowRight, CircleCheck, CircleX, Save, TriangleAlert, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { AppButton, Badge, Field, Notice, Panel, SelectInput } from '../ui'
import { APPS, FLOWS, MAPPINGS, MAPPING_ORDER, TRANSFORMS } from './catalog'
import { POOLS } from './data'
import { applyMapping, duplicateTargets, keysWritten, maskDeep, missingRequired, recordFor, transformsFor } from './engine'
import { JsonBlock } from './parts'
import type { Json, MappingId, MappingRow, TransformId } from './types'

interface Props {
  mappings: Record<MappingId, MappingRow[]>
  selected: MappingId
  now: number
  onSelect: (id: MappingId) => void
  onSave: (id: MappingId, rows: MappingRow[]) => void
}

const same = (a: MappingRow[], b: MappingRow[]) => JSON.stringify(a) === JSON.stringify(b)

export function MappingScreen({ mappings, selected, now, onSelect, onSave }: Props) {
  const [drafts, setDrafts] = useState<Partial<Record<MappingId, MappingRow[]>>>({})
  const [errors, setErrors] = useState<string[] | null>(null)
  const def = MAPPINGS[selected]
  const app = APPS[def.app].name
  const saved = mappings[selected]
  const rows = drafts[selected] ?? saved
  const dirty = !same(rows, saved)
  const missing = missingRequired(rows, def.targets)
  const written = new Set(rows.flatMap(keysWritten))
  const record = recordFor(POOLS[def.flow][0], now, 1051)
  const shown = maskDeep(record) as Record<string, Json>
  const noun = FLOWS[def.flow].noun

  const update = (index: number, patch: Partial<MappingRow>) => {
    setErrors(null)
    setDrafts((d) => ({ ...d, [selected]: rows.map((r, i) => (i === index ? { ...r, ...patch } : r)) }))
  }

  const save = () => {
    const problems = [
      ...missing.map((f) => `${app} requires “${f.label}”. Map a field to it.`),
      ...duplicateTargets(rows, def.targets).map((f) => `Two fields are sent to “${f.label}”. Choose one.`),
    ]
    if (problems.length) {
      setErrors(problems)
      return
    }
    onSave(selected, rows)
    setDrafts((d) => ({ ...d, [selected]: undefined }))
    setErrors(null)
  }

  const discard = () => {
    setDrafts((d) => ({ ...d, [selected]: undefined }))
    setErrors(null)
  }

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <Panel>
        <Field label="Flow step" htmlFor="map-step" hint="Each step has its own rules for which fields go where.">
          <SelectInput
            id="map-step"
            value={selected}
            onChange={(e) => {
              setErrors(null)
              onSelect(e.target.value as MappingId)
            }}
          >
            {MAPPING_ORDER.map((id) => (
              <option key={id} value={id}>
                {MAPPINGS[id].label}
                {missingRequired(mappings[id], MAPPINGS[id].targets).length ? ' (needs a fix)' : ''}
              </option>
            ))}
          </SelectInput>
        </Field>
      </Panel>

      {missing.length ? (
        <Notice tone="amber" icon={TriangleAlert} title={`${app} needs a field that isn’t mapped`}>
          {selected === 'enquiry-crm' && missing.some((f) => f.key === 'desired_move_in') && 'The form’s move-in question changed at 9:30 AM and the new Move-in date field isn’t mapped. '}
          {app} requires {missing.map((f) => `“${f.label}”`).join(' and ')}, so new {noun === 'enquiry' ? 'enquiries' : `${noun}s`} fail at {app} until you map{' '}
          {missing.length === 1 ? 'it' : 'them'}.
        </Notice>
      ) : dirty ? (
        <Notice tone="accent" icon={CircleCheck}>
          Everything {app} requires is mapped. Save the mapping to use it for new events.
        </Notice>
      ) : (
        <Notice tone="green" icon={CircleCheck}>
          Everything {app} requires is mapped.
        </Notice>
      )}

      <Panel
        title={`${def.sourceName} → ${app}`}
        description="Choose where each field goes, and how to change it on the way."
        action={dirty ? <Badge tone="amber">Unsaved changes</Badge> : undefined}
        bodyClassName="p-0!"
      >
        <div className="flex flex-wrap gap-1.5 border-b border-slate-100 px-4 py-3" aria-label={`Fields ${app} requires`} role="group">
          <span className="mr-1 self-center text-xs font-semibold text-slate-700">Required:</span>
          {def.targets
            .filter((f) => f.required)
            .map((f) =>
              written.has(f.key) ? (
                <Badge key={f.key} tone="green" icon={CircleCheck}>
                  {f.label}
                </Badge>
              ) : (
                <Badge key={f.key} tone="red" icon={CircleX}>
                  {f.label}: not mapped
                </Badge>
              ),
            )}
        </div>

        <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 md:grid">
          <span>From the {def.sourceName.toLowerCase()}</span>
          <span>Send to</span>
          <span>Change before sending</span>
        </div>
        <ul className="divide-y divide-slate-100">
          {rows.map((r, index) => {
            const source = def.sources.find((s) => s.key === r.source)
            if (!source) return null
            const target = def.targets.find((t) => t.key === r.target)
            const options = transformsFor(source.kind, def.targets)
            const id = `map-${selected}-${r.source}`
            const value = shown[r.source]
            return (
              <li key={r.source} className="grid grid-cols-1 gap-2.5 px-4 py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] md:items-start md:gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-slate-900">
                    {source.label}
                    {source.note && <Badge tone="amber">{source.note}</Badge>}
                    <ArrowRight className="size-3.5 text-slate-500 md:hidden" aria-hidden="true" />
                  </p>
                  <p className="truncate font-mono text-xs text-slate-600">{value === undefined ? 'empty' : String(value)}</p>
                </div>
                <div className="min-w-0">
                  <label htmlFor={`${id}-to`} className="mb-1 block text-xs font-semibold text-slate-700 md:sr-only">
                    Send {source.label} to
                  </label>
                  <SelectInput id={`${id}-to`} value={r.target} onChange={(e) => update(index, { target: e.target.value })}>
                    {r.transform === 'split' ? (
                      <option value="first_name">First name + Last name</option>
                    ) : (
                      def.targets.map((t) => (
                        <option key={t.key} value={t.key}>
                          {t.label}
                          {t.required ? ' (required)' : ''}
                        </option>
                      ))
                    )}
                    <option value="">Don’t send</option>
                  </SelectInput>
                  {(target?.required || r.transform === 'split') && r.target && <p className="mt-1 text-xs font-medium text-slate-700">Required by {app}</p>}
                </div>
                <div className="min-w-0">
                  <label htmlFor={`${id}-how`} className="mb-1 block text-xs font-semibold text-slate-700 md:sr-only">
                    Change {source.label} before sending
                  </label>
                  <SelectInput
                    id={`${id}-how`}
                    value={r.transform}
                    disabled={options.length < 2}
                    onChange={(e) => {
                      const transform = e.target.value as TransformId
                      update(index, transform === 'split' ? { transform, target: r.target ? 'first_name' : '' } : { transform })
                    }}
                  >
                    {options.map((t) => (
                      <option key={t} value={t}>
                        {TRANSFORMS[t].label}
                      </option>
                    ))}
                  </SelectInput>
                </div>
              </li>
            )
          })}
        </ul>

        <div className="space-y-3 border-t border-slate-100 px-4 py-3">
          {errors && (
            <div role="alert">
              <Notice tone="red" icon={CircleX} title="The mapping wasn’t saved">
                <ul className="list-disc pl-4">
                  {errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </Notice>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <AppButton icon={Save} onClick={save} disabled={!dirty}>
              Save mapping
            </AppButton>
            {dirty && (
              <AppButton variant="ghost" icon={Undo2} onClick={discard}>
                Discard changes
              </AppButton>
            )}
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Sample record" description={`What the ${def.sourceName.toLowerCase()} sends the hub`}>
          <JsonBlock label="Sample record (sensitive values masked)" value={shown} />
        </Panel>
        <Panel title={`What ${app} receives`} description="Updates as you change the mapping">
          <JsonBlock label={`Sent to ${app}`} value={maskDeep(applyMapping(record, rows))} />
          {missing.length > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-700">
              <CircleX className="size-3.5 shrink-0" aria-hidden="true" />
              Missing: {missing.map((f) => f.key).join(', ')} (required)
            </p>
          )}
        </Panel>
      </div>
    </div>
  )
}
