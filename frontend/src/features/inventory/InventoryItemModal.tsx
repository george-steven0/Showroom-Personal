import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from 'antd'
import { useTranslation } from 'react-i18next'
import { useCreateInventoryItemMutation, useUpdateInventoryItemMutation } from '@/api/inventoryApi'
import { inventoryItemSchema, type InventoryItemFormValues } from '@/lib/validation'
import { useNotify } from '@/lib/hooks/useNotify'
import { FormRow, NumberField, TextAreaField, TextField } from '@/components/form/fields'
import { BranchSelect } from './BranchSelect'
import { DEFAULT_CURRENCY } from '@/lib/constants'
import type { InventoryItem } from '@/types'

export function InventoryItemModal({ open, item, defaultBranchId, onClose }: { open: boolean; item: InventoryItem | null; defaultBranchId?: string; onClose: () => void }) {
  const { t } = useTranslation()
  const notify = useNotify()
  const [createItem, { isLoading: creating }] = useCreateInventoryItemMutation()
  const [updateItem, { isLoading: updating }] = useUpdateInventoryItemMutation()
  const isEdit = Boolean(item)

  const schema = useMemo(() => inventoryItemSchema(t), [t])
  const form = useForm<InventoryItemFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      carType: '',
      brand: '',
      trimLevel: '',
      chassisNumber: '',
      motorNumber: '',
      modelYear: null,
      color: '',
      notes: '',
      branchId: '',
      buyPrice: null,
      traderSellPrice: 0,
      agreedPrice: 0,
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      carType: item?.carType ?? '',
      brand: item?.brand ?? '',
      trimLevel: item?.trimLevel ?? '',
      chassisNumber: item?.chassisNumber ?? '',
      motorNumber: item?.motorNumber ?? '',
      modelYear: item?.modelYear ?? null,
      color: item?.color ?? '',
      notes: item?.notes ?? '',
      branchId: item?.branchId ?? defaultBranchId ?? '',
      buyPrice: item?.buyPrice ?? null,
      traderSellPrice: item?.traderSellPrice ?? 0,
      agreedPrice: item?.agreedPrice ?? 0,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id])

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const body = {
        ...values,
        brand: values.brand || undefined,
        trimLevel: values.trimLevel || undefined,
        chassisNumber: values.chassisNumber || undefined,
        motorNumber: values.motorNumber || undefined,
        color: values.color || undefined,
        notes: values.notes || undefined,
        buyPrice: values.buyPrice ?? undefined,
      }
      if (isEdit && item) {
        await updateItem({ id: item.id, body }).unwrap()
        notify.success(t('messages.inventoryItemUpdated'))
      } else {
        await createItem(body).unwrap()
        notify.success(t('messages.inventoryItemSaved'))
      }
      onClose()
    } catch (error) {
      notify.apiError(error)
    }
  })

  return (
    <Modal
      open={open}
      title={isEdit ? t('inventory.editItemTitle') : t('inventory.addItemTitle')}
      onCancel={onClose}
      onOk={() => void onSubmit()}
      okText={isEdit ? t('common.saveChanges') : t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={creating || updating}
      width={640}
      destroyOnHidden
    >
      <form onSubmit={onSubmit} className="pt-2" noValidate>
        <FormRow cols={2}>
          <TextField control={form.control} name="carType" label={t('inventory.carType')} required autoFocus />
          <TextField control={form.control} name="brand" label={t('inventory.brand')} />
          <TextField control={form.control} name="trimLevel" label={t('inventory.trimLevel')} />
          <BranchSelect control={form.control} name="branchId" label={t('inventory.branch')} required />
          <NumberField control={form.control} name="modelYear" label={t('purchases.modelYear')} precision={0} grouping={false} />
          <TextField control={form.control} name="chassisNumber" label={t('purchases.chassisNumber')} />
          <TextField control={form.control} name="motorNumber" label={t('purchases.motorNumber')} />
          <TextField control={form.control} name="color" label={t('inventory.color')} />
        </FormRow>

        <div className="mt-4">
          <FormRow cols={3}>
            <NumberField control={form.control} name="buyPrice" label={t('inventory.buyPrice')} precision={2} suffix={DEFAULT_CURRENCY} />
            <NumberField control={form.control} name="traderSellPrice" label={t('inventory.traderSellPrice')} required precision={2} suffix={DEFAULT_CURRENCY} />
            <NumberField control={form.control} name="agreedPrice" label={t('inventory.agreedPrice')} required precision={2} suffix={DEFAULT_CURRENCY} />
          </FormRow>
        </div>

        <div className="mt-4">
          <TextAreaField control={form.control} name="notes" label={t('common.notes')} rows={2} />
        </div>
      </form>
    </Modal>
  )
}
