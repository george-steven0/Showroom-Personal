import { useEffect, useState } from 'react'
import { Alert, Modal, Upload, type UploadFile, type UploadProps } from 'antd'
import { useTranslation } from 'react-i18next'
import { useRestoreFromUploadMutation } from '@/api/settingsApi'
import { useNotify } from '@/lib/hooks/useNotify'
import { UI_ICONS } from '@/components/layout/icons'

/**
 * `beforeUpload` always returns `false` — antd never auto-uploads the
 * picked file, it just sits selected until the modal's own Confirm button
 * builds the real multipart request via the `restoreFromUpload` mutation.
 */
export function RestoreDatabaseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const notify = useNotify()
  const [restoreFromUpload, { isLoading }] = useRestoreFromUploadMutation()
  const [fileList, setFileList] = useState<UploadFile[]>([])

  useEffect(() => {
    if (open) setFileList([])
  }, [open])

  const handleConfirm = async () => {
    const file = fileList[0]?.originFileObj
    if (!file) return
    try {
      const result = await restoreFromUpload(file).unwrap()
      notify.success(t('settings.restoreSuccess'), t('settings.safetyBackupSaved', { filename: result.backupFilename }))
      window.location.reload()
    } catch (error) {
      notify.apiError(error)
    }
  }

  const uploadProps: UploadProps = {
    accept: '.db',
    maxCount: 1,
    fileList,
    beforeUpload: () => false,
    onChange: ({ fileList: next }) => setFileList(next),
    onRemove: () => setFileList([]),
  }

  return (
    <Modal
      open={open}
      title={t('settings.restoreTitle')}
      onCancel={onClose}
      onOk={handleConfirm}
      okText={t('settings.restoreConfirm')}
      cancelText={t('common.cancel')}
      okButtonProps={{ danger: true, disabled: fileList.length === 0, loading: isLoading }}
      cancelButtonProps={{ disabled: isLoading }}
      mask={{ closable: !isLoading }}
      closable={!isLoading}
      centered
      width={480}
      destroyOnHidden
    >
      <p className="text-sm leading-relaxed text-muted">{t('settings.restoreBody')}</p>
      <Alert className="mt-3" type="warning" showIcon title={t('settings.restoreSafetyNote')} />
      <Upload.Dragger className="mt-4" {...uploadProps}>
        <p className="ant-upload-drag-icon flex justify-center text-2xl text-subtle">{UI_ICONS.car}</p>
        <p className="text-sm text-ink">{t('settings.restoreDropHint')}</p>
        <p className="text-xs text-subtle">{t('settings.restoreFileHint')}</p>
      </Upload.Dragger>
    </Modal>
  )
}
