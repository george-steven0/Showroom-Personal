import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from 'antd'
import { useTranslation } from 'react-i18next'
import { useMarkInventoryItemSoldMutation, useUpdateInventorySaleMutation } from '@/api/inventoryApi'
import { markSoldSchema, type MarkSoldFormValues } from '@/lib/validation'
import { useNotify } from '@/lib/hooks/useNotify'
import { todayIso } from '@/lib/format'
import { DateField, FormRow, NumberField, TextAreaField, TextField } from '@/components/form/fields'
import { DEFAULT_CURRENCY } from '@/lib/constants'
import type { InventoryItem } from '@/types'

/**
 * Also doubles as the "fix a wrong amount/buyer detail" form for a car that's already sold — reopened via
 * the "Edit sale" row action (any status but in_stock), prefilled from the existing sale instead of blank,
 * so correcting a typo doesn't require unselling and reselling the car (which would wipe the buyer record).
 */
export function MarkSoldModal({ open, item, onClose }: { open: boolean; item: InventoryItem | null; onClose: () => void }) {
  const { t } = useTranslation()
  const notify = useNotify()
  const isEdit = item ? item.status !== 'in_stock' : false
  const [markSold, { isLoading: marking }] = useMarkInventoryItemSoldMutation()
  const [updateSale, { isLoading: updating }] = useUpdateInventorySaleMutation()

  const schema = useMemo(() => markSoldSchema(t), [t])
  const form = useForm<MarkSoldFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { buyerName: '', buyerPhone: '', buyerAddress: '', saleNotes: '', saleDate: todayIso(), paidAmount: 0 },
  })

  useEffect(() => {
    if (!open || !item) return
    form.reset(
      isEdit
        ? {
            buyerName: item.buyerName ?? '',
            buyerPhone: item.buyerPhone ?? '',
            buyerAddress: item.buyerAddress ?? '',
            saleNotes: item.saleNotes ?? '',
            saleDate: item.saleDate ?? todayIso(),
            paidAmount: item.paidAmount,
          }
        : { buyerName: '', buyerPhone: '', buyerAddress: '', saleNotes: '', saleDate: todayIso(), paidAmount: item.agreedPrice },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id])

  const onSubmit = form.handleSubmit(async (values) => {
    if (!item) return
    const body = { ...values, buyerPhone: values.buyerPhone || undefined, buyerAddress: values.buyerAddress || undefined, saleNotes: values.saleNotes || undefined }
    try {
      if (isEdit) {
        await updateSale({ id: item.id, body }).unwrap()
        notify.success(t('messages.inventorySaleUpdated'))
      } else {
        await markSold({ id: item.id, body }).unwrap()
        notify.success(t('messages.inventoryItemMarkedSold'))
      }
      onClose()
    } catch (error) {
      notify.apiError(error)
    }
  })

  return (
    <Modal
      open={open}
      title={isEdit ? t('inventory.editSaleTitle') : t('inventory.markSoldTitle')}
      onCancel={onClose}
      onOk={() => void onSubmit()}
      okText={isEdit ? t('common.saveChanges') : t('inventory.confirmSold')}
      cancelText={t('common.cancel')}
      confirmLoading={marking || updating}
      width={480}
      destroyOnHidden
    >
      <form onSubmit={onSubmit} className="pt-2" noValidate>
        <FormRow cols={1}>
          <TextField control={form.control} name="buyerName" label={t('sales.buyerName')} required autoFocus />
          <TextField control={form.control} name="buyerPhone" label={t('sales.buyerPhone')} />
          <TextField control={form.control} name="buyerAddress" label={t('sales.buyerAddress')} />
          <DateField control={form.control} name="saleDate" label={t('inventory.saleDate')} required maxToday />
          <NumberField
            control={form.control}
            name="paidAmount"
            label={t('inventory.paidAmount')}
            hint={t('inventory.paidAmountHint')}
            required
            min={0}
            precision={2}
            suffix={DEFAULT_CURRENCY}
          />
          <TextAreaField control={form.control} name="saleNotes" label={t('common.notes')} rows={2} />
        </FormRow>
      </form>
    </Modal>
  )
}
