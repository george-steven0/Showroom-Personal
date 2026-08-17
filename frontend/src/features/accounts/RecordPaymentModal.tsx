import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from 'antd'
import { useTranslation } from 'react-i18next'
import { useSettlePaymentMutation } from '@/api/purchaseBillsApi'
import { recordPaymentSchema, type RecordPaymentFormValues } from '@/lib/validation'
import { useNotify } from '@/lib/hooks/useNotify'
import { formatMoney, todayIso } from '@/lib/format'
import { DateField, FormRow, NumberField, TextAreaField } from '@/components/form/fields'
import { DEFAULT_CURRENCY } from '@/lib/constants'
import type { OwedSupplierRow } from '@/types'

export function RecordPaymentModal({ open, row, onClose }: { open: boolean; row: OwedSupplierRow | null; onClose: () => void }) {
  const { t } = useTranslation()
  const notify = useNotify()
  const [settlePayment, { isLoading }] = useSettlePaymentMutation()

  const maxAmount = row?.owed ?? 0
  const schema = useMemo(() => recordPaymentSchema(t, maxAmount, formatMoney(maxAmount)), [t, maxAmount])
  const form = useForm<RecordPaymentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: 0, date: todayIso(), note: '' },
  })

  useEffect(() => {
    if (open) form.reset({ amount: row?.owed ?? 0, date: todayIso(), note: '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, row?.purchaseLineId])

  const onSubmit = form.handleSubmit(async (values) => {
    if (!row) return
    try {
      await settlePayment({ id: row.purchaseLineId, ...values }).unwrap()
      notify.success(t('messages.paymentRecorded'))
      onClose()
    } catch (error) {
      notify.apiError(error)
    }
  })

  return (
    <Modal
      open={open}
      title={row ? t('accounts.recordPaymentTitle', { supplier: row.supplierName }) : ''}
      onCancel={onClose}
      onOk={() => void onSubmit()}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={isLoading}
      width={420}
      destroyOnHidden
    >
      {row && (
        <form onSubmit={onSubmit} className="pt-2" noValidate>
          <p className="mb-4 text-sm text-muted">{t('accounts.recordPaymentHint', { item: row.itemName, amount: formatMoney(row.owed) })}</p>
          <FormRow cols={1}>
            <NumberField control={form.control} name="amount" label={t('common.amount')} required min={0} max={row.owed} precision={2} suffix={DEFAULT_CURRENCY} autoFocus />
            <DateField control={form.control} name="date" label={t('common.date')} required maxToday />
            <TextAreaField control={form.control} name="note" label={t('common.note')} rows={2} />
          </FormRow>
        </form>
      )}
    </Modal>
  )
}
