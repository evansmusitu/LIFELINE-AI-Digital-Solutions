import { CalendarHeart, CircleCheck, Coins, Copy, Gift, Info, MessageCircle, UserPlus } from 'lucide-react'
import { useToast } from '../../components/toast-context'
import { useBusinessName } from '../../lib/business-name'
import { num } from '../../lib/format'
import { appButton } from '../styles'
import { AppButton, Notice, Panel } from '../ui'
import {
  REFERRAL_POINTS,
  REWARDS,
  SALON,
  STARTER_POINTS,
  TIERS,
  clientSummary,
  dayLabel,
  inviteMessage,
  nextReward,
  pointsFor,
  whatsappShareLink,
} from './engine'
import { TierBadge, WhatsAppBubble } from './parts'
import type { Appointment, Client, RewardId } from './types'

interface Props {
  client: Client
  /** True while the visitor hasn't booked, so a sample client's card is shown. */
  sample: boolean
  appointments: Appointment[]
  onRedeem: (clientId: string, rewardId: RewardId) => void
}

export function LoyaltyScreen({ client, sample, appointments, onRedeem }: Props) {
  const toast = useToast()
  const salon = useBusinessName(SALON.short)
  const s = clientSummary(client)
  const next = nextReward(s.balance)
  const nextTier = TIERS.find((t) => t.from > s.earned)
  const upcoming = appointments.filter((a) => a.clientId === client.id && (a.status === 'Booked' || a.status === 'Checked in')).sort((a, b) => a.start - b.start)
  const latest = client.rewards[0]
  const invite = inviteMessage(client.referralCode)

  const copy = () => {
    navigator.clipboard
      .writeText(client.referralCode)
      .then(() => toast(`Code ${client.referralCode} copied.`, 'success'))
      .catch(() => toast(`Couldn’t copy here. The code is ${client.referralCode}.`, 'warning'))
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-3 sm:p-5">
      <p className="flex gap-2 text-xs text-slate-600">
        <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
        {sample
          ? 'This is a sample client’s card. Book a visit on the Book tab to see your own.'
          : `In this demo your card starts with ${STARTER_POINTS} sample points, so you can try a reward.`}
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.15fr_1fr]">
        <section aria-label="Loyalty card" className="rounded-2xl bg-linear-to-br from-(--accent) to-(--accent-ink) p-5 text-white shadow-md">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-wide text-white/90 uppercase">{salon} rewards</p>
              <p className="mt-0.5 text-lg font-bold break-words">{sample ? client.name : `${client.name} (you)`}</p>
            </div>
            <TierBadge tier={s.tier} />
          </div>
          <p className="mt-4 text-4xl font-bold tracking-tight tabular-nums">{num(s.balance)}</p>
          <p className="text-sm text-white/90">points to spend</p>
          <div className="mt-4">
            <div
              className="h-2 rounded-full bg-white/25"
              role="progressbar"
              aria-label={next ? `Progress to ${next.reward.name}` : 'All rewards unlocked'}
              aria-valuemin={0}
              aria-valuemax={next?.reward.points ?? 100}
              aria-valuenow={next ? s.balance : 100}
            >
              <div className="h-full rounded-full bg-white" style={{ width: `${next ? Math.min(100, (s.balance / next.reward.points) * 100) : 100}%` }} />
            </div>
            <p className="mt-1.5 text-sm">
              {next ? `Next reward: ${next.reward.name}, ${num(next.toGo)} points to go` : 'Enough points for any reward'}
            </p>
          </div>
          <ul className="mt-4 space-y-1 text-xs text-white/90">
            {nextTier && (
              <li>
                {num(nextTier.from - s.earned)} more points earned to reach {nextTier.tier}
              </li>
            )}
            {upcoming.slice(0, 2).map((a) => (
              <li key={a.id}>
                +{num(pointsFor(a.price, a.start))} points after the visit on {dayLabel(a.start)}
              </li>
            ))}
          </ul>
        </section>

        <Panel title="How points work">
          <ul className="space-y-3 text-sm text-slate-800">
            <li className="flex gap-2.5">
              <Coins className="mt-0.5 size-4 shrink-0 text-(--accent)" aria-hidden="true" />1 point for every $1 you spend
            </li>
            <li className="flex gap-2.5">
              <CalendarHeart className="mt-0.5 size-4 shrink-0 text-(--accent)" aria-hidden="true" />
              Double points on Tuesdays
            </li>
            <li className="flex gap-2.5">
              <UserPlus className="mt-0.5 size-4 shrink-0 text-(--accent)" aria-hidden="true" />
              {REFERRAL_POINTS} points for each friend who books with your code
            </li>
          </ul>
          <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-600">
            Bronze from 0, Silver from 500 and Gold from 1,500 points earned. Spending points never lowers your tier.
          </p>
        </Panel>
      </div>

      <Panel title="Rewards" description={`You have ${num(s.balance)} points`}>
        {latest && (
          <Notice tone="green" icon={CircleCheck} title={`Reward code ${latest.code}`} className="mb-3">
            {REWARDS.find((r) => r.id === latest.rewardId)?.name}. Show this code at the desk. It’s valid for 90 days.
          </Notice>
        )}
        <ul className="divide-y divide-slate-100">
          {REWARDS.map((r) => {
            const enough = s.balance >= r.points
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-(--accent-soft) text-(--accent-ink)">
                  <Gift className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-900">{r.name}</span>
                  <span className="block text-xs text-slate-600">{num(r.points)} points</span>
                </span>
                {!enough && <span className="text-xs font-medium text-slate-700">{num(r.points - s.balance)} more points</span>}
                <AppButton size="sm" disabled={!enough} onClick={() => onRedeem(client.id, r.id)} aria-label={`Redeem ${r.name}`}>
                  Redeem
                </AppButton>
              </li>
            )
          })}
        </ul>
        {client.rewards.length > 1 && (
          <p className="mt-2 text-xs text-slate-600">
            Earlier codes: {client.rewards.slice(1).map((c) => `${c.code} (${REWARDS.find((r) => r.id === c.rewardId)?.name})`).join(', ')}
          </p>
        )}
      </Panel>

      <Panel title="Invite a friend" description={`Friends get 10% off their first visit. You get ${REFERRAL_POINTS} points when they book.`}>
        <p className="text-xs font-semibold text-slate-600">Your code</p>
        <p className="font-mono text-2xl font-bold tracking-wide break-all text-slate-900">{client.referralCode}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={whatsappShareLink(invite)} target="_blank" rel="noopener noreferrer" className={appButton('primary', 'md')}>
            <MessageCircle className="size-4" aria-hidden="true" />
            Share on WhatsApp
          </a>
          <AppButton variant="secondary" icon={Copy} onClick={copy}>
            Copy code
          </AppButton>
        </div>
        <WhatsAppBubble text={invite} meta="Message preview" className="mt-3" />
        <p className="mt-2 text-xs text-slate-600">Opens WhatsApp in a new tab so you can pick a chat. Nothing is sent until you press send.</p>
      </Panel>
    </div>
  )
}
