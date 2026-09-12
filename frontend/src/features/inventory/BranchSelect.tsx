import { useState } from 'react'
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { Button, Input, Modal, Select } from 'antd'
import { useTranslation } from 'react-i18next'
import { FieldShell } from '@/components/form/fields'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { ACTION_ICONS } from '@/components/ui/RowActions'
import {
  useCreateInventoryBranchMutation,
  useDeleteInventoryBranchMutation,
  useGetInventoryBranchesQuery,
  useUpdateInventoryBranchMutation,
} from '@/api/inventoryApi'
import { useNotify } from '@/lib/hooks/useNotify'
import type { InventoryBranch } from '@/types'

/** Stop the click from also selecting/toggling the option underneath the icon button. */
function stop(event: React.SyntheticEvent) {
  event.preventDefault()
  event.stopPropagation()
}

/** The label shown for a branch never drives filtering/selection — that's always keyed by `branch.id`. */
export function branchLabel(branch: InventoryBranch, language: string): string {
  return language === 'ar' ? (branch.nameAr?.trim() || branch.name) : branch.name
}

export function BranchSelect<T extends FieldValues>({
  control,
  name,
  label,
  required,
}: {
  control: Control<T>
  name: FieldPath<T>
  label?: string
  required?: boolean
}) {
  const { t, i18n } = useTranslation()
  const notify = useNotify()

  const { data: branches } = useGetInventoryBranchesQuery()
  const [createBranch, { isLoading: creating }] = useCreateInventoryBranchMutation()
  const [updateBranch, { isLoading: updating }] = useUpdateInventoryBranchMutation()
  const [deleteBranch, { isLoading: deleting }] = useDeleteInventoryBranchMutation()

  const [newName, setNewName] = useState('')
  const [newNameAr, setNewNameAr] = useState('')
  const [editing, setEditing] = useState<InventoryBranch | null>(null)
  const [editName, setEditName] = useState('')
  const [editNameAr, setEditNameAr] = useState('')
  const [target, setTarget] = useState<InventoryBranch | null>(null)

  const canAdd = newName.trim() && newNameAr.trim()
  const canSaveEdit = editName.trim() && editNameAr.trim()

  const addBranch = async (onChange: (value: string) => void) => {
    const name = newName.trim()
    const nameAr = newNameAr.trim()
    if (!name || !nameAr) return
    try {
      const branch = await createBranch({ name, nameAr }).unwrap()
      setNewName('')
      setNewNameAr('')
      onChange(branch.id)
      notify.success(t('inventory.branchAdded'))
    } catch (error) {
      notify.apiError(error)
    }
  }

  const saveEdit = async () => {
    if (!editing) return
    const name = editName.trim()
    const nameAr = editNameAr.trim()
    if (!name || !nameAr) return
    try {
      await updateBranch({ id: editing.id, name, nameAr }).unwrap()
      notify.success(t('inventory.branchUpdated'))
      setEditing(null)
    } catch (error) {
      notify.apiError(error)
    }
  }

  const confirmDelete = async () => {
    if (!target) return
    try {
      await deleteBranch(target.id).unwrap()
      notify.success(t('inventory.branchDeleted'))
    } catch (error) {
      notify.apiError(error, 'inventory.branchDeleteFailed')
    } finally {
      setTarget(null)
    }
  }

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FieldShell label={label} required={required} error={fieldState.error?.message} htmlFor={field.name}>
          <Select
            id={field.name}
            value={field.value || undefined}
            onChange={field.onChange}
            onBlur={field.onBlur}
            status={fieldState.error ? 'error' : undefined}
            placeholder={t('inventory.selectBranch')}
            className="w-full"
            options={(branches ?? []).map((branch) => ({ value: branch.id, label: branchLabel(branch, i18n.language) }))}
            optionRender={(option) => {
              const branch = (branches ?? []).find((row) => row.id === option.value)
              if (!branch) return option.label
              return (
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{branchLabel(branch, i18n.language)}</span>
                  <span className="flex shrink-0 items-center gap-2 text-subtle">
                    <span
                      role="button"
                      aria-label={t('common.edit')}
                      className="hover:text-primary"
                      onMouseDown={(event) => {
                        stop(event)
                        setEditing(branch)
                        setEditName(branch.name)
                        setEditNameAr(branch.nameAr ?? '')
                      }}
                    >
                      {ACTION_ICONS.edit}
                    </span>
                    <span
                      role="button"
                      aria-label={t('common.delete')}
                      className="hover:text-danger"
                      onMouseDown={(event) => {
                        stop(event)
                        setTarget(branch)
                      }}
                    >
                      {ACTION_ICONS.delete}
                    </span>
                  </span>
                </div>
              )
            }}
            popupRender={(menu) => (
              <>
                {menu}
                <div className="space-y-2 border-t border-line p-2">
                  <Input
                    size="small"
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                    placeholder={t('inventory.newBranchPlaceholder')}
                  />
                  <Input
                    size="small"
                    value={newNameAr}
                    onChange={(event) => setNewNameAr(event.target.value)}
                    placeholder={t('inventory.newBranchPlaceholderAr')}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        void addBranch(field.onChange)
                      }
                    }}
                  />
                  <Button size="small" type="primary" block loading={creating} disabled={!canAdd} onClick={() => addBranch(field.onChange)}>
                    {t('common.add')}
                  </Button>
                </div>
              </>
            )}
          />

          <Modal
            open={Boolean(editing)}
            title={t('inventory.editBranch')}
            onOk={saveEdit}
            onCancel={() => setEditing(null)}
            confirmLoading={updating}
            okText={t('common.saveChanges')}
            cancelText={t('common.cancel')}
            okButtonProps={{ disabled: !canSaveEdit }}
            destroyOnHidden
          >
            <div className="space-y-3 pt-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">{t('inventory.branchName')}</label>
                <Input value={editName} onChange={(event) => setEditName(event.target.value)} autoFocus />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">{t('inventory.branchNameAr')}</label>
                <Input value={editNameAr} onChange={(event) => setEditNameAr(event.target.value)} onPressEnter={saveEdit} />
              </div>
            </div>
          </Modal>

          <ConfirmModal
            open={Boolean(target)}
            loading={deleting}
            title={t('inventory.deleteBranchTitle')}
            description={t('inventory.deleteBranchBody', { name: target ? branchLabel(target, i18n.language) : '' })}
            onConfirm={confirmDelete}
            onCancel={() => setTarget(null)}
          />
        </FieldShell>
      )}
    />
  )
}
