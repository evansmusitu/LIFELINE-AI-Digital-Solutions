import { RotateCcw } from 'lucide-react'
import { AppButton, Notice, Panel, TextArea, Toggle } from '../ui'
import { QUESTIONS, QUESTION_ORDER } from './engine'
import type { QuestionId, Settings } from './types'

interface Props {
  settings: Settings
  onChange: (settings: Settings) => void
  onRestartChat: () => void
}

export function SettingsScreen({ settings, onChange, onRestartChat }: Props) {
  const enabledCount = QUESTION_ORDER.filter((q) => settings.questions[q]).length
  const setQuestion = (q: QuestionId, on: boolean) => onChange({ ...settings, questions: { ...settings.questions, [q]: on } })

  return (
    <div className="grid grid-cols-1 gap-4 p-3 sm:p-5 lg:grid-cols-2">
      <div className="space-y-4">
        <Panel title="Greeting" description="The first message visitors see. Written in your tone of voice.">
          <label htmlFor="greeting" className="sr-only">
            Greeting message
          </label>
          <TextArea
            id="greeting"
            value={settings.greeting}
            maxLength={300}
            onChange={(e) => onChange({ ...settings, greeting: e.target.value })}
          />
          <p className="mt-1 text-right text-xs text-slate-600 tabular-nums">{settings.greeting.length}/300</p>
        </Panel>

        <Panel title="Qualifying questions" description="Each answer adds points to the lead score, out of 100.">
          <ul className="space-y-4">
            {QUESTION_ORDER.map((q) => {
              const max = Math.max(...QUESTIONS[q].options.map((o) => o.points))
              const lastOne = settings.questions[q] && enabledCount === 1
              return (
                <li key={q}>
                  <Toggle
                    checked={settings.questions[q]}
                    onChange={(on) => !lastOne && setQuestion(q, on)}
                    label={QUESTIONS[q].prompt}
                    description={lastOne ? 'At least one question must stay on.' : `Worth up to ${max} points`}
                  />
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel title="Handoff rules" description="When the assistant brings in a person from your team.">
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="threshold" className="text-sm font-medium text-slate-900">
                Hot lead score
              </label>
              <span className="text-sm font-semibold text-(--accent-ink) tabular-nums">{settings.threshold} and above</span>
            </div>
            <input
              id="threshold"
              type="range"
              min={50}
              max={90}
              step={5}
              value={settings.threshold}
              aria-valuetext={`${settings.threshold} points`}
              onChange={(e) => onChange({ ...settings, threshold: Number(e.target.value) })}
              className="mt-3 w-full accent-(--accent)"
            />
            <p className="mt-1 text-xs text-slate-600">
              Hot leads go straight to a designer. Scores from 40 get a call booked. Below 40, the assistant sends the cost
              guide.
            </p>
          </div>
          <div className="mt-5 space-y-4 border-t border-slate-100 pt-4">
            <Toggle
              checked={settings.handoffOnRequest}
              onChange={(on) => onChange({ ...settings, handoffOnRequest: on })}
              label="Bring in a person when asked"
              description="For example, “can I speak to someone?”"
            />
            <Toggle
              checked={settings.afterHours}
              onChange={(on) => onChange({ ...settings, afterHours: on })}
              label="Pretend it’s after office hours"
              description="Office hours are Monday to Friday, 9:00 to 18:00 Gulf time. After hours, the assistant books a call instead."
            />
          </div>
        </Panel>

        <Notice tone="accent" title="Try your changes">
          <p>New settings apply to the next chat. Restart the website chat to test them.</p>
          <AppButton icon={RotateCcw} className="mt-3" onClick={onRestartChat}>
            Restart the website chat
          </AppButton>
        </Notice>
      </div>
    </div>
  )
}
