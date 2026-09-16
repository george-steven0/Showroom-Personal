import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from 'antd'
import { useTranslation } from 'react-i18next'
import { useCreateFollowUpClientMutation, useUpdateFollowUpClientMutation } from '@/api/followUpApi'
import { followUpClientSchema, type FollowUpClientFormValues } from '@/lib/validation'
import { useNotify } from '@/lib/hooks/useNotify'
import { DateField, FormRow, NumberField, SelectField, TextAreaField, TextField } from '@/components/form/fields'
import { DEFAULT_CURRENCY } from '@/lib/constants'
import type { FollowUpClient } from '@/types'

export function FollowUpClientModal({ open, client, onClose }: { open: boolean; client: FollowUpClient | null; onClose: () => void }) {
  const { t } = useTranslation()
  const notify = useNotify()
  const [createClient, { isLoading: creating }] = useCreateFollowUpClientMutation()
  const [updateClient, { isLoading: updating }] = useUpdateFollowUpClientMutation()
  const isEdit = Boolean(client)

  const schema = useMemo(() => followUpClientSchema(t), [t])
  const form = useForm<FollowUpClientFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientName: '',
      phone: '',
      address: '',
      carType: '',
      carModel: '',
      modelYear: new Date().getFullYear(),
      color: '',
      agreedPrice: null,
      downPayment: null,
      rating: 'medium',
      status: 'following_up',
      notes: '',
      nextFollowUpDate: null,
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      clientName: client?.clientName ?? '',
      phone: client?.phone ?? '',
      address: client?.address ?? '',
      carType: client?.carType ?? '',
      carModel: client?.carModel ?? '',
      modelYear: client?.modelYear ?? new Date().getFullYear(),
      color: client?.color ?? '',
      agreedPrice: client?.agreedPrice ?? null,
      downPayment: client?.downPayment ?? null,
      rating: client?.rating ?? 'medium',
      status: client?.status ?? 'following_up',
      notes: client?.notes ?? '',
      nextFollowUpDate: client?.nextFollowUpDate ?? null,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, client?.id])

  const downPayment = useWatch({ control: form.control, name: 'downPayment' })
  const hasDownPayment = Boolean(downPayment && downPayment > 0)

  useEffect(() => {
    if (hasDownPayment) form.setValue('rating', 'very_likely', { shouldValidate: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasDownPayment])

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const body = {
        ...values,
        carModel: values.carModel || undefined,
        agreedPrice: values.agreedPrice ?? undefined,
        downPayment: values.downPayment ?? undefined,
        notes: values.notes || undefined,
        nextFollowUpDate: values.nextFollowUpDate || undefined,
      }
      if (isEdit && client) {
        await updateClient({ id: client.id, body }).unwrap()
        notify.success(t('messages.followUpClientUpdated'))
      } else {
        await createClient(body).unwrap()
        notify.success(t('messages.followUpClientSaved'))
      }
      onClose()
    } catch (error) {
      notify.apiError(error)
    }
  })

  return (
    <Modal
      open={open}
      title={isEdit ? t('followUp.editClientTitle') : t('followUp.addClientTitle')}
      onCancel={onClose}
      onOk={() => void onSubmit()}
      okText={isEdit ? t('common.saveChanges') : t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={creating || updating}
      width={680}
      destroyOnHidden
    >
      <form onSubmit={onSubmit} className="pt-2" noValidate>
        <FormRow cols={2}>
          <TextField control={form.control} name="clientName" label={t('followUp.clientName')} required autoFocus />
          <TextField control={form.control} name="phone" label={t('common.phone')} required />
          <TextField control={form.control} name="address" label={t('common.address')} required className="col-span-2" />
        </FormRow>

        <div className="mt-4">
          <FormRow cols={2}>
            <TextField control={form.control} name="carType" label={t('followUp.carType')} required />
            <TextField control={form.control} name="carModel" label={t('followUp.carModel')} />
            <NumberField control={form.control} name="modelYear" label={t('purchases.modelYear')} required precision={0} grouping={false} />
            <TextField control={form.control} name="color" label={t('inventory.color')} required />
          </FormRow>
        </div>

        <div className="mt-4">
          <FormRow cols={2}>
            <NumberField control={form.control} name="agreedPrice" label={t('followUp.agreedPrice')} precision={2} suffix={DEFAULT_CURRENCY} />
            <NumberField control={form.control} name="downPayment" label={t('followUp.downPayment')} precision={2} suffix={DEFAULT_CURRENCY} />
          </FormRow>
        </div>

        <div className="mt-4">
          <FormRow cols={3}>
            <SelectField
              control={form.control}
              name="rating"
              label={t('followUp.ratingLabel')}
              required
              disabled={hasDownPayment}
              hint={hasDownPayment ? t('followUp.ratingAutoHint') : undefined}
              options={[
                { value: 'very_likely', label: t('followUp.rating.very_likely') },
                { value: 'medium', label: t('followUp.rating.medium') },
                { value: 'unlikely', label: t('followUp.rating.unlikely') },
              ]}
            />
            <SelectField
              control={form.control}
              name="status"
              label={t('common.status')}
              required
              options={[
                { value: 'following_up', label: t('followUp.status.following_up') },
                { value: 'converted', label: t('followUp.status.converted') },
                { value: 'lost', label: t('followUp.status.lost') },
              ]}
            />
            <DateField control={form.control} name="nextFollowUpDate" label={t('followUp.nextFollowUpDate')} />
          </FormRow>
        </div>

        <div className="mt-4">
          <TextAreaField control={form.control} name="notes" label={t('common.notes')} rows={2} />
        </div>
      </form>
    </Modal>
  )
}
