import { useTranslation } from 'react-i18next'
import { formatDate } from '@/lib/format'
import { Money } from '@/components/ui/Money'
import { StatusBadge } from '@/components/ui/primitives'
import type { ConsignmentDetails } from '@/types'

function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-medium tracking-wide text-subtle uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{children}</dd>
    </div>
  )
}

/** Read-only summary of a consignment (أمانة), stacked to fit the details drawer. */
export function ConsignmentInfo({ details }: { details: ConsignmentDetails }) {
  const { t } = useTranslation()
  const paid = details.consignmentPaidAmount ?? 0

  return (
    <dl className="grid grid-cols-1 gap-5">
      <InfoItem label={t('consignment.traderName')}>{details.consignmentTraderName ?? '—'}</InfoItem>
      <InfoItem label={t('consignment.date')}>{details.consignmentDate ? formatDate(details.consignmentDate) : '—'}</InfoItem>
      <InfoItem label={t('consignment.address')}>{details.consignmentAddress ?? '—'}</InfoItem>
      <InfoItem label={t('consignment.paidAmount')}>
        {paid > 0 ? <Money value={paid} strong className="text-success" /> : <StatusBadge tone="warning" size="small">{t('consignment.notPaid')}</StatusBadge>}
      </InfoItem>
      {details.consignmentNotes && (
        <InfoItem label={t('common.notes')}>
          {details.consignmentNotes}
        </InfoItem>
      )}
    </dl>
  )
}
