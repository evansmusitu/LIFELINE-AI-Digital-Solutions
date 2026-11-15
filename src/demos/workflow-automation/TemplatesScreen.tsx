import { ChevronRight, Plus } from 'lucide-react'
import { Fragment } from 'react'
import { AppButton, Badge } from '../ui'
import { ACTIONS, TEMPLATES, TRIGGERS, type Template } from './catalog'
import { AppTile } from './parts'

interface Props {
  onUse: (template: Template) => void
  onBlank: () => void
}

export function TemplatesScreen({ onUse, onBlank }: Props) {
  return (
    <div className="space-y-4 p-3 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-700">Start from a ready-made workflow and adjust it, or build your own.</p>
        <AppButton variant="secondary" icon={Plus} onClick={onBlank}>
          Start from scratch
        </AppButton>
      </div>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {TEMPLATES.map((template) => (
          <li key={template.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <Badge tone="accent" className="self-start">
              {template.category}
            </Badge>
            <p className="mt-3 font-semibold text-slate-900">{template.name}</p>
            <p className="mt-1 text-sm text-slate-600">{template.description}</p>
            <ol className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="Steps">
              <li>
                <AppTile app={TRIGGERS[template.trigger].app} size="sm" />
              </li>
              {template.steps.map((step, index) => (
                <Fragment key={index}>
                  <li aria-hidden="true">
                    <ChevronRight className="size-3.5 text-slate-400" />
                  </li>
                  <li>
                    <AppTile app={ACTIONS[step.action].app} size="sm" />
                  </li>
                </Fragment>
              ))}
            </ol>
            <p className="mt-3 text-xs text-slate-600">Saves about {template.minutesPerRun} minutes each time it runs.</p>
            <div className="mt-auto pt-4">
              <AppButton size="sm" onClick={() => onUse(template)} aria-label={`Use the ${template.name} template`}>
                Use this template
              </AppButton>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
