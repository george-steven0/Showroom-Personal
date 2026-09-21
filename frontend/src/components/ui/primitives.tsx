import type { ReactNode } from 'react'
import { Skeleton } from 'antd'

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'rose'

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-neutral-soft text-muted ring-line',
  primary: 'bg-primary-soft text-primary-ink ring-primary/25',
  success: 'bg-success-soft text-success ring-success/25',
  warning: 'bg-warning-soft text-warning ring-warning/25',
  danger: 'bg-danger-soft text-danger ring-danger/25',
  info: 'bg-info-soft text-info ring-info/25',
  accent: 'bg-accent-soft text-accent ring-accent/25',
  rose: 'bg-rose-soft text-rose ring-rose/30',
}

const DOT_CLASS: Record<Tone, string> = {
  neutral: 'bg-neutral',
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  accent: 'bg-accent',
  rose: 'bg-rose',
}

export function StatusBadge({
  tone = 'neutral',
  children,
  dot = true,
  size = 'default',
}: {
  tone?: Tone
  children: ReactNode
  dot?: boolean
  size?: 'default' | 'small'
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap ring-1 ring-inset ${TONE_CLASS[tone]} ${
        size === 'small' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      }`}
    >
      {dot && <span className={`size-1.5 shrink-0 rounded-full ${DOT_CLASS[tone]}`} aria-hidden />}
      {children}
    </span>
  )
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className = '',
  bodyClassName = 'p-4 sm:p-5',
}: {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={`rounded-card border border-line bg-surface shadow-card ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
  children,
}: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold tracking-tight text-ink sm:text-[22px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  compact?: boolean
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'px-4 py-8' : 'px-6 py-14'}`}>
      {icon && (
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-surface-3 text-xl text-subtle">{icon}</div>
      )}
      <p className="text-[15px] font-medium text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Field({
  label,
  value,
  className = '',
  mono = false,
}: {
  label: ReactNode
  value: ReactNode
  className?: string
  mono?: boolean
}) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-medium tracking-wide text-subtle uppercase">{label}</dt>
      <dd className={`mt-1 text-sm font-medium break-words text-ink ${mono ? 'tnum ltr-code' : ''}`}>
        {value === '' || value == null ? <span className="text-subtle">—</span> : value}
      </dd>
    </div>
  )
}

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-card">
      <Skeleton active paragraph={{ rows }} />
    </div>
  )
}
