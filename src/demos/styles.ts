import type { CSSProperties } from 'react'
import { cn } from '../lib/cn'

/*
 * Shared class names and theme helpers for the sample businesses' apps.
 * Each business has its own accent colour, passed down as CSS variables, so the same
 * components can wear different brands. Every accent colour passes WCAG AA with white text.
 */

export interface Accent {
  base: string
  strong: string
  soft: string
  ink: string
}

export function accentStyle(accent: Accent): CSSProperties {
  return {
    '--accent': accent.base,
    '--accent-strong': accent.strong,
    '--accent-soft': accent.soft,
    '--accent-ink': accent.ink,
  } as CSSProperties
}

export type AppVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
export type AppSize = 'sm' | 'md'

const appBase =
  'inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-50'

const appVariants: Record<AppVariant, string> = {
  primary: 'bg-(--accent) text-white hover:bg-(--accent-strong)',
  secondary: 'border border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50',
  ghost: 'text-slate-700 hover:bg-slate-100',
  danger: 'border border-red-200 bg-white text-red-700 hover:bg-red-50',
  success: 'bg-emerald-700 text-white hover:bg-emerald-800',
}

const appSizes: Record<AppSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
}

/** Button classes, also usable on links. */
export function appButton(variant: AppVariant = 'primary', size: AppSize = 'md', className?: string) {
  return cn(appBase, appVariants[variant], appSizes[size], className)
}

/*
 * Form control base. It has no width, height or font size on purpose: Tailwind applies clashing
 * utilities in stylesheet order, not class order, so those are set by props instead.
 */
export const inputClass =
  'block rounded-lg border border-slate-300 bg-white px-3 text-slate-900 placeholder:text-slate-500 disabled:bg-slate-100 aria-invalid:border-red-500'

export const th = 'px-3 py-2 text-left text-xs font-semibold text-slate-600 whitespace-nowrap'
export const td = 'px-3 py-2.5 text-sm text-slate-800 align-middle'
