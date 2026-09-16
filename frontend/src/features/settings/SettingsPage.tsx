import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import {
  useCreateBackupMutation,
  useDownloadBackupFileMutation,
  useGetSettingsQuery,
  useListBackupsQuery,
  useRestoreFromBackupMutation,
  useUpdateSettingsMutation,
} from '@/api/settingsApi'
import { useNotify } from '@/lib/hooks/useNotify'
import { formatDateTime, formatFileSize } from '@/lib/format'
import { downloadBlob } from '@/lib/download'
import { settingsSchema, type SettingsFormValues } from '@/lib/validation'
import { FormRow, TextField } from '@/components/form/fields'
import { FileUpload } from '@/components/ui/FileUpload'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { EmptyState, PageHeader, SectionCard, StatusBadge } from '@/components/ui/primitives'
import { ACTION_ICONS, RowActions } from '@/components/ui/RowActions'
import { UI_ICONS } from '@/components/layout/icons'
import type { BackupFileInfo } from '@/types'
import { ResetDatabaseModal } from './ResetDatabaseModal'
import { RestoreDatabaseModal } from './RestoreDatabaseModal'

const KIND_TONE = { backup: 'primary', 'pre-reset': 'warning', 'pre-restore': 'warning' } as const
/** Seconds the backup button stays disabled after each click, so a click that lands twice can't kick off two backups at once. */
const BACKUP_COOLDOWN_SECONDS = 5

