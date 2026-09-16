import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from 'antd'
import { useTranslation } from 'react-i18next'
import { useRecordInventoryPaymentMutation } from '@/api/inventoryApi'
import { recordInventoryPaymentSchema, type RecordInventoryPaymentFormValues } from '@/lib/validation'
import { useNotify } from '@/lib/hooks/useNotify'
import { formatMoney, round2, todayIso } from '@/lib/format'
import { DateField, FormRow, NumberField } from '@/components/form/fields'
import { DEFAULT_CURRENCY } from '@/lib/constants'
import type { InventoryItem } from '@/types'

export function RecordInventoryPaymentModal({ open, item, onClose }: { open: boolean; item: InventoryItem | null; onClose: () => void }) {
  const { t } = useTranslation()
  const notify = useNotify()
  const [recordPayment, { isLoading }] = useRecordInventoryPaymentMutation()

  const remaining = item ? round2(item.agreedPrice - item.paidAmount) : 0
  const schema = useMemo(() => recordInventoryPaymentSchema(t, remaining, formatMoney(remaining)), [t, remaining])
  const form = useForm<RecordInventoryPaymentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: 0, date: todayIso() },
  })

  useEffect(() => {
    if (open) form.reset({ amount: remaining, date: todayIso() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id])

  const onSubmit = form.handleSubmit(async (values) => {
    if (!item) return
    try {
      await recordPayment({ id: item.id, body: values }).unwrap()
      notify.success(t('messages.paymentRecorded'))
      onClose()
    } catch (error) {
      notify.apiError(error)
    }
  })

  return (
    <Modal
      open={open}
      title={t('inventory.recordPaymentTitle')}
      onCancel={onClose}
      onOk={() => void onSubmit()}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={isLoading}
      width={420}
      destroyOnHidden
    >
      {item && (
        <form onSubmit={onSubmit} className="pt-2" noValidate>
          <p className="mb-4 text-sm text-muted">{t('inventory.recordPaymentHint', { item: item.carType, amount: formatMoney(remaining) })}</p>
          <FormRow cols={1}>
            <NumberField control={form.control} name="amount" label={t('common.amount')} required min={0} max={remaining} precision={2} suffix={DEFAULT_CURRENCY} autoFocus />
            <DateField control={form.control} name="date" label={t('common.date')} required maxToday />
          </FormRow>
        </form>
      )}
    </Modal>
  )
}
