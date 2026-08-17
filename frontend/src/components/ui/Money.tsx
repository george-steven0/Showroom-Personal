import { formatMoney } from '@/lib/format'

export interface MoneyProps {
  value: number | null | undefined
  compact?: boolean
  withSymbol?: boolean
  /** Colours negative red / positive green — used for capital and profit. */
  signed?: boolean
  className?: string
  strong?: boolean
}

export function Money({ value, compact = false, withSymbol = true, signed = false, className = '', strong = false }: MoneyProps) {
  const amount = Number(value ?? 0)
  const tone = signed ? (amount < 0 ? 'text-danger' : amount > 0 ? 'text-success' : '') : ''

  return (
    <span className={`tnum whitespace-nowrap ${strong ? 'font-semibold' : ''} ${tone} ${className}`}>
      {formatMoney(amount, undefined, { compact, withSymbol })}
    </span>
  )
}
