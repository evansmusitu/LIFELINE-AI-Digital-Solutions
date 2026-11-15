import { createContext, useContext, useEffect } from 'react'

/*
 * Live outcome metrics (brief, section 7: "leads captured, hours saved, orders processed").
 * Each demo reports figures computed from its own state, and the demo page frame shows them,
 * so the numbers move as the visitor uses the demo.
 */

export interface DemoMetric {
  label: string
  value: string
  /** How the figure is worked out. Shown under the value. */
  detail?: string
}

export const MetricsContext = createContext<((metrics: DemoMetric[]) => void) | null>(null)

export function useDemoMetrics(metrics: DemoMetric[]) {
  const report = useContext(MetricsContext)
  const serialised = JSON.stringify(metrics)
  useEffect(() => {
    report?.(JSON.parse(serialised) as DemoMetric[])
  }, [serialised, report])
}
