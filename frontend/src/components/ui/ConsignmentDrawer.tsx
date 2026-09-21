import { Button, Drawer } from 'antd'
import { useTranslation } from 'react-i18next'
import { ConsignmentInfo } from '@/components/ui/ConsignmentInfo'
import { ConsignmentTag } from '@/components/ui/StatusTags'
import type { ConsignmentDetails } from '@/types'

/** Everything recorded about a consignment (أمانة), opened by clicking the tag or the car's name on Inventory and Stock. */
export function ConsignmentDrawer({
  open,
  title,
  details,
  onClose,
  onEdit,
  onClear,
}: {
  open: boolean
  title: string
  details: ConsignmentDetails | null
  onClose: () => void
  onEdit: () => void
  onClear: () => void
}) {
  const { t } = useTranslation()

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size={560}
      destroyOnHidden
      title={
        <div className="flex flex-wrap items-center gap-2">
          <span>{title}</span>
          <ConsignmentTag />
        </div>
      }
      footer={
        <div className="flex items-center justify-between gap-2">
          <Button danger type="text" onClick={onClear}>
            {t('consignment.unmark')}
          </Button>
          <Button type="primary" onClick={onEdit}>
            {t('consignment.edit')}
          </Button>
        </div>
      }
    >
      {details && <ConsignmentInfo details={details} />}
    </Drawer>
  )
}
