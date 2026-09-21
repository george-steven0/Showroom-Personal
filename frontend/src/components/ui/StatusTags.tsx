import { Tooltip } from 'antd'
import { useTranslation } from 'react-i18next'
import { formatDate, formatMoney } from '@/lib/format'
import { StatusBadge } from './primitives'
import type { BillStatus, CashTransactionType, ConsignmentDetails, FollowUpRating, FollowUpStatus, InventoryItemStatus, PurchaseLineStatus } from '@/types'

export function BillStatusTag({ status }: { status: BillStatus }) {
  const { t } = useTranslation()
  return <StatusBadge tone={status === 'active' ? 'success' : 'danger'}>{t(`status.${status}`)}</StatusBadge>
}

export function PurchaseLineStatusTag({ status }: { status: PurchaseLineStatus }) {
  const { t } = useTranslation()
  return <StatusBadge tone={status === 'in_stock' ? 'info' : 'neutral'}>{t(`status.${status}`)}</StatusBadge>
}

const INVENTORY_STATUS_TONE: Record<InventoryItemStatus, 'info' | 'warning' | 'success' | 'accent'> = {
  in_stock: 'info',
  partial_paid: 'warning',
  sold: 'success',
  exceeded: 'accent',
}

export function InventoryStatusTag({ status }: { status: InventoryItemStatus }) {
  const { t } = useTranslation()
  return <StatusBadge tone={INVENTORY_STATUS_TONE[status]}>{t(`status.${status}`)}</StatusBadge>
}

/** A marker, not a status: the car is with a trader on consignment (أمانة) — he pays part now or after selling it. */
export function ConsignmentTag({ details, onClick }: { details?: ConsignmentDetails; onClick?: () => void }) {
  const { t } = useTranslation()
  const tag = (
    <StatusBadge tone="rose" size="small">
      {t('consignment.label')}
    </StatusBadge>
  )
  const badge = onClick ? (
    <button type="button" onClick={onClick} className="cursor-pointer rounded-full transition-opacity hover:opacity-80">
      {tag}
    </button>
  ) : (
    tag
  )
  if (!details?.consignmentTraderName) return badge

  const paid = details.consignmentPaidAmount ?? 0
  const summary = [
    details.consignmentTraderName,
    details.consignmentDate ? formatDate(details.consignmentDate) : null,
    paid > 0 ? `${t('consignment.paidAmount')}: ${formatMoney(paid)}` : t('consignment.notPaid'),
  ]
    .filter(Boolean)
    .join(' · ')

  return <Tooltip title={summary}>{badge}</Tooltip>
}

const RATING_TONE: Record<FollowUpRating, 'success' | 'warning' | 'neutral'> = {
  very_likely: 'success',
  medium: 'warning',
  unlikely: 'neutral',
}

export function FollowUpRatingTag({ rating }: { rating: FollowUpRating }) {
  const { t } = useTranslation()
  return <StatusBadge tone={RATING_TONE[rating]}>{t(`followUp.rating.${rating}`)}</StatusBadge>
}

const FOLLOW_UP_STATUS_TONE: Record<FollowUpStatus, 'info' | 'success' | 'danger'> = {
  following_up: 'info',
  converted: 'success',
  lost: 'danger',
}

export function FollowUpStatusTag({ status }: { status: FollowUpStatus }) {
  const { t } = useTranslation()
  return <StatusBadge tone={FOLLOW_UP_STATUS_TONE[status]}>{t(`followUp.status.${status}`)}</StatusBadge>
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
