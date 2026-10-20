import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from 'antd'
import { useTranslation } from 'react-i18next'
import { useCreateInternalEntryMutation, useUpdateInternalEntryMutation } from '@/api/internalAccountsApi'
import { internalEntrySchema, type InternalEntryFormValues } from '@/lib/validation'
import { useNotify } from '@/lib/hooks/useNotify'
import { todayIso } from '@/lib/format'
import { DateField, FormRow, NumberField, SelectField, TextAreaField, TextField } from '@/components/form/fields'
import { DEFAULT_CURRENCY } from '@/lib/constants'
import type { InternalAccountEntry } from '@/types'

export function InternalEntryModal({ open, entry, onClose }: { open: boolean; entry: InternalAccountEntry | null; onClose: () => void }) {
  const { t } = useTranslation()
  const notify = useNotify()
  const [createEntry, { isLoading: creating }] = useCreateInternalEntryMutation()
  const [updateEntry, { isLoading: updating }] = useUpdateInternalEntryMutation()
  const isEdit = Boolean(entry)

  const schema = useMemo(() => internalEntrySchema(t), [t])
  // No default type: paid vs owed flips the net, so it's always a deliberate choice.
  const form = useForm<InternalEntryFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { itemName: '', amount: 0, type: undefined, date: todayIso(), notes: '' },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      itemName: entry?.itemName ?? '',
      amount: entry?.amount ?? 0,
      type: entry?.type,
      date: entry?.date ?? todayIso(),
      notes: entry?.notes ?? '',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entry?.id])

  const onSubmit = form.handleSubmit(async (values) => {
    // Notes always go as a string, so clearing them on an edit really clears them.
    const body = { ...values, notes: values.notes ?? '' }
    try {
      if (isEdit && entry) {
        await updateEntry({ id: entry.id, body }).unwrap()
        notify.success(t('messages.internalEntryUpdated'))
      } else {
        await createEntry(body).unwrap()
        notify.success(t('messages.internalEntrySaved'))
      }
      onClose()
    } catch (error) {
      notify.apiError(error)
    }
  })

  return (
    <Modal
      open={open}
      title={isEdit ? t('internalAccounts.editTitle') : t('internalAccounts.addTitle')}
      onCancel={onClose}
      onOk={() => void onSubmit()}
      okText={isEdit ? t('common.saveChanges') : t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={creating || updating}
      width={520}
      destroyOnHidden
    >
      <form onSubmit={onSubmit} className="space-y-4 pt-2" noValidate>
        <FormRow cols={1}>
          <TextField control={form.control} name="itemName" label={t('internalAccounts.itemName')} required autoFocus />
        </FormRow>
        <FormRow cols={2}>
          <NumberField control={form.control} name="amount" label={t('common.amount')} required min={0} precision={2} suffix={DEFAULT_CURRENCY} />
          <SelectField
            control={form.control}
            name="type"
            label={t('internalAccounts.type')}
            required
            placeholder={t('internalAccounts.typePlaceholder')}
            options={[
              { value: 'paid', label: t('internalAccounts.paid') },
              { value: 'owed', label: t('internalAccounts.owed') },
            ]}
          />
        </FormRow>
        <FormRow cols={2}>
          <DateField control={form.control} name="date" label={t('common.date')} required />
        </FormRow>
        <FormRow cols={1}>
          <TextAreaField control={form.control} name="notes" label={t('common.notes')} rows={3} />
        </FormRow>
      </form>
    </Modal>
  )
}
