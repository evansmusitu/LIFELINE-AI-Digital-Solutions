import { Gauge } from 'lucide-react'
import { useState } from 'react'
import { money } from '../../lib/format'
import { Panel, TextInput, Toggle } from '../ui'
import { CATEGORIES } from './data'
import { etaRange, parsePrice } from './engine'
import { ItemIcon } from './parts'
import type { Area, MenuItem } from './types'

interface Props {
  items: MenuItem[]
  areas: Area[]
  busy: boolean
  onToggleItem: (id: string, available: boolean) => void
  onPrice: (id: string, price: number) => void
  onBusy: (on: boolean) => void
  onAreaFee: (id: string, fee: number) => void
  onAreaToggle: (id: string, on: boolean) => void
}

export function ManageScreen({ items, areas, busy, onToggleItem, onPrice, onBusy, onAreaFee, onAreaToggle }: Props) {
  const soldOut = items.filter((i) => !i.available).length
  const delivering = areas.filter((a) => a.on).length

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <Panel>
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700">
            <Gauge className="size-5" aria-hidden="true" />
          </span>
          <Toggle
            className="min-w-0 flex-1"
            label="Busy mode"
            description={
              busy
                ? 'On: customers see delivery times 15 minutes longer, so every promise is one you can keep.'
                : 'Adds 15 minutes to the delivery times customers see, for packed nights.'
            }
            checked={busy}
            onChange={onBusy}
          />
        </div>
      </Panel>

      <p className="text-sm text-slate-600">
        {items.length - soldOut} of {items.length} dishes available tonight
        {soldOut > 0 && ` · ${soldOut} sold out`} · delivering to {delivering} of {areas.length} areas. Changes show on the Menu straight away.
      </p>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {CATEGORIES.map((c) => (
          <Panel key={c.id} title={c.label} bodyClassName="py-1!">
            <ul className="divide-y divide-slate-100">
              {items
                .filter((i) => i.category === c.id)
                .map((item) => (
                  <li key={item.id} className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 py-3 sm:grid-cols-[auto_1fr_auto]">
                    <ItemIcon icon={item.icon} category={item.category} size="sm" />
                    <Toggle
                      label={item.name}
                      description={item.available ? 'Available tonight' : 'Sold out tonight'}
                      checked={item.available}
                      onChange={(on) => onToggleItem(item.id, on)}
                      ariaLabel={`${item.name} available tonight`}
                    />
                    <MoneyField
                      id={`rd-price-${item.id}`}
                      label={`Price of ${item.name}`}
                      value={item.price}
                      min={0.5}
                      max={99}
                      onSave={(price) => onPrice(item.id, price)}
                      className="col-start-2 sm:col-start-auto"
                    />
                  </li>
                ))}
            </ul>
          </Panel>
        ))}
      </div>

      <Panel
        title="Delivery areas"
        description={busy ? 'Times include 15 extra minutes for busy mode.' : 'Fee and delivery time customers see for each area.'}
        bodyClassName="py-1!"
      >
        <div
          aria-hidden="true"
          className="hidden grid-cols-[1fr_7rem_8rem_9rem] gap-3 border-b border-slate-100 py-2 text-xs font-semibold text-slate-600 md:grid"
        >
          <span>Area</span>
          <span>Delivery time</span>
          <span>Fee</span>
          <span>Status</span>
        </div>
        <ul className="divide-y divide-slate-100">
          {areas.map((area) => {
            const [lo, hi] = etaRange(area, busy)
            return (
              <li key={area.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 py-3 md:grid-cols-[1fr_7rem_8rem_9rem]">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{area.name}</p>
                  <p className="text-xs text-slate-600 md:hidden">
                    {lo}–{hi} min
                  </p>
                </div>
                <p className="hidden text-sm text-slate-700 tabular-nums md:block">
                  {lo}–{hi} min
                </p>
                <MoneyField
                  id={`rd-fee-${area.id}`}
                  label={`Delivery fee for ${area.name}`}
                  value={area.fee}
                  min={0}
                  max={20}
                  onSave={(fee) => onAreaFee(area.id, fee)}
                  className="row-start-2 md:row-start-auto"
                />
                <Toggle
                  label={area.on ? 'Delivering' : 'Paused'}
                  checked={area.on}
                  onChange={(on) => onAreaToggle(area.id, on)}
                  ariaLabel={`Delivering now to ${area.name}`}
                  className="col-start-2 row-start-1 md:col-start-auto md:row-start-auto"
                />
              </li>
            )
          })}
        </ul>
      </Panel>
    </div>
  )
}

function MoneyField({
  id,
  label,
  value,
  min,
  max,
  onSave,
  className,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  onSave: (value: number) => void
  className?: string
}) {
  const [text, setText] = useState(value.toFixed(2))
  const [error, setError] = useState('')

  const save = () => {
    const parsed = parsePrice(text, min, max)
    if (parsed === null) {
      setError(`Use an amount from ${money(min)} to ${money(max)}, like 7.50.`)
      return
    }
    setError('')
    setText(parsed.toFixed(2))
    if (parsed !== value) onSave(parsed)
  }

  return (
    <form
      noValidate
      className={className}
      onSubmit={(event) => {
        event.preventDefault()
        save()
      }}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative w-28">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-slate-600" aria-hidden="true">
          $
        </span>
        <TextInput
          id={id}
          inputMode="decimal"
          autoComplete="off"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setError('')
          }}
          onBlur={save}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="pl-6 tabular-nums"
        />
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1 max-w-56 text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </form>
  )
}
