import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react'
import { cn } from '../lib/cn'
import { whatsappUrl } from '../lib/whatsapp'
import { WhatsAppIcon } from './WhatsAppIcon'

/* Buttons for the navy studio shell. Demo apps use their own light buttons (src/demos/ui.tsx). */

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition duration-150 disabled:cursor-not-allowed disabled:opacity-50'

const variants: Record<Variant, string> = {
  primary: 'bg-brand-gradient text-ink-950 glow-button hover:brightness-110 active:brightness-95',
  secondary:
    'border border-white/20 bg-white/5 text-white hover:border-brand-cyan/70 hover:bg-white/10 active:bg-white/5',
  ghost: 'text-mist-200 hover:bg-white/5 hover:text-white',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-[0.95rem]',
  lg: 'h-12 px-6 text-base',
}

function buttonClasses(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(base, variants[variant], sizes[size], className)
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export function Button({ variant, size, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />
}

interface LinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: Variant
  size?: Size
}

export function LinkButton({ variant, size, className, ...props }: LinkButtonProps) {
  return <a className={buttonClasses(variant, size, className)} {...props} />
}

interface WhatsAppButtonProps extends Omit<LinkButtonProps, 'href' | 'children'> {
  message: string
  label: string
  /** Hides the label visually on small screens and keeps it for screen readers. */
  iconOnlyOnMobile?: boolean
}

/** Opens WhatsApp chat with LIFELINE, with the message pre-filled. */
export function WhatsAppButton({ message, label, iconOnlyOnMobile, className, ...props }: WhatsAppButtonProps) {
  return (
    <LinkButton
      href={whatsappUrl(message)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(iconOnlyOnMobile && 'max-sm:size-10 max-sm:px-0', className)}
      {...props}
    >
      <WhatsAppIcon className="size-[1.15em] shrink-0" />
      <span className={cn(iconOnlyOnMobile && 'max-sm:sr-only')}>{label}</span>
      <span className="sr-only"> (opens WhatsApp)</span>
    </LinkButton>
  )
}
