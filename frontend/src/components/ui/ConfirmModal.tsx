import type { ReactNode } from 'react'
import { Alert, Modal } from 'antd'
import { useTranslation } from 'react-i18next'

export interface ConfirmModalProps {
  open: boolean
  title: string
  description?: ReactNode
  warning?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  open,
  title,
  description,
  warning,
  confirmLabel,
  cancelLabel,
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { t } = useTranslation()

  return (
    <Modal
      open={open}
      title={title}
      onOk={onConfirm}
      onCancel={onCancel}
      okText={confirmLabel ?? t('common.confirmDelete')}
      cancelText={cancelLabel ?? t('common.cancel')}
      okButtonProps={{ danger, loading }}
      cancelButtonProps={{ disabled: loading }}
      mask={{ closable: !loading }}
      closable={!loading}
      centered
      width={460}
      destroyOnHidden
    >
      {description && <div className="text-sm leading-relaxed text-muted">{description}</div>}
      {warning && <Alert className="mt-3" type="warning" showIcon message={warning} />}
    </Modal>
  )
}
