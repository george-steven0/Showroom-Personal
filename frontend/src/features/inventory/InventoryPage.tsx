import { useState } from 'react'
import { Button, Select } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import {
  useDeleteInventoryItemMutation,
  useGetInventoryBranchesQuery,
  useGetInventoryItemsQuery,
  useMarkInventoryItemAvailableMutation,
} from '@/api/inventoryApi'
import { useTableQuery } from '@/lib/hooks/useTableQuery'
import { useDateRange } from '@/lib/hooks/useDateRange'
import { useNotify } from '@/lib/hooks/useNotify'
import { formatDate } from '@/lib/format'
import { DataTable } from '@/components/ui/DataTable'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { DateRangeFilter } from '@/components/ui/DateRangeFilter'
import { Money } from '@/components/ui/Money'
import { PageHeader } from '@/components/ui/primitives'
import { InventoryStatusTag } from '@/components/ui/StatusTags'
import { ACTION_ICONS, RowActions } from '@/components/ui/RowActions'
import { UI_ICONS } from '@/components/layout/icons'
import { round2 } from '@/lib/format'
import type { InventoryItem, InventoryItemStatus } from '@/types'
import { branchLabel } from './BranchSelect'
import { InventoryItemModal } from './InventoryItemModal'
import { MarkSoldModal } from './MarkSoldModal'
import { RecordInventoryPaymentModal } from './RecordInventoryPaymentModal'

