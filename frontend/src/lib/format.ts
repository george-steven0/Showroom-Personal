import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import { DEFAULT_CURRENCY } from './constants'

dayjs.extend(isoWeek)

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function todayIso(): string {
  return dayjs().format('YYYY-MM-DD')
}

export function formatIso(value: string | Date | Dayjs | null | undefined): string {
  if (!value) return ''
  return dayjs(value).format('YYYY-MM-DD')
}

export function formatMoney(
  value: number | null | undefined,
  currency: string = DEFAULT_CURRENCY,
  options: { compact?: boolean; withSymbol?: boolean } = {},
): string {
  const { compact = false, withSymbol = true } = options
  const amount = Number.isFinite(value) ? Number(value) : 0
  const formatted = compact
    ? new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(amount)
    : new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
  return withSymbol ? `${formatted} ${currency}` : formatted
}

export function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat('en-US').format(Number.isFinite(value) ? Number(value) : 0)
}

export function formatDate(value: string | Date | null | undefined, pattern = 'DD MMM YYYY'): string {
  if (!value) return '—'
  return dayjs(value).format(pattern)
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  return dayjs(value).format('DD MMM YYYY, HH:mm')
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function matches(haystack: unknown, needle: string): boolean {
  if (!needle) return true
  if (haystack == null) return false
  return String(haystack).toLowerCase().includes(needle.toLowerCase())
}

export { dayjs }
