import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from 'antd'
import { useTranslation } from 'react-i18next'
import { useCreateExpenseMutation, useUpdateExpenseMutation } from '@/api/expensesApi'
import { expenseSchema, type ExpenseFormValues } from '@/lib/validation'
import { useNotify } from '@/lib/hooks/useNotify'
import { todayIso } from '@/lib/format'
import { DateField, FormRow, NumberField, TextAreaField, TextField } from '@/components/form/fields'
import { DEFAULT_CURRENCY } from '@/lib/constants'
import type { Expense } from '@/types'

export function ExpenseModal({ open, expense, onClose }: { open: boolean; expense: Expense | null; onClose: () => void }) {
  const { t } = useTranslation()
  const notify = useNotify()
  const [createExpense, { isLoading: creating }] = useCreateExpenseMutation()
  const [updateExpense, { isLoading: updating }] = useUpdateExpenseMutation()
  const isEdit = Boolean(expense)

  const schema = useMemo(() => expenseSchema(t), [t])
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', amount: 0, date: todayIso(), note: '' },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      name: expense?.name ?? '',
      amount: expense?.amount ?? 0,
      date: expense?.date ?? todayIso(),
      note: expense?.note ?? '',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expense?.id])

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (isEdit && expense) {
        await updateExpense({ id: expense.id, body: values }).unwrap()
        notify.success(t('messages.expenseUpdated'))
      } else {
        await createExpense(values).unwrap()
        notify.success(t('messages.expenseSaved'))
      }
      onClose()
    } catch (error) {
      notify.apiError(error)
    }
  })

  return (
    <Modal
      open={open}
      title={isEdit ? t('accounts.editExpenseTitle') : t('accounts.addExpenseTitle')}
      onCancel={onClose}
      onOk={() => void onSubmit()}
      okText={isEdit ? t('common.saveChanges') : t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={creating || updating}
      width={460}
      destroyOnHidden
    >
      <form onSubmit={onSubmit} className="pt-2" noValidate>
        <FormRow cols={1}>
          <TextField control={form.control} name="name" label={t('accounts.expenseName')} required autoFocus />
          <NumberField control={form.control} name="amount" label={t('common.amount')} required min={0} precision={2} suffix={DEFAULT_CURRENCY} />
          <DateField control={form.control} name="date" label={t('common.date')} required maxToday />
          <TextAreaField control={form.control} name="note" label={t('common.note')} rows={2} />
        </FormRow>
      </form>
    </Modal>
  )
}
