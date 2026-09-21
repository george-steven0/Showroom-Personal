import { Button, Tooltip } from 'antd'
import { useTranslation } from 'react-i18next'
import { ACTION_ICONS } from '@/components/ui/RowActions'

/** One-click "start a new record from this one" — sits beside the row's ⋯ menu on Inventory and Buying Bills. */
export function CloneButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <Tooltip title={t('common.clone')}>
      <Button type="text" size="small" aria-label={t('common.clone')} icon={ACTION_ICONS.copy} onClick={onClick} />
    </Tooltip>
  )
}
