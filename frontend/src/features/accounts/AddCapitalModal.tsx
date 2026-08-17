import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from 'antd'
import { useTranslation } from 'react-i18next'
import { useInjectCapitalMutation } from '@/api/capitalApi'
import { capitalInjectionSchema, type CapitalInjectionFormValues } from '@/lib/validation'
import { useNotify } from '@/lib/hooks/useNotify'
import { todayIso } from '@/lib/format'
import { DateField, FormRow, NumberField, TextAreaField } from '@/components/form/fields'
import { DEFAULT_CURRENCY } from '@/lib/constants'

export function AddCapitalModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const notify = useNotify()
  const [injectCapital, { isLoading }] = useInjectCapitalMutation()

  const schema = useMemo(() => capitalInjectionSchema(t), [t])
  const form = useForm<CapitalInjectionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: 0, date: todayIso(), note: '' },
  })

  useEffect(() => {
    if (open) form.reset({ amount: 0, date: todayIso(), note: '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await injectCapital(values).unwrap()
      notify.success(t('messages.capitalAdded'))
      onClose()
    } catch (error) {
      notify.apiError(error)
    }
  })

  return (
    <Modal
      open={open}
      title={t('accounts.addCapitalTitle')}
      onCancel={onClose}
      onOk={() => void onSubmit()}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={isLoading}
      width={420}
      destroyOnHidden
    >
      <form onSubmit={onSubmit} className="pt-2" noValidate>
        <FormRow cols={1}>
          <NumberField control={form.control} name="amount" label={t('accounts.capitalAmount')} required min={0} precision={2} suffix={DEFAULT_CURRENCY} autoFocus />
          <DateField control={form.control} name="date" label={t('common.date')} required maxToday />
          <TextAreaField control={form.control} name="note" label={t('accounts.capitalNote')} rows={2} />
        </FormRow>
      </form>
    </Modal>
  )
}
