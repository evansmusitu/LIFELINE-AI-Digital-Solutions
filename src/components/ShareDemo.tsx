import { Link2, Share2 } from 'lucide-react'
import type { MouseEvent } from 'react'
import { cn } from '../lib/cn'
import {
  canUseShareSheet,
  copyDemoLink,
  demoShareUrl,
  openShareSheet,
  whatsappShareUrl,
  type SharedDemo,
} from '../lib/share'
import { Button, LinkButton } from './Button'
import { useToast } from './toast-context'
import { WhatsAppIcon } from './WhatsAppIcon'

function useCopyLink(demo: SharedDemo) {
  const toast = useToast()
  return async () => {
    if (await copyDemoLink(demo)) toast('Link copied. Paste it anywhere to share this demo.', 'success')
    else toast(`Your browser blocked copying. The link is ${demoShareUrl(demo)}`, 'info')
  }
}

/** "Know a business that needs this?" strip, shown right after the demo. */
export function ShareDemo({ demo, className }: { demo: SharedDemo; className?: string }) {
  const copyLink = useCopyLink(demo)
  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-2xl border border-white/10 bg-ink-900 p-5 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div>
        <h2 className="font-display text-lg font-semibold text-white">Know a business that needs this?</h2>
        <p className="mt-1 text-sm text-mist-200">Send them this demo. They can try it on their phone, no sign-up needed.</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <LinkButton href={whatsappShareUrl(demo)} target="_blank" rel="noopener noreferrer">
          <WhatsAppIcon className="size-[1.15em] shrink-0" />
          Share on WhatsApp
          <span className="sr-only"> (opens WhatsApp)</span>
        </LinkButton>
        <Button variant="secondary" onClick={() => void copyLink()}>
          <Link2 className="size-4" aria-hidden="true" />
          Copy link
        </Button>
      </div>
    </div>
  )
}

/**
 * Share icon for the phone call-to-action bar. Opens the phone's share sheet, which includes
 * WhatsApp chats and Status. Browsers without one open WhatsApp instead.
 */
export function ShareIconButton({ demo }: { demo: SharedDemo }) {
  const copyLink = useCopyLink(demo)

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // Decided inside the click, because the share sheet only opens from a direct tap.
    if (!canUseShareSheet(demo)) return
    event.preventDefault()
    // If the share menu fails to open, copy the link instead. Its message tells the visitor.
    void openShareSheet(demo).then((result) => {
      if (result === 'failed') void copyLink()
    })
  }

  return (
    <LinkButton
      href={whatsappShareUrl(demo)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      variant="secondary"
      className="size-11 shrink-0 px-0!"
      aria-label="Share this demo"
    >
      <Share2 className="size-5" aria-hidden="true" />
    </LinkButton>
  )
}
