import { useState, type ReactNode } from 'react'
import { Button, Dropdown, Segmented, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import { useDeleteFollowUpClientMutation, useGetFollowUpClientsQuery, useUpdateFollowUpClientMutation, type FollowUpClientPayload } from '@/api/followUpApi'
import { useTableQuery } from '@/lib/hooks/useTableQuery'
import { useDateRange } from '@/lib/hooks/useDateRange'
import { useNotify } from '@/lib/hooks/useNotify'
import { formatDate } from '@/lib/format'
import { DataTable } from '@/components/ui/DataTable'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { DateRangeFilter } from '@/components/ui/DateRangeFilter'
import { Money } from '@/components/ui/Money'
import { PageHeader } from '@/components/ui/primitives'
import { FollowUpRatingTag, FollowUpStatusTag } from '@/components/ui/StatusTags'
import { ACTION_ICONS, RowActions } from '@/components/ui/RowActions'
import { UI_ICONS } from '@/components/layout/icons'
import type { FollowUpClient, FollowUpRating, FollowUpStatus } from '@/types'
import { FollowUpClientModal } from './FollowUpClientModal'

type RatingFilter = FollowUpRating | 'all'
type StatusFilter = FollowUpStatus | 'all'

const ROW_CLASS: Record<FollowUpRating, string> = {
  very_likely: 'row-success',
  medium: 'row-warning',
  unlikely: '',
}

/** A tag that opens a dropdown of the same options on click, for a quick change without opening the edit form. */
function QuickPickTag<T extends string>({
  value,
  options,
  disabledValues,
  render,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  disabledValues?: T[]
  render: (value: T) => ReactNode
  onChange: (value: T) => void
}) {
  return (
    <Dropdown
      trigger={['click']}
      menu={{
        selectedKeys: [value],
        items: options.map((option) => ({ key: option.value, label: option.label, disabled: disabledValues?.includes(option.value) })),
        onClick: ({ key }) => {
          if (key !== value) onChange(key as T)
        },
      }}
    >
      <button type="button" className="cursor-pointer rounded-full transition-opacity hover:opacity-80">
        {render(value)}
      </button>
    </Dropdown>
  )
}

export default function FollowUpPage() {
  const { t } = useTranslation()
  const notify = useNotify()

  const { value: range, setPreset, setCustomRange } = useDateRange('all')
  const [rating, setRating] = useState<RatingFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')

  const query = useTableQuery({ sortBy: 'createdAt', sortOrder: 'descend' })
  const { data, isLoading, isFetching } = useGetFollowUpClientsQuery({
    ...query.params,
    rating: rating === 'all' ? undefined : rating,
    status: status === 'all' ? undefined : status,
    ...(range.preset === 'all' ? {} : { from: range.from, to: range.to }),
  })

  const [deleteClient, { isLoading: deleting }] = useDeleteFollowUpClientMutation()
  const [updateClient] = useUpdateFollowUpClientMutation()

  const [editing, setEditing] = useState<FollowUpClient | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [target, setTarget] = useState<FollowUpClient | null>(null)

  const handleDelete = async () => {
    if (!target) return
    try {
      await deleteClient(target.id).unwrap()
      notify.success(t('messages.followUpClientDeleted'))
      setTarget(null)
    } catch (error) {
      notify.apiError(error, 'messages.deleteFailed')
    }
  }

  /** The update endpoint replaces the whole record, so a quick one-field change still sends everything else as-is. */
  const buildPayload = (row: FollowUpClient, patch: Partial<FollowUpClientPayload>): FollowUpClientPayload => ({
    clientName: row.clientName,
    phone: row.phone,
    address: row.address,
    carType: row.carType,
    carModel: row.carModel ?? undefined,
    modelYear: row.modelYear,
    color: row.color,
    agreedPrice: row.agreedPrice ?? undefined,
    downPayment: row.downPayment ?? undefined,
    rating: row.rating,
    status: row.status,
    notes: row.notes ?? undefined,
    nextFollowUpDate: row.nextFollowUpDate ?? undefined,
    ...patch,
  })

  const handleQuickUpdate = async (row: FollowUpClient, patch: Partial<FollowUpClientPayload>) => {
    try {
      await updateClient({ id: row.id, body: buildPayload(row, patch) }).unwrap()
      notify.success(t('messages.followUpClientUpdated'))
    } catch (error) {
      notify.apiError(error)
    }
  }

  const today = formatDate(new Date().toISOString(), 'YYYY-MM-DD')

  const columns: ColumnsType<FollowUpClient> = [
    { title: t('followUp.clientName'), dataIndex: 'clientName', render: (value: string) => <span className="font-medium text-ink">{value}</span> },
    { title: t('common.phone'), dataIndex: 'phone', render: (value: string) => <span className="ltr-code">{value}</span> },
    {
      title: t('followUp.carType'),
      key: 'car',
      render: (_, row) => (
        <span>
          {row.carType}
          {row.carModel && <span className="text-muted"> · {row.carModel}</span>}
        </span>
      ),
    },
    { title: t('purchases.modelYear'), dataIndex: 'modelYear', responsive: ['lg'] },
    { title: t('inventory.color'), dataIndex: 'color', responsive: ['xl'], render: (value: string) => value ?? <span className="text-subtle">—</span> },
    {
      title: t('followUp.agreedPrice'),
      dataIndex: 'agreedPrice',
      align: 'right',
      responsive: ['lg'],
      render: (value: number | null) => (value != null ? <Money value={value} /> : <span className="text-subtle">—</span>),
    },
    {
      title: t('followUp.downPayment'),
      dataIndex: 'downPayment',
      align: 'right',
      render: (value: number | null) => (value != null && value > 0 ? <Money value={value} strong className="text-success" /> : <span className="text-subtle">—</span>),
    },
    {
      title: t('followUp.ratingLabel'),
      dataIndex: 'rating',
      render: (value: FollowUpRating, row) => (
        <Tooltip title={row.downPayment && row.downPayment > 0 ? t('followUp.ratingAutoHint') : undefined}>
          <QuickPickTag<FollowUpRating>
            value={value}
            options={[
              { value: 'very_likely', label: t('followUp.rating.very_likely') },
              { value: 'medium', label: t('followUp.rating.medium') },
              { value: 'unlikely', label: t('followUp.rating.unlikely') },
            ]}
            disabledValues={row.downPayment && row.downPayment > 0 ? (['medium', 'unlikely'] as FollowUpRating[]) : undefined}
            render={(rating) => <FollowUpRatingTag rating={rating} />}
            onChange={(rating) => handleQuickUpdate(row, { rating })}
          />
        </Tooltip>
      ),
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      render: (value: FollowUpStatus, row) => (
        <QuickPickTag<FollowUpStatus>
          value={value}
          options={[
            { value: 'following_up', label: t('followUp.status.following_up') },
            { value: 'converted', label: t('followUp.status.converted') },
            { value: 'lost', label: t('followUp.status.lost') },
          ]}
          render={(status) => <FollowUpStatusTag status={status} />}
          onChange={(status) => handleQuickUpdate(row, { status })}
        />
      ),
    },
    {
      title: t('followUp.nextFollowUpDate'),
      dataIndex: 'nextFollowUpDate',
      responsive: ['lg'],
      render: (value: string | null, row) => {
        if (!value) return <span className="text-subtle">—</span>
        const overdue = value.slice(0, 10) < today && row.status === 'following_up'
        return <span className={overdue ? 'font-medium text-danger' : ''}>{formatDate(value)}</span>
      },
    },
    {
      title: t('common.notes'),
      dataIndex: 'notes',
      responsive: ['xl'],
      ellipsis: { showTitle: false },
      render: (value: string | null) =>
        value ? (
          <Tooltip title={value}>
            <span className="block max-w-55 truncate text-muted">{value}</span>
          </Tooltip>
        ) : (
          <span className="text-subtle">—</span>
        ),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      align: 'right',
      width: 60,
      fixed: 'right',
      render: (_, row) => (
        <RowActions
          actions={[
            {
              key: 'edit',
              label: t('common.edit'),
              icon: ACTION_ICONS.edit,
              onClick: () => {
                setEditing(row)
                setFormOpen(true)
              },
            },
            { key: 'delete', label: t('common.delete'), icon: ACTION_ICONS.delete, danger: true, onClick: () => setTarget(row) },
          ]}
        />
      ),
    },
  ]

  const addButton = (
    <Button
      type="primary"
      icon={UI_ICONS.plus}
      onClick={() => {
        setEditing(null)
        setFormOpen(true)
      }}
    >
      {t('followUp.addClient')}
    </Button>
  )

  return (
    <>
      <PageHeader
        title={t('followUp.title')}
        subtitle={t('followUp.subtitle')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DateRangeFilter value={range} onPreset={setPreset} onCustom={setCustomRange} allowAllTime />
            {addButton}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented
          value={rating}
          onChange={(value) => setRating(value as RatingFilter)}
          options={[
            { value: 'all', label: t('common.all') },
            { value: 'very_likely', label: t('followUp.rating.very_likely') },
            { value: 'medium', label: t('followUp.rating.medium') },
            { value: 'unlikely', label: t('followUp.rating.unlikely') },
          ]}
        />
        <Segmented
          value={status}
          onChange={(value) => setStatus(value as StatusFilter)}
          options={[
            { value: 'all', label: t('common.all') },
            { value: 'following_up', label: t('followUp.status.following_up') },
            { value: 'converted', label: t('followUp.status.converted') },
            { value: 'lost', label: t('followUp.status.lost') },
          ]}
        />
      </div>

      <DataTable<FollowUpClient>
        rowKey="id"
        columns={columns}
        data={data}
        loading={isLoading || isFetching}
        query={query}
        rowClassName={(row) => ROW_CLASS[row.rating]}
        searchPlaceholder={`${t('followUp.clientName')} · ${t('common.phone')} · ${t('followUp.carType')}`}
        empty={{ title: t('followUp.empty'), description: t('followUp.emptyHint'), action: addButton }}
      />

      <FollowUpClientModal
        open={formOpen}
        client={editing}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
      />

      <ConfirmModal
        open={Boolean(target)}
        loading={deleting}
        title={t('followUp.deleteClientTitle')}
        description={t('followUp.deleteClientBody', { name: target?.clientName ?? '' })}
        onConfirm={handleDelete}
        onCancel={() => setTarget(null)}
      />
    </>
  )
}
