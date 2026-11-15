import { ArrowDown, ArrowUp, ChevronDown, FlaskConical, Plus, Trash2, TriangleAlert, Zap } from 'lucide-react'
import { useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import { inputClass } from '../styles'
import { AppButton, Badge, Modal, Notice, SelectInput, TextInput, Toggle } from '../ui'
import { ACTIONS, ACTION_GROUPS, APPS, TRIGGERS } from './catalog'
import { AppTile, TemplateText } from './parts'
import type { ActionId, Step, TriggerId, Workflow } from './types'

interface Props {
  workflow: Workflow
  workflows: Workflow[]
  onSelect: (id: string) => void
  onChange: (workflow: Workflow) => void
  onAddStep: (action: ActionId, index: number) => void
  onTest: () => void
  onDelete: () => void
}

function unknownFields(text: string, trigger: TriggerId): string[] {
  const available = new Set(TRIGGERS[trigger].variables.map((v) => v.key))
  const found = [...text.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1])
  return [...new Set(found.filter((key) => !available.has(key)))]
}

export function BuilderScreen({ workflow, workflows, onSelect, onChange, onAddStep, onTest, onDelete }: Props) {
  const [openStep, setOpenStep] = useState<string | null>(workflow.steps[0]?.id ?? null)
  const [pickerAt, setPickerAt] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const trigger = TRIGGERS[workflow.trigger]
  const problems = workflow.steps.reduce(
    (count, step) => count + Object.values(step.config).reduce((n, value) => n + unknownFields(value, workflow.trigger).length, 0),
    0,
  )

  const updateStep = (id: string, config: Record<string, string>) =>
    onChange({ ...workflow, steps: workflow.steps.map((s) => (s.id === id ? { ...s, config } : s)) })

  const move = (index: number, delta: number) => {
    const steps = [...workflow.steps]
    const [moved] = steps.splice(index, 1)
    steps.splice(index + delta, 0, moved)
    onChange({ ...workflow, steps })
  }

  const remove = (id: string) => onChange({ ...workflow, steps: workflow.steps.filter((s) => s.id !== id) })

  return (
    <div className="grid grid-cols-1 gap-5 p-3 sm:p-5 lg:grid-cols-[1fr_17rem]">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="min-w-56 flex-1">
            <label htmlFor="wf-name" className="mb-1 block text-xs font-semibold text-slate-700">
              Workflow name
            </label>
            <TextInput id="wf-name" value={workflow.name} maxLength={70} onChange={(e) => onChange({ ...workflow, name: e.target.value })} />
          </div>
          <Toggle
            className="min-w-52"
            checked={workflow.active}
            onChange={(active) => onChange({ ...workflow, active })}
            label={workflow.active ? 'Active' : 'Paused'}
            description={workflow.active ? 'Runs automatically' : 'Won’t run until you turn it on'}
          />
        </div>

        <ol className="relative space-y-3 before:absolute before:top-6 before:bottom-6 before:left-[2.2rem] before:w-0.5 before:bg-slate-300">

          <li className="relative rounded-xl border-2 border-(--accent)/40 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AppTile app={trigger.app} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-(--accent-ink) uppercase">
                  <Zap className="size-3.5" aria-hidden="true" />
                  When this happens
                </p>
                <label htmlFor="wf-trigger" className="sr-only">
                  Trigger
                </label>
                <SelectInput
                  id="wf-trigger"
                  className="mt-1.5 font-medium"
                  value={workflow.trigger}
                  onChange={(e) => onChange({ ...workflow, trigger: e.target.value as TriggerId })}
                >
                  {Object.values(TRIGGERS).map((t) => (
                    <option key={t.id} value={t.id}>
                      {APPS[t.app].name}: {t.label}
                    </option>
                  ))}
                </SelectInput>
                <p className="mt-1.5 text-xs text-slate-600">{trigger.description}</p>
              </div>
            </div>
          </li>

          {workflow.steps.map((step, index) => (
            <StepCard
              key={step.id}
              step={step}
              index={index}
              count={workflow.steps.length}
              trigger={workflow.trigger}
              open={openStep === step.id}
              onToggle={() => setOpenStep(openStep === step.id ? null : step.id)}
              onChange={(config) => updateStep(step.id, config)}
              onMove={(delta) => move(index, delta)}
              onRemove={() => remove(step.id)}
              onAddAfter={() => setPickerAt(index + 1)}
            />
          ))}

          <li className="relative pl-12">
            <AppButton variant="secondary" icon={Plus} onClick={() => setPickerAt(workflow.steps.length)}>
              Add a step
            </AppButton>
          </li>
        </ol>
      </div>

      <aside className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Ready to try it?</p>
          <p className="mt-1 text-sm text-slate-600">A test run uses sample data and shows exactly what each step would do.</p>
          {problems > 0 && (
            <Notice tone="amber" icon={TriangleAlert} className="mt-3">
              {problems} {problems === 1 ? 'field uses' : 'fields use'} data this trigger doesn’t have. The test will show where.
            </Notice>
          )}
          <AppButton icon={FlaskConical} className="mt-3 w-full" onClick={onTest} disabled={!workflow.steps.length}>
            Run a test
          </AppButton>
          <p className="mt-2 text-xs text-slate-600">Changes save automatically.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <label htmlFor="wf-switch" className="text-sm font-semibold text-slate-900">
            Edit another workflow
          </label>
          <SelectInput id="wf-switch" className="mt-2" value={workflow.id} onChange={(e) => onSelect(e.target.value)}>
            {workflows.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </SelectInput>
          <AppButton variant="danger" size="sm" icon={Trash2} className="mt-3" onClick={() => setConfirmDelete(true)}>
            Delete this workflow
          </AppButton>
        </div>
      </aside>

      <Modal
        open={pickerAt !== null}
        onClose={() => setPickerAt(null)}
        title="Add a step"
        description="Choose what should happen next."
        size="lg"
      >
        <div className="space-y-5">
          {ACTION_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold tracking-wide text-slate-600 uppercase">{group.title}</h3>
              <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {group.actions.map((id) => {
                  const def = ACTIONS[id]
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => {
                          if (pickerAt !== null) onAddStep(id, pickerAt)
                          setPickerAt(null)
                        }}
                        className="flex w-full items-start gap-3 rounded-lg border border-slate-200 p-3 text-left transition hover:border-(--accent) hover:bg-(--accent-soft)"
                      >
                        <AppTile app={def.app} />
                        <span>
                          <span className="block text-sm font-semibold text-slate-900">{def.label}</span>
                          <span className="block text-xs text-slate-600">{def.description}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this workflow?"
        size="sm"
        footer={
          <>
            <AppButton variant="secondary" onClick={() => setConfirmDelete(false)}>
              Keep it
            </AppButton>
            <AppButton
              variant="danger"
              icon={Trash2}
              onClick={() => {
                setConfirmDelete(false)
                onDelete()
              }}
            >
              Delete
            </AppButton>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          “{workflow.name}” will stop running. You can bring it back with Reset demo.
        </p>
      </Modal>
    </div>
  )
}

interface StepCardProps {
  step: Step
  index: number
  count: number
  trigger: TriggerId
  open: boolean
  onToggle: () => void
  onChange: (config: Record<string, string>) => void
  onMove: (delta: number) => void
  onRemove: () => void
  onAddAfter: () => void
}

function StepCard({ step, index, count, trigger, open, onToggle, onChange, onMove, onRemove, onAddAfter }: StepCardProps) {
  const def = ACTIONS[step.action]
  const preview = step.config[def.fields.find((f) => f.templated)?.key ?? ''] ?? step.config[def.fields[0]?.key ?? ''] ?? ''
  const issues = Object.values(step.config).flatMap((value) => unknownFields(value, trigger))
  const panelId = `step-${step.id}`

  return (
    <li className="relative rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 p-4">
        <AppTile app={def.app} />
        <button type="button" aria-expanded={open} aria-controls={panelId} onClick={onToggle} className="min-w-0 flex-1 text-left">
          <span className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            Step {index + 1} · {APPS[def.app].name}
            {issues.length > 0 && <Badge tone="amber">Check fields</Badge>}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            {def.label}
            <ChevronDown className={cn('size-4 text-slate-500 transition', open && 'rotate-180')} aria-hidden="true" />
          </span>
          {!open && preview && <TemplateText text={preview.length > 110 ? `${preview.slice(0, 110)}…` : preview} className="mt-1 block text-xs text-slate-600" />}
        </button>
        <div className="flex shrink-0 gap-0.5">
          <IconButton label={`Move step ${index + 1} up`} disabled={index === 0} onClick={() => onMove(-1)} icon={ArrowUp} />
          <IconButton label={`Move step ${index + 1} down`} disabled={index === count - 1} onClick={() => onMove(1)} icon={ArrowDown} />
          <IconButton label={`Delete step ${index + 1}`} onClick={onRemove} icon={Trash2} />
        </div>
      </div>

      {open && (
        <div id={panelId} className="space-y-3 border-t border-slate-100 px-4 py-4">
          {def.fields.map((field) => (
            <FieldEditor
              key={field.key}
              id={`${step.id}-${field.key}`}
              label={field.label}
              kind={field.kind}
              options={field.key === 'field' ? TRIGGERS[trigger].variables.map((v) => v.key) : field.options}
              optionLabels={field.key === 'field' ? Object.fromEntries(TRIGGERS[trigger].variables.map((v) => [v.key, v.label])) : undefined}
              templated={field.templated}
              trigger={trigger}
              value={step.config[field.key] ?? ''}
              onChange={(value) => onChange({ ...step.config, [field.key]: value })}
            />
          ))}
          <button type="button" onClick={onAddAfter} className="inline-flex items-center gap-1 text-xs font-semibold text-(--accent-ink) hover:underline">
            <Plus className="size-3.5" aria-hidden="true" />
            Add a step after this one
          </button>
        </div>
      )}
    </li>
  )
}

function IconButton({
  label,
  icon: Icon,
  onClick,
  disabled,
}: {
  label: string
  icon: typeof Trash2
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30"
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  )
}

interface FieldEditorProps {
  id: string
  label: string
  kind: 'text' | 'textarea' | 'select'
  options?: string[]
  optionLabels?: Record<string, string>
  templated?: boolean
  trigger: TriggerId
  value: string
  onChange: (value: string) => void
}

function FieldEditor({ id, label, kind, options, optionLabels, templated, trigger, value, onChange }: FieldEditorProps) {
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  const unknown = unknownFields(value, trigger)

  const insert = (key: string) => {
    if (!key) return
    const el = ref.current
    const token = `{{${key}}}`
    const start = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? value.length
    onChange(value.slice(0, start) + token + value.slice(end))
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + token.length, start + token.length)
    })
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs font-semibold text-slate-700">
          {label}
        </label>
        {templated && (
          <>
            <label htmlFor={`${id}-insert`} className="sr-only">
              Insert a field into {label}
            </label>
            <select
              id={`${id}-insert`}
              value=""
              onChange={(e) => insert(e.target.value)}
              className="h-7 max-w-44 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700"
            >
              <option value="">+ Insert a field</option>
              {TRIGGERS[trigger].variables.map((v) => (
                <option key={v.key} value={v.key}>
                  {v.label}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
      {kind === 'select' ? (
        <SelectInput id={id} value={value} onChange={(e) => onChange(e.target.value)}>
          {(options ?? []).map((option) => (
            <option key={option} value={option}>
              {optionLabels?.[option] ?? option}
            </option>
          ))}
        </SelectInput>
      ) : kind === 'textarea' ? (
        <textarea
          ref={ref}
          id={id}
          value={value}
          rows={5}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputClass, 'w-full resize-y py-2 font-mono text-[0.8rem] leading-relaxed')}
        />
      ) : (
        <input ref={ref} id={id} value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputClass, 'h-10 w-full font-mono text-[0.8rem]')} />
      )}
      {unknown.length > 0 && (
        <p className="mt-1 text-xs font-medium text-amber-800">
          Not available from “{TRIGGERS[trigger].label}”: {unknown.map((k) => `{{${k}}}`).join(', ')}
        </p>
      )}
    </div>
  )
}
