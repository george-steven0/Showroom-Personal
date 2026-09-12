import { Segmented } from 'antd'
import { useTranslation } from 'react-i18next'
import type { BillStatus } from '@/types'

export type BillStatusFilterValue = BillStatus | 'all'

export interface BillStatusFilterProps {
  value: BillStatusFilterValue
  onChange: (value: BillStatusFilterValue) => void
}

/** Active / cancelled / all toggle shared by the buying and selling bills lists. */
export function BillStatusFilter({ value, onChange }: BillStatusFilterProps) {
  const { t } = useTranslation()

  return (
    <Segmented
      value={value}
      onChange={(next) => onChange(next as BillStatusFilterValue)}
      options={[
        { value: 'active', label: t('status.active') },
        { value: 'cancelled', label: t('status.cancelled') },
        { value: 'all', label: t('common.all') },
      ]}
    />
  )
}
