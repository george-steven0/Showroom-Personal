import type { ReactNode } from 'react'
import { Skeleton, Tooltip } from 'antd'
import type { Tone } from './primitives'

const ICON_TONE: Record<Tone, string> = {
  neutral: 'bg-neutral-soft text-muted',
  primary: 'bg-primary-soft text-primary',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  accent: 'bg-accent-soft text-accent',
}

export interface KpiCardProps {
  label: string
  value: ReactNode
  icon?: ReactNode
  tone?: Tone
  footer?: ReactNode
  hint?: string
  loading?: boolean
}

/** The metric tile used on the dashboard, accounts and summary pages. */
export function KpiCard({ label, value, icon, tone = 'primary', footer, hint, loading = false }: KpiCardProps) {
  if (loading) {
    return (
      <div className="rounded-card border border-line bg-surface p-4 shadow-card">
        <Skeleton active title={false} paragraph={{ rows: 3, width: ['60%', '85%', '45%'] }} />
      </div>
    )
  }

  return (
    <div className="rounded-card border border-line bg-surface p-4 text-start shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[13px] font-medium text-muted">{label}</p>
            {hint && (
              <Tooltip title={hint}>
                <span className="cursor-help text-[11px] text-subtle" aria-hidden>
                  ⓘ
                </span>
              </Tooltip>
            )}
          </div>
          <p className="tnum mt-1.5 truncate text-[22px] leading-tight font-semibold text-ink">{value}</p>
        </div>
        {icon && (
          <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-base ${ICON_TONE[tone]}`} aria-hidden>
            {icon}
          </span>
        )}
      </div>

      {footer && <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">{footer}</div>}
    </div>
  )
}

export function KpiGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
}
