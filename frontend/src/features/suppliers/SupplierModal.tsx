import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from 'antd'
import { useTranslation } from 'react-i18next'
import { useCreateSupplierMutation, useUpdateSupplierMutation } from '@/api/suppliersApi'
import { supplierSchema, type SupplierFormValues } from '@/lib/validation'
import { useNotify } from '@/lib/hooks/useNotify'
import { FormRow, TextAreaField, TextField } from '@/components/form/fields'
import type { Supplier } from '@/types'

export function SupplierModal({ open, supplier, onClose }: { open: boolean; supplier: Supplier | null; onClose: () => void }) {
  const { t } = useTranslation()
  const notify = useNotify()
  const [createSupplier, { isLoading: creating }] = useCreateSupplierMutation()
  const [updateSupplier, { isLoading: updating }] = useUpdateSupplierMutation()
  const isEdit = Boolean(supplier)

  const schema = useMemo(() => supplierSchema(t), [t])
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', phone2: '', address: '', notes: '' },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      name: supplier?.name ?? '',
      phone: supplier?.phone ?? '',
      phone2: supplier?.phone2 ?? '',
      address: supplier?.address ?? '',
      notes: supplier?.notes ?? '',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, supplier?.id])

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (isEdit && supplier) {
        await updateSupplier({ id: supplier.id, body: values }).unwrap()
        notify.success(t('messages.supplierUpdated'))
      } else {
        await createSupplier(values).unwrap()
        notify.success(t('messages.supplierSaved'))
      }
      onClose()
    } catch (error) {
      notify.apiError(error)
    }
  })

  return (
    <Modal
      open={open}
      title={isEdit ? t('suppliers.editTitle') : t('suppliers.addTitle')}
      onCancel={onClose}
      onOk={() => void onSubmit()}
      okText={isEdit ? t('common.saveChanges') : t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={creating || updating}
      width={480}
      destroyOnHidden
    >
      <form onSubmit={onSubmit} className="pt-2" noValidate>
        <FormRow cols={1}>
          <TextField control={form.control} name="name" label={t('common.name')} required autoFocus />
          <TextField control={form.control} name="phone" label={t('common.phone')} />
          <TextField control={form.control} name="phone2" label={t('suppliers.phone2')} />
          <TextField control={form.control} name="address" label={t('common.address')} />
          <TextAreaField control={form.control} name="notes" label={t('common.notes')} rows={2} />
        </FormRow>
      </form>
    </Modal>
  )
}
