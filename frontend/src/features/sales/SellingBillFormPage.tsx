import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Skeleton } from 'antd'
import type { DefaultOptionType } from 'antd/es/select'
import { useTranslation } from 'react-i18next'
import { useCreateSellingBillMutation, useGetSellingBillQuery, useUpdateSellingBillMutation } from '@/api/sellingBillsApi'
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
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const notify = useNotify()
  const [searchParams] = useSearchParams()
  const preselectLineId = searchParams.get('lineId')
  const isEdit = Boolean(id)

  const { data: existing, isLoading: loadingExisting } = useGetSellingBillQuery(id!, { skip: !id })
  const { data: availableLines, isLoading: loadingLines } = useGetAvailablePurchaseLinesQuery(undefined, { skip: isEdit })
  const [createBill, { isLoading: creating }] = useCreateSellingBillMutation()
  const [updateBill, { isLoading: updating }] = useUpdateSellingBillMutation()

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
    label: (
      <>
        {line.itemName} — <span className="ltr-code">{line.chassisNumber}</span>
      </>
    ),
    searchText: `${line.itemName} ${line.chassisNumber}`,
  }))

  const filterLineOption = (input: string, option?: DefaultOptionType & { searchText?: string }) =>
    (option?.searchText ?? '').toLowerCase().includes(input.toLowerCase())

  const onSelectLine = (id: unknown) => {
    const line = (availableLines ?? []).find((row) => row.id === id) ?? null
    setSelectedLine(line)
  }

  useEffect(() => {
    if (!preselectLineId || !availableLines) return
    const line = availableLines.find((row) => row.id === preselectLineId)
    if (!line) return
    form.setValue('purchaseLineId', line.id, { shouldValidate: true })
    setSelectedLine(line)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectLineId, availableLines])

  useEffect(() => {
    if (!existing) return
    form.reset({
      purchaseLineId: existing.purchaseLineId,
      sellingPrice: existing.sellingPrice,
      sellingDate: existing.sellingDate,
      buyerName: existing.buyerName,
      buyerAddress: existing.buyerAddress ?? '',
      buyerPhone: existing.buyerPhone ?? '',
      notes: existing.notes ?? '',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing])

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (isEdit && id) {
        await updateBill({
          id,
          body: {
            sellingPrice: values.sellingPrice,
            sellingDate: values.sellingDate,
            buyerName: values.buyerName,
            buyerAddress: values.buyerAddress || undefined,
            buyerPhone: values.buyerPhone || undefined,
            notes: values.notes || undefined,
          },
        }).unwrap()
        notify.success(t('messages.sellingUpdated'))
      } else {
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
      }
      navigate('/selling-bills')
    } catch (error) {
      notify.apiError(error)
    }
  })

  if (isEdit ? loadingExisting : loadingLines) return <Skeleton active paragraph={{ rows: 10 }} />

  const saving = creating || updating
  const buyingPriceForProfit = isEdit ? (existing?.buyingPrice ?? 0) : (selectedLine?.price ?? 0)
  const showProfit = isEdit ? Boolean(existing) : Boolean(selectedLine)
  const profit = (form.watch('sellingPrice') || 0) - buyingPriceForProfit
  const noAvailableCars = !isEdit && (availableLines ?? []).length === 0

  return (
    <form onSubmit={onSubmit} noValidate>
      <PageHeader
        title={isEdit ? t('sales.edit') : t('sales.add')}
        subtitle={existing?.number}
        actions={
          <>
            <Button onClick={() => navigate('/selling-bills')} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button type="primary" htmlType="submit" loading={saving} disabled={noAvailableCars}>
              {isEdit ? t('common.saveChanges') : t('common.save')}
            </Button>
          </>
        }
      />

      {noAvailableCars ? (
        <SectionCard>
          <EmptyState compact title={t('sales.noAvailableCars')} />
        </SectionCard>
      ) : (
        <div className="space-y-4">
          <SectionCard title={t('sales.selectItem')}>
            {isEdit ? (
              existing && (
                <dl className="grid grid-cols-2 gap-4 rounded-lg border border-line bg-surface-2 p-4 sm:grid-cols-3">
                  <Field label={t('purchases.itemName')} value={existing.itemName} />
                  <Field label={t('sales.supplier')} value={existing.supplierName} />
                  <Field label={t('sales.buyingDate')} value={formatDate(existing.buyingDate)} />
                  <Field label={t('sales.buyingPrice')} value={<Money value={existing.buyingPrice} />} mono />
                  <Field label={t('sales.chassisNumber')} value={existing.chassisNumber} mono />
                  <Field label={t('sales.motorNumber')} value={existing.motorNumber} mono />
                  <Field label={t('sales.modelYear')} value={existing.modelYear ?? '—'} />
                </dl>
              )
            ) : (
              <>
                <FormRow cols={1}>
                  <SelectField
                    control={form.control}
                    name="purchaseLineId"
                    label={t('sales.selectItem')}
                    placeholder={t('sales.selectItemPlaceholder')}
                    required
                    options={lineOptions}
                    onAfterChange={onSelectLine}
                    filterOption={filterLineOption}
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
              </>
            )}
          </SectionCard>

          <SectionCard title={t('sales.sellingPrice')}>
            <FormRow cols={3}>
              <NumberField control={form.control} name="sellingPrice" label={t('sales.sellingPrice')} required min={0} precision={2} suffix={DEFAULT_CURRENCY} />
              <DateField control={form.control} name="sellingDate" label={t('sales.sellingDate')} required maxToday />
              {showProfit && (
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
