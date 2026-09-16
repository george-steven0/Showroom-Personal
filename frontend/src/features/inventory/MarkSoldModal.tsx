import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from 'antd'
import { useTranslation } from 'react-i18next'
import { useMarkInventoryItemSoldMutation } from '@/api/inventoryApi'
import { markSoldSchema, type MarkSoldFormValues } from '@/lib/validation'
import { useNotify } from '@/lib/hooks/useNotify'
import { formatMoney, todayIso } from '@/lib/format'
import { DateField, FormRow, NumberField, TextAreaField, TextField } from '@/components/form/fields'
import { DEFAULT_CURRENCY } from '@/lib/constants'
import type { InventoryItem } from '@/types'

export function MarkSoldModal({ open, item, onClose }: { open: boolean; item: InventoryItem | null; onClose: () => void }) {
  const { t } = useTranslation()
  const notify = useNotify()
  const [markSold, { isLoading }] = useMarkInventoryItemSoldMutation()

  const maxAmount = item?.agreedPrice ?? 0
  const schema = useMemo(() => markSoldSchema(t, maxAmount, formatMoney(maxAmount)), [t, maxAmount])
  const form = useForm<MarkSoldFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { buyerName: '', buyerPhone: '', buyerAddress: '', saleNotes: '', saleDate: todayIso(), paidAmount: 0 },
  })

  useEffect(() => {
    if (!open) return
    form.reset({ buyerName: '', buyerPhone: '', buyerAddress: '', saleNotes: '', saleDate: todayIso(), paidAmount: item?.agreedPrice ?? 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id])

  const onSubmit = form.handleSubmit(async (values) => {
    if (!item) return
    try {
      await markSold({
        id: item.id,
        body: { ...values, buyerPhone: values.buyerPhone || undefined, buyerAddress: values.buyerAddress || undefined, saleNotes: values.saleNotes || undefined },
      }).unwrap()
      notify.success(t('messages.inventoryItemMarkedSold'))
      onClose()
    } catch (error) {
      notify.apiError(error)
    }
  })

  return (
    <Modal
      open={open}
      title={t('inventory.markSoldTitle')}
      onCancel={onClose}
      onOk={() => void onSubmit()}
      okText={t('inventory.confirmSold')}
      cancelText={t('common.cancel')}
      confirmLoading={isLoading}
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
            max={maxAmount}
            precision={2}
            suffix={DEFAULT_CURRENCY}
          />
          <TextAreaField control={form.control} name="saleNotes" label={t('common.notes')} rows={2} />
        </FormRow>
      </form>
    </Modal>
  )
}
