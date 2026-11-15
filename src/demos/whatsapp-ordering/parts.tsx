import { Beef, Cake, CakeSlice, Citrus, Coffee, Cookie, Croissant, CupSoda, Leaf, Sandwich, Wheat, type LucideIcon } from 'lucide-react'
import { Fragment, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import type { CategoryId, IconName } from './types'

const ICONS: Record<IconName, LucideIcon> = {
  wheat: Wheat,
  croissant: Croissant,
  cake: Cake,
  'cake-slice': CakeSlice,
  cookie: Cookie,
  sandwich: Sandwich,
  beef: Beef,
  leaf: Leaf,
  coffee: Coffee,
  cup: CupSoda,
  citrus: Citrus,
}

const TILES: Record<CategoryId, string> = {
  bread: 'bg-amber-50 text-amber-700',
  pastry: 'bg-orange-50 text-orange-700',
  cake: 'bg-pink-50 text-pink-700',
  savoury: 'bg-emerald-50 text-emerald-700',
  drinks: 'bg-sky-50 text-sky-700',
}

export function ProductIcon({ icon, category, size = 'md' }: { icon: IconName; category: CategoryId; size?: 'sm' | 'md' }) {
  const Icon = ICONS[icon]
  return (
    <span className={cn('grid shrink-0 place-items-center rounded-xl', TILES[category], size === 'sm' ? 'size-10' : 'size-14')}>
      <Icon className={size === 'sm' ? 'size-5' : 'size-7'} aria-hidden="true" />
    </span>
  )
}

/** Renders WhatsApp-style *bold* text and keeps line breaks. */
export function WhatsAppText({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {line.split(/(\*[^*]+\*)/g).map((part, j) =>
            /^\*[^*]+\*$/.test(part) ? <strong key={j}>{part.slice(1, -1)}</strong> : <Fragment key={j}>{part}</Fragment>,
          )}
        </Fragment>
      ))}
    </>
  )
}

/** A phone showing a WhatsApp chat, used to preview order messages. */
export function PhoneChat({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-[2rem] border-8 border-slate-900 bg-[#efeae2] shadow-xl">
      <div className="flex items-center gap-3 bg-[#075e54] px-4 py-3 text-white">
        <span className="grid size-9 place-items-center rounded-full bg-white/15 text-sm font-bold" aria-hidden="true">
          JR
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="text-xs text-white/85">{subtitle}</p>
        </div>
      </div>
      <div className="max-h-[30rem] space-y-2 overflow-y-auto p-3">{children}</div>
    </div>
  )
}
