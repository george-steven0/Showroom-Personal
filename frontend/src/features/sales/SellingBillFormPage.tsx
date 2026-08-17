import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Skeleton } from 'antd'
import { useTranslation } from 'react-i18next'
import { useCreateSellingBillMutation } from '@/api/sellingBillsApi'
import { useGetAvailablePurchaseLinesQuery } from '@/api/purchaseBillsApi'
import { sellingBillSchema, type SellingBillFormValues } from '@/lib/validation'
import { useNotify } from '@/lib/hooks/useNotify'
import { formatDate, todayIso } from '@/lib/format'
import { DateField, FormRow, NumberField, SelectField, TextAreaField, TextField } from '@/components/form/fields'
import { EmptyState, Field, PageHeader, SectionCard } from '@/components/ui/primitives'
import { Money } from '@/components/ui/Money'
import { DEFAULT_CURRENCY } from '@/lib/constants'
import type { PurchaseBillLine } from '@/types'

export default function SellingBillFormPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const notify = useNotify()

  const { data: availableLines, isLoading } = useGetAvailablePurchaseLinesQuery()
  const [createBill, { isLoading: creating }] = useCreateSellingBillMutation()

  const [selectedLine, setSelectedLine] = useState<PurchaseBillLine | null>(null)

  const schema = useMemo(() => sellingBillSchema(t), [t])
  const form = useForm<SellingBillFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      purchaseLineId: '',
      sellingPrice: 0,
      sellingDate: todayIso(),
      buyerName: '',
      buyerAddress: '',
      buyerPhone: '',
      notes: '',
    },
  })

  const lineOptions = (availableLines ?? []).map((line) => ({
    value: line.id,
    label: `${line.itemName} — ${line.chassisNumber}`,
  }))

  const onSelectLine = (id: unknown) => {
    const line = (availableLines ?? []).find((row) => row.id === id) ?? null
    setSelectedLine(line)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await createBill({
        purchaseLineId: values.purchaseLineId,
        sellingPrice: values.sellingPrice,
        sellingDate: values.sellingDate,
        buyerName: values.buyerName,
        buyerAddress: values.buyerAddress || undefined,
        buyerPhone: values.buyerPhone || undefined,
        notes: values.notes || undefined,
      }).unwrap()
      notify.success(t('messages.sellingSaved'))
      navigate('/selling-bills')
    } catch (error) {
      notify.apiError(error)
    }
  })

  if (isLoading) return <Skeleton active paragraph={{ rows: 10 }} />

  const profit = selectedLine ? (form.watch('sellingPrice') || 0) - selectedLine.price : 0

  return (
    <form onSubmit={onSubmit} noValidate>
      <PageHeader
        title={t('sales.add')}
        actions={
          <>
            <Button onClick={() => navigate('/selling-bills')} disabled={creating}>
              {t('common.cancel')}
            </Button>
            <Button type="primary" htmlType="submit" loading={creating} disabled={(availableLines ?? []).length === 0}>
              {t('common.save')}
            </Button>
          </>
        }
      />

      {(availableLines ?? []).length === 0 ? (
        <SectionCard>
          <EmptyState compact title={t('sales.noAvailableCars')} />
        </SectionCard>
      ) : (
        <div className="space-y-4">
          <SectionCard title={t('sales.selectItem')}>
            <FormRow cols={1}>
              <SelectField
                control={form.control}
                name="purchaseLineId"
                label={t('sales.selectItem')}
                placeholder={t('sales.selectItemPlaceholder')}
                required
                options={lineOptions}
                onAfterChange={onSelectLine}
              />
            </FormRow>

            {selectedLine && (
              <dl className="mt-4 grid grid-cols-2 gap-4 rounded-lg border border-line bg-surface-2 p-4 sm:grid-cols-3">
                <Field label={t('sales.supplier')} value={selectedLine.supplierName} />
                <Field label={t('sales.buyingDate')} value={formatDate(selectedLine.purchaseDate)} />
                <Field label={t('sales.buyingPrice')} value={<Money value={selectedLine.price} />} mono />
                <Field label={t('sales.chassisNumber')} value={selectedLine.chassisNumber} mono />
                <Field label={t('sales.motorNumber')} value={selectedLine.motorNumber} mono />
                <Field label={t('sales.modelYear')} value={selectedLine.modelYear ?? '—'} />
                {selectedLine.description && <Field label={t('sales.description')} value={selectedLine.description} className="col-span-full" />}
              </dl>
            )}
          </SectionCard>

          <SectionCard title={t('sales.sellingPrice')}>
            <FormRow cols={3}>
              <NumberField control={form.control} name="sellingPrice" label={t('sales.sellingPrice')} required min={0} precision={2} suffix={DEFAULT_CURRENCY} />
              <DateField control={form.control} name="sellingDate" label={t('sales.sellingDate')} required maxToday />
              {selectedLine && (
                <div>
                  <p className="mb-1.5 text-sm font-medium text-ink">{t('sales.profit')}</p>
                  <p className="mt-2">
                    <Money value={profit} signed strong />
                  </p>
                </div>
              )}
            </FormRow>
          </SectionCard>

          <SectionCard title={t('sales.buyerName')}>
            <FormRow cols={3}>
              <TextField control={form.control} name="buyerName" label={t('sales.buyerName')} required />
              <TextField control={form.control} name="buyerAddress" label={t('sales.buyerAddress')} />
              <TextField control={form.control} name="buyerPhone" label={t('sales.buyerPhone')} />
            </FormRow>
            <div className="mt-4">
              <TextAreaField control={form.control} name="notes" label={t('common.notes')} rows={3} />
            </div>
          </SectionCard>
        </div>
      )}
    </form>
  )
}
