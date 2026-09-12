import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Skeleton } from 'antd'
import { useTranslation } from 'react-i18next'
import { useCreatePurchaseBillMutation, useGetPurchaseBillQuery, useUpdatePurchaseBillMutation } from '@/api/purchaseBillsApi'
import { useGetSuppliersQuery } from '@/api/suppliersApi'
import { purchaseBillSchema, type PurchaseBillFormValues } from '@/lib/validation'
import { useNotify } from '@/lib/hooks/useNotify'
import { round2, todayIso } from '@/lib/format'
import { localId } from '@/lib/id'
import { DateField, FormRow, TextAreaField } from '@/components/form/fields'
import { EmptyState, PageHeader, SectionCard } from '@/components/ui/primitives'
import { Money } from '@/components/ui/Money'
import { UI_ICONS } from '@/components/layout/icons'
import { PurchaseLineRow } from './PurchaseLineRow'

const EMPTY_LINE: PurchaseBillFormValues['lines'][number] = {
  key: '',
  itemName: '',
  description: '',
  supplierId: '',
  chassisNumber: '',
  motorNumber: '',
  modelYear: null,
  price: 0,
  paidAmount: 0,
  notes: '',
}

export default function PurchaseBillFormPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const notify = useNotify()
  const isEdit = Boolean(id)

  const { data: existing, isLoading } = useGetPurchaseBillQuery(id!, { skip: !id })
  const { data: suppliers } = useGetSuppliersQuery({ page: 1, pageSize: 0 })
  const [createBill, { isLoading: creating }] = useCreatePurchaseBillMutation()
  const [updateBill, { isLoading: updating }] = useUpdatePurchaseBillMutation()

  const supplierOptions = (suppliers?.rows ?? []).map((row) => ({ value: row.id, label: row.name }))

  const schema = useMemo(() => purchaseBillSchema(t), [t])
  const form = useForm<PurchaseBillFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { date: todayIso(), lines: [{ ...EMPTY_LINE, key: localId() }], notes: '' },
    mode: 'onBlur',
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'lines' })
  const lines = form.watch('lines')

  useEffect(() => {
    if (!existing) return
    form.reset({
      date: existing.date,
      notes: existing.notes ?? '',
      lines: existing.lines.map((line) => ({
        key: localId(),
        itemName: line.itemName,
        description: line.description ?? '',
        supplierId: line.supplierId,
        chassisNumber: line.chassisNumber,
        motorNumber: line.motorNumber,
        modelYear: line.modelYear,
        price: line.price,
        paidAmount: line.paidAmount,
        notes: line.notes ?? '',
      })),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing])

  const total = round2((lines ?? []).reduce((sum, line) => sum + (Number(line.price) || 0), 0))
  const totalPaid = round2((lines ?? []).reduce((sum, line) => sum + (Number(line.paidAmount) || 0), 0))
  const totalOwed = round2(total - totalPaid)

  const onSubmit = form.handleSubmit(
    async (values) => {
      const payload = {
        date: values.date,
        notes: values.notes || undefined,
        lines: values.lines.map((line) => ({
          itemName: line.itemName,
          description: line.description || undefined,
          supplierId: line.supplierId,
          chassisNumber: line.chassisNumber,
          motorNumber: line.motorNumber,
          modelYear: line.modelYear ?? undefined,
          price: line.price,
          paidAmount: line.paidAmount,
          notes: line.notes || undefined,
        })),
      }

      try {
        if (isEdit && id) {
          await updateBill({ id, body: payload }).unwrap()
          notify.success(t('messages.purchaseUpdated'))
        } else {
          await createBill(payload).unwrap()
          notify.success(t('messages.purchaseSaved'))
        }
        navigate('/buying-bills')
      } catch (error) {
        notify.apiError(error)
      }
    },
    () => notify.error(t('common.error'), t('messages.saveFailed')),
  )

  if (isLoading) return <Skeleton active paragraph={{ rows: 10 }} />

  const saving = creating || updating
  const lineErrors = form.formState.errors.lines

  return (
    <form onSubmit={onSubmit} noValidate>
      <PageHeader
        title={isEdit ? t('purchases.edit') : t('purchases.add')}
        subtitle={existing?.number}
        actions={
          <>
            <Button onClick={() => navigate('/buying-bills')} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              {isEdit ? t('common.saveChanges') : t('common.save')}
            </Button>
          </>
        }
      />

      <div className="space-y-4">
        <SectionCard title={t('purchases.view')}>
          <FormRow cols={3}>
            <DateField control={form.control} name="date" label={t('purchases.date')} required maxToday />
          </FormRow>
        </SectionCard>

        <SectionCard
          title={t('purchases.items')}
          actions={
            <Button type="primary" ghost icon={UI_ICONS.plus} onClick={() => append({ ...EMPTY_LINE, key: localId() })}>
              {t('purchases.addRow')}
            </Button>
          }
        >
          {fields.length === 0 ? (
            <EmptyState
              compact
              title={t('purchases.emptyLines')}
              action={
                <Button icon={UI_ICONS.plus} onClick={() => append({ ...EMPTY_LINE, key: localId() })}>
                  {t('purchases.addRow')}
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {fields.map((field, index) => (
                <PurchaseLineRow
                  key={field.id}
                  index={index}
                  control={form.control}
                  setValue={form.setValue}
                  getValues={form.getValues}
                  supplierOptions={supplierOptions}
                  onRemove={() => remove(index)}
                  canRemove={fields.length > 1}
                />
              ))}
            </div>
          )}

          {typeof lineErrors?.message === 'string' && <Alert type="error" showIcon title={lineErrors.message} className="mt-3" />}
        </SectionCard>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SectionCard title={t('common.notes')}>
              <TextAreaField control={form.control} name="notes" rows={3} />
            </SectionCard>
          </div>

          <SectionCard title={t('purchases.grandTotal')}>
            <dl className="space-y-3">
              <div className="flex items-center justify-between">
                <dt className="text-sm text-muted">{t('purchases.itemCount')}</dt>
                <dd className="tnum text-sm font-medium text-ink">{fields.length}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-3">
                <dt className="text-sm text-muted">{t('purchases.subtotal')}</dt>
                <dd>
                  <Money value={total} strong />
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-muted">{t('purchases.paidAmount')}</dt>
                <dd className="text-success">
                  <Money value={totalPaid} className="text-success" />
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-3">
                <dt className="text-[15px] font-semibold text-ink">{t('purchases.owed')}</dt>
                <dd className="text-[15px]">
                  <Money value={totalOwed} signed strong />
                </dd>
              </div>
            </dl>
          </SectionCard>
        </div>
      </div>
    </form>
  )
}
