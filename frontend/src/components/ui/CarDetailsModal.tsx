import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from 'antd'
import { useTranslation } from 'react-i18next'
import { useUpdateLineDetailsMutation } from '@/api/purchaseBillsApi'
import { lineDetailsSchema, type LineDetailsFormValues } from '@/lib/validation'
import { useNotify } from '@/lib/hooks/useNotify'
import { FormRow, NumberField, TextField } from '@/components/form/fields'

export interface CarDetailsTarget {
  lineId: string
  itemName: string
  chassisNumber: string
  motorNumber: string
  modelYear: number | null
}

/**
 * Edits one bought car's chassis / motor number and model year in place — works even after it's sold, and the
 * backend copies the change onto its selling bill. Opened from Buying Bills, Stock and Selling Bills.
 */
export function CarDetailsModal({ car, onClose }: { car: CarDetailsTarget | null; onClose: () => void }) {
  const { t } = useTranslation()
  const notify = useNotify()
  const [updateDetails, { isLoading }] = useUpdateLineDetailsMutation()

  const schema = useMemo(() => lineDetailsSchema(t), [t])
  const form = useForm<LineDetailsFormValues>({ resolver: zodResolver(schema), defaultValues: { chassisNumber: '', motorNumber: '', modelYear: null } })
  const chassis = useWatch({ control: form.control, name: 'chassisNumber' })

  useEffect(() => {
    if (!car) return
    form.reset({ chassisNumber: car.chassisNumber, motorNumber: car.motorNumber, modelYear: car.modelYear })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [car?.lineId])

  const submit = form.handleSubmit(async (values) => {
    if (!car) return
    try {
      const result = await updateDetails({
        id: car.lineId,
        body: { chassisNumber: values.chassisNumber, motorNumber: values.motorNumber, modelYear: values.modelYear ?? null },
      }).unwrap()
      notify.success(t('missingInfo.saved'), result.syncedSellingBills > 0 ? t('missingInfo.syncedSales', { count: result.syncedSellingBills }) : undefined)
      onClose()
    } catch (error) {
      notify.apiError(error)
    }
  })

  return (
    <Modal
      open={Boolean(car)}
      title={t('missingInfo.editTitle', { item: car?.itemName ?? '' })}
      onCancel={onClose}
      onOk={() => void submit()}
      okText={t('common.saveChanges')}
      cancelText={t('common.cancel')}
      confirmLoading={isLoading}
      width={480}
      destroyOnHidden
    >
      <form onSubmit={submit} className="pt-2" noValidate>
        <p className="mb-4 text-sm text-muted">{t('missingInfo.editHint')}</p>
        <FormRow cols={1}>
          <TextField
            control={form.control}
            name="chassisNumber"
            label={t('purchases.chassisNumber')}
            autoFocus
            hint={!chassis?.trim() ? <span className="text-info">{t('missingInfo.chassisHint')}</span> : undefined}
          />
          <TextField control={form.control} name="motorNumber" label={t('purchases.motorNumber')} />
          <NumberField control={form.control} name="modelYear" label={t('purchases.modelYear')} min={1950} precision={0} grouping={false} />
        </FormRow>
      </form>
    </Modal>
  )
}
