import { useState } from 'react'
import { Button } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import { useDeleteInternalEntryMutation, useGetInternalEntriesQuery, useGetInternalSummaryQuery } from '@/api/internalAccountsApi'
import { useTableQuery } from '@/lib/hooks/useTableQuery'
import { useDateRange } from '@/lib/hooks/useDateRange'
import { useNotify } from '@/lib/hooks/useNotify'
import { formatDate, formatMoney } from '@/lib/format'
import { DataTable } from '@/components/ui/DataTable'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { DateRangeFilter } from '@/components/ui/DateRangeFilter'
import { KpiCard } from '@/components/ui/KpiCard'
import { Money } from '@/components/ui/Money'
import { PageHeader, StatusBadge } from '@/components/ui/primitives'
import { ACTION_ICONS, RowActions } from '@/components/ui/RowActions'
import { UI_ICONS } from '@/components/layout/icons'
import type { InternalAccountEntry, InternalEntryType } from '@/types'
import { InternalEntryModal } from './InternalEntryModal'

/** Same colour per type in the table tags and the KPI tiles. */
const TYPE_TONE: Record<InternalEntryType, 'info' | 'warning'> = { paid: 'info', owed: 'warning' }

/**
 * The owner's side calculations: paid vs owed, with net = owed − paid. Plain records — they never reach the
 * ledger, capital, profit or the dashboard, which is why no mutation here touches those caches.
 */
export default function InternalAccountsPage() {
  const { t } = useTranslation()
  const notify = useNotify()

  const { value: range, setPreset, setCustomRange } = useDateRange('all')
  const dateParams = range.preset === 'all' ? {} : { from: range.from, to: range.to }
  const query = useTableQuery({ sortBy: 'date', sortOrder: 'descend' })
  const { data, isLoading, isFetching } = useGetInternalEntriesQuery({ ...query.params, ...dateParams })
  const { data: summary, isFetching: summaryFetching } = useGetInternalSummaryQuery({ search: query.params.search, ...dateParams })
  const [deleteEntry, { isLoading: deleting }] = useDeleteInternalEntryMutation()
  const summaryLoading = summaryFetching && summary === undefined

  const [editing, setEditing] = useState<InternalAccountEntry | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [target, setTarget] = useState<InternalAccountEntry | null>(null)

  const openForm = (entry: InternalAccountEntry | null) => {
    setEditing(entry)
    setFormOpen(true)
  }

  const handleDelete = async () => {
    if (!target) return
    try {
      await deleteEntry(target.id).unwrap()
      notify.success(t('messages.internalEntryDeleted'))
      setTarget(null)
    } catch (error) {
      notify.apiError(error, 'messages.deleteFailed')
    }
  }

  const columns: ColumnsType<InternalAccountEntry> = [
    { title: t('internalAccounts.itemName'), dataIndex: 'itemName', sorter: true, render: (value: string) => <span className="font-medium text-ink">{value}</span> },
    {
      title: t('internalAccounts.type'),
      dataIndex: 'type',
      sorter: true,
      render: (value: InternalEntryType) => <StatusBadge tone={TYPE_TONE[value]}>{t(`internalAccounts.${value}`)}</StatusBadge>,
    },
    { title: t('common.amount'), dataIndex: 'amount', sorter: true, align: 'right', render: (value: number) => <Money value={value} strong /> },
    { title: t('common.date'), dataIndex: 'date', sorter: true, render: (value: string) => <span className="whitespace-nowrap">{formatDate(value)}</span> },
    {
      title: t('common.notes'),
      dataIndex: 'notes',
      responsive: ['md'],
      render: (value: string | null) => (value ? <span className="line-clamp-2 max-w-md whitespace-pre-line text-muted">{value}</span> : <span className="text-subtle">—</span>),
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
            { key: 'edit', label: t('common.edit'), icon: ACTION_ICONS.edit, onClick: () => openForm(row) },
            { key: 'delete', label: t('common.delete'), icon: ACTION_ICONS.delete, danger: true, onClick: () => setTarget(row) },
          ]}
        />
      ),
    },
  ]

  const addButton = (
    <Button type="primary" icon={UI_ICONS.plus} onClick={() => openForm(null)}>
      {t('internalAccounts.add')}
    </Button>
  )

  return (
    <>
      <PageHeader
        title={t('internalAccounts.title')}
        subtitle={t('internalAccounts.subtitle')}
        actions={<DateRangeFilter value={range} onPreset={setPreset} onCustom={setCustomRange} allowAllTime dropdownOnly />}
      />

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard
            label={t('internalAccounts.paid')}
            value={<Money value={summary?.paid} />}
            icon={UI_ICONS.wallet}
            tone={TYPE_TONE.paid}
            loading={summaryLoading}
            footer={<span>{t('internalAccounts.entriesCount', { count: summary?.paidCount ?? 0 })}</span>}
          />
          <KpiCard
            label={t('internalAccounts.owed')}
            value={<Money value={summary?.owed} />}
            icon={UI_ICONS.alert}
            tone={TYPE_TONE.owed}
            loading={summaryLoading}
            footer={<span>{t('internalAccounts.entriesCount', { count: summary?.owedCount ?? 0 })}</span>}
          />
          <KpiCard
            label={t('internalAccounts.net')}
            value={<Money value={summary?.net} signed />}
            icon={UI_ICONS.coins}
            tone="primary"
            loading={summaryLoading}
            footer={<span>{t('internalAccounts.netHint')}</span>}
          />
        </div>

        <DataTable<InternalAccountEntry>
          rowKey="id"
          columns={columns}
          data={data}
          loading={isLoading || isFetching}
          query={query}
          searchPlaceholder={t('internalAccounts.searchPlaceholder')}
          actions={addButton}
          empty={{ title: t('internalAccounts.empty'), description: t('internalAccounts.emptyHint'), action: addButton }}
        />
      </div>

      <InternalEntryModal
        open={formOpen}
        entry={editing}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
      />

      <ConfirmModal
        open={Boolean(target)}
        loading={deleting}
        title={t('internalAccounts.deleteTitle')}
        description={t('internalAccounts.deleteBody', { name: target?.itemName ?? '', amount: formatMoney(target?.amount ?? 0) })}
        onConfirm={handleDelete}
        onCancel={() => setTarget(null)}
      />
    </>
  )
}
