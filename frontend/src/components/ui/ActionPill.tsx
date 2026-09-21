import type { ReactNode } from 'react'

const TONE_CLASS = {
  success: 'bg-success-soft text-success ring-success/35 hover:bg-success hover:ring-success',
  warning: 'bg-warning-soft text-warning ring-warning/35 hover:bg-warning hover:ring-warning',
} as const

/** The primary row action (sell / record payment) — reads as a button, not a status tag, and sits beside the ⋯ menu. */
export function ActionPill({
  tone = 'success',
  icon,
  children,
  onClick,
}: {
  tone?: keyof typeof TONE_CLASS
  icon?: ReactNode
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3 text-[13px] font-semibold whitespace-nowrap shadow-xs ring-1 ring-inset transition-all duration-150 hover:text-white hover:shadow-sm active:scale-[0.97] ${TONE_CLASS[tone]}`}
    >
      {icon}
      {children}
    </button>
  )
}
