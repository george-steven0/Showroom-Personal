import { useEffect, useState } from 'react'
import { Alert, Input, Modal } from 'antd'
import { useTranslation } from 'react-i18next'
import { useResetDatabaseMutation } from '@/api/settingsApi'
import { useNotify } from '@/lib/hooks/useNotify'
import { RESET_CONFIRMATION_PHRASE } from '@/lib/constants'

/**
 * Reset wipes every buying/selling bill, supplier and expense (keeping the
 * login and system settings intact) — the confirmation phrase has to be
 * typed exactly, mirroring the same independent check the backend makes
 * on the DTO, so a UI slip alone can never trigger this.
 */
export function ResetDatabaseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const notify = useNotify()
  const [resetDatabase, { isLoading }] = useResetDatabaseMutation()
  const [confirmation, setConfirmation] = useState('')

  useEffect(() => {
    if (open) setConfirmation('')
  }, [open])

  const handleConfirm = async () => {
    try {
      const result = await resetDatabase({ confirmation }).unwrap()
      notify.success(t('settings.resetSuccess'), t('settings.safetyBackupSaved', { filename: result.backupFilename }))
      window.location.reload()
    } catch (error) {
      notify.apiError(error)
    }
  }

  const matches = confirmation === RESET_CONFIRMATION_PHRASE

  return (
    <Modal
      open={open}
      title={t('settings.resetTitle')}
      onCancel={onClose}
      onOk={handleConfirm}
      okText={t('settings.resetConfirm')}
      cancelText={t('common.cancel')}
      okButtonProps={{ danger: true, disabled: !matches, loading: isLoading }}
      cancelButtonProps={{ disabled: isLoading }}
      mask={{ closable: !isLoading }}
      closable={!isLoading}
      centered
      width={480}
      destroyOnHidden
    >
      <p className="text-sm leading-relaxed text-muted">{t('settings.resetBody')}</p>
      <Alert className="mt-3" type="warning" showIcon title={t('settings.resetSafetyNote')} />
      <p className="mt-4 mb-1.5 text-sm font-medium text-ink">
        {t('settings.typeToConfirm', { phrase: RESET_CONFIRMATION_PHRASE })}
      </p>
      <Input
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
        placeholder={RESET_CONFIRMATION_PHRASE}
        disabled={isLoading}
        autoFocus
      />
    </Modal>
  )
}
