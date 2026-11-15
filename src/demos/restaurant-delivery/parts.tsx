import {
  Beef,
  Bike,
  CakeSlice,
  Citrus,
  Coffee,
  Cookie,
  CookingPot,
  CupSoda,
  Drumstick,
  Fish,
  Flame,
  Globe,
  Hourglass,
  Leaf,
  Nut,
  Phone,
  Salad,
  Sandwich,
  Smartphone,
  Soup,
  StickyNote,
  Store,
  Timer,
  TriangleAlert,
  UtensilsCrossed,
  Wheat,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { clockTime, money } from '../../lib/format'
import { Badge } from '../ui'
import { BUSINESS } from './data'
import { optionSummary, timerTone } from './engine'
import type { Area, CategoryId, Channel, IconName, Message, Order, OrderLine, Tag } from './types'

const ICONS: Record<IconName, LucideIcon> = {
  soup: Soup,
  salad: Salad,
  beef: Beef,
  drumstick: Drumstick,
  flame: Flame,
  fish: Fish,
  sandwich: Sandwich,
  wheat: Wheat,
  pot: CookingPot,
  leaf: Leaf,
  cake: CakeSlice,
  cookie: Cookie,
  coffee: Coffee,
  citrus: Citrus,
  cup: CupSoda,
}

const TILES: Record<CategoryId, string> = {
  mezze: 'bg-lime-50 text-lime-800',
  grills: 'bg-orange-50 text-orange-700',
  wraps: 'bg-amber-50 text-amber-800',
  rice: 'bg-yellow-50 text-yellow-800',
  sides: 'bg-emerald-50 text-emerald-700',
  desserts: 'bg-rose-50 text-rose-700',
  drinks: 'bg-sky-50 text-sky-700',
}

export function ItemIcon({ icon, category, size = 'md' }: { icon: IconName; category: CategoryId; size?: 'sm' | 'md' }) {
  const Icon = ICONS[icon]
  return (
    <span className={cn('grid shrink-0 place-items-center rounded-xl', TILES[category], size === 'sm' ? 'size-9' : 'size-14')}>
      <Icon className={size === 'sm' ? 'size-4' : 'size-7'} aria-hidden="true" />
    </span>
  )
}

const TAG_STYLE: Record<Tag, { tone: 'green' | 'red' | 'amber'; icon: LucideIcon }> = {
  Vegetarian: { tone: 'green', icon: Leaf },
  Vegan: { tone: 'green', icon: Leaf },
  Spicy: { tone: 'red', icon: Flame },
  'Contains nuts': { tone: 'amber', icon: Nut },
}

export function TagBadge({ tag }: { tag: Tag }) {
  const { tone, icon } = TAG_STYLE[tag]
  return (
    <Badge tone={tone} icon={icon}>
      {tag}
    </Badge>
  )
}

const CHANNEL_ICONS: Record<Channel, LucideIcon> = { App: Smartphone, Website: Globe, Phone, 'Dine-in': UtensilsCrossed }

export function ChannelTag({ channel }: { channel: Channel }) {
  const Icon = CHANNEL_ICONS[channel]
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-600">
      <Icon className="size-3.5" aria-hidden="true" />
      {channel === 'Dine-in' ? 'Dine-in' : `${channel} order`}
    </span>
  )
}

export function ModeBadge({ order, areas }: { order: Pick<Order, 'mode' | 'areaId' | 'table'>; areas: Area[] }) {
  if (order.mode === 'delivery')
    return (
      <Badge tone="blue" icon={Bike}>
        Delivery · {areas.find((a) => a.id === order.areaId)?.name ?? 'Abu Dhabi'}
      </Badge>
    )
  if (order.mode === 'pickup')
    return (
      <Badge tone="violet" icon={Store}>
        Pickup
      </Badge>
    )
  return (
    <Badge tone="neutral" icon={UtensilsCrossed}>
      Table {order.table}
    </Badge>
  )
}

/** Minutes since the ticket came in. Amber from 12 min, red from 20, with an icon change so it isn't colour alone. */
export function TimerPill({ minutes }: { minutes: number }) {
  const tone = timerTone(minutes)
  const Icon = tone === 'red' ? TriangleAlert : tone === 'amber' ? Hourglass : Timer
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ring-1 ring-inset',
        tone === 'red' && 'bg-red-50 text-red-700 ring-red-200',
        tone === 'amber' && 'bg-amber-50 text-amber-800 ring-amber-200',
        tone === 'normal' && 'bg-slate-100 text-slate-700 ring-slate-200',
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {minutes} min
      {tone === 'red' && ' · late'}
      <span className="sr-only">{tone === 'amber' ? ' since received, getting slow' : ' since received'}</span>
    </span>
  )
}

export function NoteBadge({ text }: { text: string }) {
  const allergy = /allerg/i.test(text)
  return (
    <Badge tone={allergy ? 'red' : 'amber'} icon={allergy ? TriangleAlert : StickyNote} className="whitespace-normal! break-words">
      {text}
    </Badge>
  )
}

export function OrderLines({ lines, prices = false }: { lines: OrderLine[]; prices?: boolean }) {
  return (
    <ul className="space-y-2">
      {lines.map((line, i) => {
        const options = optionSummary(line.options)
        return (
          <li key={`${line.itemId}-${i}`} className="text-sm">
            <div className="flex gap-2">
              <span className="w-7 shrink-0 font-bold text-slate-900 tabular-nums">{line.qty} ×</span>
              <span className="min-w-0 flex-1 font-medium text-slate-900">{line.name}</span>
              {prices && <span className="shrink-0 text-slate-700 tabular-nums">{money(line.unit * line.qty)}</span>}
            </div>
            {(options.length > 0 || line.options.notes) && (
              <div className="mt-0.5 space-y-1 pl-9">
                {options.length > 0 && <p className="text-xs text-slate-600">{options.join(' · ')}</p>}
                {line.options.notes && <NoteBadge text={line.options.notes} />}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** The order updates as the customer gets them on WhatsApp or SMS. */
export function MessageThread({ messages }: { messages: Message[] }) {
  if (!messages.length) return <p className="text-sm text-slate-600">No messages for this order yet.</p>
  return (
    <ol className="space-y-2 rounded-xl bg-[#efeae2] p-3">
      {messages.map((m, i) => (
        <li key={i} className="max-w-[92%] rounded-lg rounded-tl-none bg-white px-3 py-2 text-[0.82rem] leading-relaxed text-slate-900 shadow-sm">
          <p className="text-[0.7rem] font-semibold text-emerald-800">{BUSINESS.name}</p>
          <p className="break-words">{m.text}</p>
          <p className="mt-0.5 text-right text-[0.68rem] text-slate-600 tabular-nums">{clockTime(m.at, BUSINESS.locale)}</p>
        </li>
      ))}
    </ol>
  )
}

/** A dialog that slides up from the bottom on phones. Native <dialog>, so focus and Escape work. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      className="mx-auto mt-auto mb-0 max-h-[92dvh] w-full max-w-lg overflow-hidden rounded-t-2xl bg-white p-0 text-slate-900 shadow-2xl"
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <h2 id={titleId} className="text-base font-semibold text-slate-900">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-1 grid size-9 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="overflow-y-auto overscroll-contain">{children}</div>
        </div>
      )}
    </dialog>
  )
}