export default function InventoryPage() {
  const { t, i18n } = useTranslation()
  const notify = useNotify()

  const { data: branches } = useGetInventoryBranchesQuery()
  const [branchIds, setBranchIds] = useState<string[]>([])
  const [statuses, setStatuses] = useState<InventoryItemStatus[]>([])
  const { value: saleRange, setPreset: setSaleRangePreset, setCustomRange: setSaleCustomRange } = useDateRange('all')

  const query = useTableQuery({ sortBy: 'createdAt', sortOrder: 'descend' })
  const { data, isLoading, isFetching } = useGetInventoryItemsQuery({
    ...query.params,
    branchId: branchIds.length ? branchIds.join(',') : undefined,
    status: statuses.length ? statuses.join(',') : undefined,
    ...(saleRange.preset === 'all' ? {} : { from: saleRange.from, to: saleRange.to }),
  })

  const [deleteItem, { isLoading: deleting }] = useDeleteInventoryItemMutation()
  const [markAvailable] = useMarkInventoryItemAvailableMutation()

  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [selling, setSelling] = useState<InventoryItem | null>(null)
  const [payingItem, setPayingItem] = useState<InventoryItem | null>(null)
  const [target, setTarget] = useState<InventoryItem | null>(null)

  const handleDelete = async () => {
    if (!target) return
    try {
      await deleteItem(target.id).unwrap()
      notify.success(t('messages.inventoryItemDeleted'))
      setTarget(null)
    } catch (error) {
      notify.apiError(error, 'messages.deleteFailed')
    }
  }

  const handleMarkAvailable = async (item: InventoryItem) => {
    try {
      await markAvailable(item.id).unwrap()
      notify.success(t('inventory.markedAvailable'))
    } catch (error) {
      notify.apiError(error)
    }
  }

  const columns: ColumnsType<InventoryItem> = [
    { title: t('inventory.carType'), dataIndex: 'carType', render: (value: string) => <span className="font-medium text-ink">{value}</span> },
    { title: t('inventory.brand'), dataIndex: 'brand', responsive: ['lg'], render: (value: string | null) => value ?? <span className="text-subtle">—</span> },
    { title: t('inventory.trimLevel'), dataIndex: 'trimLevel', responsive: ['lg'], render: (value: string | null) => value ?? <span className="text-subtle">—</span> },
    {
      title: t('purchases.chassisNumber'),
      dataIndex: 'chassisNumber',
      responsive: ['lg'],
      render: (value: string | null) => (value ? <span className="ltr-code">{value}</span> : <span className="text-subtle">—</span>),
    },
    { title: t('purchases.modelYear'), dataIndex: 'modelYear', responsive: ['xl'], render: (value: number | null) => value ?? '—' },
    { title: t('inventory.color'), dataIndex: 'color', responsive: ['xl'], render: (value: string | null) => value ?? <span className="text-subtle">—</span> },
    { title: t('inventory.branch'), key: 'branch', render: (_, row) => branchLabel(row.branch, i18n.language) },
    { title: t('inventory.traderSellPrice'), dataIndex: 'traderSellPrice', align: 'right', responsive: ['xl'], render: (value: number) => <Money value={value} /> },
    { title: t('inventory.agreedPrice'), dataIndex: 'agreedPrice', align: 'right', render: (value: number) => <Money value={value} strong /> },
    {
      title: t('inventory.remaining'),
      key: 'remaining',
      align: 'right',
      render: (_, row) =>
        row.status === 'in_stock' ? <span className="text-subtle">—</span> : <Money value={round2(row.agreedPrice - row.paidAmount)} className={row.status === 'partial_paid' ? 'text-warning' : undefined} />,
    },
    { title: t('common.status'), dataIndex: 'status', render: (value: InventoryItem['status']) => <InventoryStatusTag status={value} /> },
    {
      title: t('inventory.saleDate'),
      dataIndex: 'saleDate',
      responsive: ['lg'],
      render: (value: string | null) => (value ? formatDate(value) : <span className="text-subtle">—</span>),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      align: 'right',
      width: 170,
      fixed: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2">
          {row.status === 'in_stock' && (
            <button
              type="button"
              onClick={() => setSelling(row)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-medium whitespace-nowrap text-success ring-1 ring-inset ring-success/25 transition-colors hover:bg-success hover:text-white hover:ring-success"
            >
              {ACTION_ICONS.cash}
              {t('inventory.markSold')}
            </button>
          )}
          {row.status === 'partial_paid' && (
            <button
              type="button"
              onClick={() => setPayingItem(row)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-warning-soft px-3 py-1 text-xs font-medium whitespace-nowrap text-warning ring-1 ring-inset ring-warning/25 transition-colors hover:bg-warning hover:text-white hover:ring-warning"
            >
              {ACTION_ICONS.cash}
              {t('inventory.recordPayment')}
            </button>
          )}
          <RowActions
            actions={[
              {
                key: 'unsell',
                label: t('inventory.markAvailable'),
                icon: ACTION_ICONS.restore,
                hidden: row.status === 'in_stock',
                onClick: () => handleMarkAvailable(row),
              },
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
        </div>
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
      {t('inventory.addItem')}
    </Button>
  )

  const branchOptions = (branches ?? []).map((branch) => ({ label: branchLabel(branch, i18n.language), value: branch.id }))
  const statusOptions = [
    { value: 'in_stock', label: t('status.in_stock') },
    { value: 'partial_paid', label: t('status.partial_paid') },
    { value: 'sold', label: t('status.sold') },
  ]

  return (
    <>
      <PageHeader
        title={t('inventory.title')}
        subtitle={t('inventory.subtitle')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted">{t('inventory.saleDate')}</span>
            <DateRangeFilter value={saleRange} onPreset={setSaleRangePreset} onCustom={setSaleCustomRange} allowAllTime />
            {addButton}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          mode="multiple"
          allowClear
          value={branchIds}
          onChange={(value) => setBranchIds(value)}
          options={branchOptions}
          placeholder={t('inventory.branch')}
          maxTagCount="responsive"
          style={{ minWidth: 220 }}
        />
        <Select
          mode="multiple"
          allowClear
          value={statuses}
          onChange={(value) => setStatuses(value as InventoryItemStatus[])}
          options={statusOptions}
          placeholder={t('common.status')}
          maxTagCount="responsive"
          style={{ minWidth: 220 }}
        />
      </div>

      <DataTable<InventoryItem>
        rowKey="id"
        columns={columns}
        data={data}
        loading={isLoading || isFetching}
        query={query}
        rowClassName={(row) => (row.status === 'sold' ? 'row-sold' : row.status === 'partial_paid' ? 'row-warning' : '')}
        searchPlaceholder={`${t('inventory.carType')} · ${t('purchases.chassisNumber')}`}
        empty={{ title: t('inventory.empty'), description: t('inventory.emptyHint'), action: addButton }}
        expandable={{
          rowExpandable: (row) => row.status !== 'in_stock',
          expandedRowRender: (row) => (
            <dl className="grid grid-cols-2 gap-3 py-1 sm:grid-cols-4">
              <div>
                <dt className="text-[11px] font-medium tracking-wide text-subtle uppercase">{t('sales.buyerName')}</dt>
                <dd className="mt-0.5 text-sm text-ink">{row.buyerName}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium tracking-wide text-subtle uppercase">{t('sales.buyerPhone')}</dt>
                <dd className="mt-0.5 text-sm text-ink">{row.buyerPhone ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium tracking-wide text-subtle uppercase">{t('sales.buyerAddress')}</dt>
                <dd className="mt-0.5 text-sm text-ink">{row.buyerAddress ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium tracking-wide text-subtle uppercase">{t('inventory.saleDate')}</dt>
                <dd className="mt-0.5 text-sm text-ink">{row.saleDate ? formatDate(row.saleDate) : '—'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium tracking-wide text-subtle uppercase">{t('inventory.paidAmount')}</dt>
                <dd className="mt-0.5 text-sm text-ink">
                  <Money value={row.paidAmount} />
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium tracking-wide text-subtle uppercase">{t('inventory.remaining')}</dt>
                <dd className="mt-0.5 text-sm text-ink">
                  <Money value={round2(row.agreedPrice - row.paidAmount)} className={row.status === 'partial_paid' ? 'text-warning' : undefined} />
                </dd>
              </div>
              {row.saleNotes && (
                <div className="col-span-2 sm:col-span-4">
                  <dt className="text-[11px] font-medium tracking-wide text-subtle uppercase">{t('common.notes')}</dt>
                  <dd className="mt-0.5 text-sm text-ink">{row.saleNotes}</dd>
                </div>
              )}
            </dl>
          ),
        }}
      />

      <InventoryItemModal
        open={formOpen}
        item={editing}
        defaultBranchId={branchIds.length === 1 ? branchIds[0] : undefined}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
      />

      <MarkSoldModal open={Boolean(selling)} item={selling} onClose={() => setSelling(null)} />

      <RecordInventoryPaymentModal open={Boolean(payingItem)} item={payingItem} onClose={() => setPayingItem(null)} />

      <ConfirmModal
        open={Boolean(target)}
        loading={deleting}
        title={t('inventory.deleteItemTitle')}
        description={t('inventory.deleteItemBody', { name: target?.carType ?? '' })}
        onConfirm={handleDelete}
        onCancel={() => setTarget(null)}
      />
    </>
  )
}
