import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from 'antd'
import { useTranslation } from 'react-i18next'
import { consignmentSchema, type ConsignmentFormValues } from '@/lib/validation'
import { todayIso } from '@/lib/format'
import { DateField, FormRow, NumberField, TextAreaField, TextField } from '@/components/form/fields'
import { DEFAULT_CURRENCY } from '@/lib/constants'
import type { ConsignmentDetails, ConsignmentPayload } from '@/types'

const EMPTY: ConsignmentFormValues = { traderName: '', date: '', address: '', paidAmount: null, notes: '' }

/**
 * The form behind the "Mark as consignment" / "Edit consignment details" row actions on both Inventory and
 * Stock. `initial` is null when marking a car for the first time; the parent owns the API call.
 */
export function ConsignmentModal({
  open,
  initial,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean
  initial: ConsignmentDetails | null
  loading: boolean
  onClose: () => void
  onSubmit: (payload: ConsignmentPayload) => void
}) {
  const { t } = useTranslation()
  const isEdit = Boolean(initial)

  const schema = useMemo(() => consignmentSchema(t), [t])
  const form = useForm<ConsignmentFormValues>({ resolver: zodResolver(schema), defaultValues: { ...EMPTY, date: todayIso() } })

  useEffect(() => {
    if (!open) return
    form.reset({
      traderName: initial?.consignmentTraderName ?? '',
      date: initial?.consignmentDate ?? todayIso(),
      address: initial?.consignmentAddress ?? '',
      paidAmount: initial?.consignmentPaidAmount ?? null,
      notes: initial?.consignmentNotes ?? '',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial])

  const submit = form.handleSubmit((values) =>
    onSubmit({
      isConsignment: true,
      consignmentTraderName: values.traderName,
      consignmentDate: values.date,
      consignmentAddress: values.address || undefined,
      consignmentPaidAmount: values.paidAmount ?? undefined,
      consignmentNotes: values.notes || undefined,
    }),
  )

  return (
    <Modal
      open={open}
      title={isEdit ? t('consignment.editTitle') : t('consignment.markTitle')}
      onCancel={onClose}
      onOk={() => void submit()}
      okText={isEdit ? t('common.saveChanges') : t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={loading}
      width={520}
      destroyOnHidden
    >
      <form onSubmit={submit} className="pt-2" noValidate>
        <p className="mb-4 text-sm text-muted">{t('consignment.hint')}</p>
        <FormRow cols={1}>
          <TextField control={form.control} name="traderName" label={t('consignment.traderName')} required autoFocus />
          <DateField control={form.control} name="date" label={t('consignment.date')} required maxToday />
          <TextField control={form.control} name="address" label={t('consignment.address')} />
          <NumberField
            control={form.control}
            name="paidAmount"
            label={t('consignment.paidAmount')}
            hint={t('consignment.paidHint')}
            min={0}
            precision={2}
            suffix={DEFAULT_CURRENCY}
          />
          <TextAreaField control={form.control} name="notes" label={t('common.notes')} rows={2} />
        </FormRow>
      </form>
    </Modal>
  )
}
