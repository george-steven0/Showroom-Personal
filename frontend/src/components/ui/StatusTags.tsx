import { useTranslation } from 'react-i18next'
import { StatusBadge } from './primitives'
import type { BillStatus, CashTransactionType, PurchaseLineStatus } from '@/types'

export function BillStatusTag({ status }: { status: BillStatus }) {
  const { t } = useTranslation()
  return <StatusBadge tone={status === 'active' ? 'success' : 'danger'}>{t(`status.${status}`)}</StatusBadge>
}

export function PurchaseLineStatusTag({ status }: { status: PurchaseLineStatus }) {
  const { t } = useTranslation()
  return <StatusBadge tone={status === 'in_stock' ? 'info' : 'neutral'}>{t(`status.${status}`)}</StatusBadge>
}

const TX_TONE: Record<CashTransactionType, 'success' | 'danger' | 'warning' | 'primary'> = {
  capital_injection: 'success',
  sale: 'success',
  purchase_payment: 'danger',
  debt_settlement: 'warning',
  expense: 'danger',
}

export function CashTransactionTypeTag({ type }: { type: CashTransactionType }) {
  const { t } = useTranslation()
  const key = type.charAt(0).toUpperCase() + type.slice(1)
  return <StatusBadge tone={TX_TONE[type]}>{t(`summary.type${key}`)}</StatusBadge>
}
