import { useEffect, useRef } from 'react'
import { useWatch, type Control, type UseFormGetValues, type UseFormSetValue } from 'react-hook-form'
import { Button } from 'antd'
import { useTranslation } from 'react-i18next'
import { DEFAULT_CURRENCY } from '@/lib/constants'
import { FormRow, NumberField, SelectField, TextAreaField, TextField } from '@/components/form/fields'
import { ACTION_ICONS } from '@/components/ui/RowActions'
import type { PurchaseBillFormValues } from '@/lib/validation'

const CURRENT_YEAR = new Date().getFullYear() + 1

export function PurchaseLineRow({
  index,
  control,
  setValue,
  getValues,
  supplierOptions,
  onRemove,
  canRemove,
}: {
  index: number
  control: Control<PurchaseBillFormValues>
  setValue: UseFormSetValue<PurchaseBillFormValues>
  getValues: UseFormGetValues<PurchaseBillFormValues>
  supplierOptions: { value: string; label: string }[]
  onRemove: () => void
  canRemove: boolean
}) {
  const { t } = useTranslation()

  const price = useWatch({ control, name: `lines.${index}.price` })
  // Tracks the price we last auto-copied into paidAmount, so we can tell
  // "still following price" apart from "the owner typed a different paid
  // amount on purpose" — most buying bills are paid in full, but a
  // partial payment (creating supplier debt) has to stick once entered,
  // even if the price is edited again afterward.
  const lastAutoValue = useRef(0)

  useEffect(() => {
    const currentPaid = getValues(`lines.${index}.paidAmount`)
    if (currentPaid === lastAutoValue.current) {
      setValue(`lines.${index}.paidAmount`, price ?? 0, { shouldValidate: true, shouldDirty: true })
      lastAutoValue.current = price ?? 0
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price])

  return (
    <div className="rounded-lg border border-line p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">
          {t('purchases.items')} #{index + 1}
        </span>
        {canRemove && (
          <Button type="text" danger size="small" icon={ACTION_ICONS.delete} onClick={onRemove}>
            {t('purchases.removeRow')}
          </Button>
        )}
      </div>

      <FormRow cols={3}>
        <TextField control={control} name={`lines.${index}.itemName`} label={t('purchases.itemName')} required placeholder="BMW X5 2020" />
        <SelectField control={control} name={`lines.${index}.supplierId`} label={t('purchases.supplier')} required options={supplierOptions} />
        <TextField control={control} name={`lines.${index}.chassisNumber`} label={t('purchases.chassisNumber')} required />
        <TextField control={control} name={`lines.${index}.motorNumber`} label={t('purchases.motorNumber')} required />
        <NumberField
          control={control}
          name={`lines.${index}.modelYear`}
          label={t('purchases.modelYear')}
          min={1950}
          max={CURRENT_YEAR}
          grouping={false}
        />
        <NumberField control={control} name={`lines.${index}.price`} label={t('purchases.price')} min={0} precision={2} suffix={DEFAULT_CURRENCY} />
        <NumberField
          control={control}
          name={`lines.${index}.paidAmount`}
          label={t('purchases.paidAmount')}
          hint={t('purchases.paidAmountHint')}
          min={0}
          precision={2}
          suffix={DEFAULT_CURRENCY}
        />
      </FormRow>

      <div className="mt-3">
        <TextAreaField control={control} name={`lines.${index}.description`} label={t('common.description')} rows={2} />
      </div>
    </div>
  )
}