export default function SettingsPage() {
  const { t } = useTranslation()
  const notify = useNotify()

  const { data: settings, isLoading: loadingSettings } = useGetSettingsQuery()
  const [updateSettings, { isLoading: saving }] = useUpdateSettingsMutation()

  const { data: backups, isLoading: loadingBackups } = useListBackupsQuery()
  const [createBackup, { isLoading: creatingBackup }] = useCreateBackupMutation()
  const [downloadBackupFile] = useDownloadBackupFileMutation()
  const [restoreFromBackup, { isLoading: restoringExisting }] = useRestoreFromBackupMutation()

  const [resetOpen, setResetOpen] = useState(false)
  const [restoreUploadOpen, setRestoreUploadOpen] = useState(false)
  const [restoreTarget, setRestoreTarget] = useState<BackupFileInfo | null>(null)
  const [backupCooldown, setBackupCooldown] = useState(0)

  // Ticks the cooldown down to 0 one second at a time — started fresh on
  // every click (see handleCreateBackup), independent of how long the
  // backup request itself takes, so a fast response can't shorten the guard.
  useEffect(() => {
    if (backupCooldown <= 0) return
    const timer = setTimeout(() => setBackupCooldown((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [backupCooldown])

  const schema = useMemo(() => settingsSchema(t), [t])
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { systemName: '', systemNameAr: '', logo: null },
  })

  useEffect(() => {
    if (!settings) return
    form.reset({ systemName: settings.systemName, systemNameAr: settings.systemNameAr, logo: settings.logo })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings])

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await updateSettings(values).unwrap()
      notify.success(t('messages.settingsSaved'))
    } catch (error) {
      notify.apiError(error)
    }
  })

  const handleCreateBackup = async () => {
    setBackupCooldown(BACKUP_COOLDOWN_SECONDS)
    try {
      await createBackup().unwrap()
      notify.success(t('settings.backupCreated'))
    } catch (error) {
      notify.apiError(error)
    }
  }

  const handleDownload = async (filename: string) => {
    try {
      const blob = await downloadBackupFile(filename).unwrap()
      downloadBlob(blob, filename)
    } catch (error) {
      notify.apiError(error)
    }
  }

  const handleRestoreExisting = async () => {
    if (!restoreTarget) return
    try {
      const result = await restoreFromBackup(restoreTarget.filename).unwrap()
      notify.success(t('settings.restoreSuccess'), t('settings.safetyBackupSaved', { filename: result.backupFilename }))
      window.location.reload()
    } catch (error) {
      notify.apiError(error)
      setRestoreTarget(null)
    }
  }

  const columns: ColumnsType<BackupFileInfo> = [
    { title: t('settings.backupFile'), dataIndex: 'filename', render: (value: string) => <span className="tnum text-sm">{value}</span> },
    {
      title: t('settings.backupKind'),
      dataIndex: 'kind',
      width: 120,
      render: (value: BackupFileInfo['kind']) => <StatusBadge tone={KIND_TONE[value]}>{t(`settings.kind_${value}`)}</StatusBadge>,
    },
    { title: t('common.date'), dataIndex: 'createdAt', render: (value: string) => formatDateTime(value) },
    { title: t('settings.backupSize'), dataIndex: 'size', align: 'right', render: (value: number) => formatFileSize(value) },
    {
      title: t('common.actions'),
      key: 'actions',
      align: 'right',
      width: 60,
      fixed: 'right',
      render: (_, row) => (
        <RowActions
          actions={[
            { key: 'download', label: t('settings.download'), icon: ACTION_ICONS.download, onClick: () => handleDownload(row.filename) },
            { key: 'restore', label: t('settings.restoreThis'), icon: ACTION_ICONS.restore, danger: true, onClick: () => setRestoreTarget(row) },
          ]}
        />
      ),
    },
  ]

  return (
    <>
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <div className="space-y-4">
        <form onSubmit={onSubmit} noValidate>
          <SectionCard
            title={t('settings.branding')}
            actions={
              <Button type="primary" htmlType="submit" loading={saving}>
                {t('common.saveChanges')}
              </Button>
            }
          >
            <FormRow cols={2}>
              <TextField control={form.control} name="systemName" label={t('settings.systemName')} required autoFocus disabled={loadingSettings} />
              <TextField control={form.control} name="systemNameAr" label={t('settings.systemNameAr')} disabled={loadingSettings} />
            </FormRow>
            <div className="mt-4">
              <p className="mb-1.5 text-sm font-medium text-ink">{t('settings.logo')}</p>
              <Controller
                control={form.control}
                name="logo"
                render={({ field }) => <FileUpload value={field.value} onChange={field.onChange} disabled={loadingSettings} />}
              />
            </div>
          </SectionCard>
        </form>

        <SectionCard
          title={t('settings.backups')}
          description={t('settings.backupsHint')}
          actions={
            <Button
              type="primary"
              ghost
              icon={UI_ICONS.plus}
              onClick={handleCreateBackup}
              loading={creatingBackup}
              disabled={backupCooldown > 0}
            >
              {backupCooldown > 0 ? `${t('settings.createBackup')} (${backupCooldown}s)` : t('settings.createBackup')}
            </Button>
          }
        >
          {(backups ?? []).length === 0 && !loadingBackups ? (
            <EmptyState compact title={t('settings.emptyBackups')} />
          ) : (
            <Table<BackupFileInfo>
              rowKey="filename"
              size="small"
              loading={loadingBackups}
              dataSource={backups ?? []}
              pagination={false}
              scroll={{ x: 'max-content' }}
              columns={columns}
            />
          )}
        </SectionCard>

        <SectionCard title={t('settings.dangerZone')} className="border-danger/40">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface-2 p-4">
            <div>
              <p className="text-sm font-medium text-ink">{t('settings.restoreTitle')}</p>
              <p className="mt-0.5 text-xs text-muted">{t('settings.restoreFromFileHint')}</p>
            </div>
            <Button danger onClick={() => setRestoreUploadOpen(true)}>
              {t('settings.restoreFromFile')}
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface-2 p-4">
            <div>
              <p className="text-sm font-medium text-ink">{t('settings.resetTitle')}</p>
              <p className="mt-0.5 text-xs text-muted">{t('settings.resetHint')}</p>
            </div>
            <Button danger onClick={() => setResetOpen(true)}>
              {t('settings.resetDatabase')}
            </Button>
          </div>
        </SectionCard>
      </div>

      <ResetDatabaseModal open={resetOpen} onClose={() => setResetOpen(false)} />
      <RestoreDatabaseModal open={restoreUploadOpen} onClose={() => setRestoreUploadOpen(false)} />

      <ConfirmModal
        open={Boolean(restoreTarget)}
        loading={restoringExisting}
        title={t('settings.restoreThisTitle')}
        description={t('settings.restoreThisBody', { filename: restoreTarget?.filename ?? '' })}
        warning={t('settings.restoreSafetyNote')}
        confirmLabel={t('settings.restoreConfirm')}
        onConfirm={handleRestoreExisting}
        onCancel={() => setRestoreTarget(null)}
      />
    </>
  )
}
