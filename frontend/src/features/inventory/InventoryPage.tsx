import { useState } from 'react'
import dayjs from 'dayjs'
import { Button, Select } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import {
  useDeleteInventoryItemMutation,
  useGetInventoryBranchesQuery,
  useGetInventoryItemsQuery,
  useGetInventoryStatsQuery,
  useMarkInventoryItemAvailableMutation,
  useSetInventoryConsignmentMutation,
} from '@/api/inventoryApi'
import { useTableQuery } from '@/lib/hooks/useTableQuery'
import { useDateRange } from '@/lib/hooks/useDateRange'
import { useNotify } from '@/lib/hooks/useNotify'
import { formatDate } from '@/lib/format'
import { DataTable } from '@/components/ui/DataTable'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { DateRangeFilter } from '@/components/ui/DateRangeFilter'
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard'
import { Money } from '@/components/ui/Money'
import { PageHeader } from '@/components/ui/primitives'
import { ConsignmentTag, InventoryStatusTag } from '@/components/ui/StatusTags'
import { ActionPill } from '@/components/ui/ActionPill'
import { CloneButton } from '@/components/ui/CloneButton'
import { ACTION_ICONS, RowActions } from '@/components/ui/RowActions'
import { UI_ICONS } from '@/components/layout/icons'
import { round2 } from '@/lib/format'
import { ConsignmentDrawer } from '@/components/ui/ConsignmentDrawer'
import { ConsignmentModal } from '@/components/ui/ConsignmentModal'
import type { ConsignmentPayload, InventoryItem, InventoryItemStatus } from '@/types'
import { branchLabel } from './BranchSelect'
import { InventoryItemModal } from './InventoryItemModal'
import { MarkSoldModal } from './MarkSoldModal'
import { RecordInventoryPaymentModal } from './RecordInventoryPaymentModal'

const ROW_CLASS: Record<InventoryItemStatus, string> = {
  in_stock: '',
  partial_paid: 'row-warning',
  sold: 'row-sold',
  exceeded: 'row-accent',
}

/** "Remaining" reads as still-owed for partial_paid/sold, but flips meaning for exceeded — the buyer overpaid, so it's shown as their advance credit instead of a negative balance. */
function renderBalance(row: InventoryItem) {
  if (row.status === 'in_stock') return <span className="text-subtle">—</span>
  if (row.status === 'exceeded') return <Money value={round2(row.paidAmount - row.agreedPrice)} className="text-accent" strong />
  return <Money value={round2(row.agreedPrice - row.paidAmount)} className={row.status === 'partial_paid' ? 'text-warning' : undefined} />
}

export default function InventoryPage() {
  const { t, i18n } = useTranslation()
  const notify = useNotify()

  const { data: branches } = useGetInventoryBranchesQuery()
  const [branchIds, setBranchIds] = useState<string[]>([])
  const [statuses, setStatuses] = useState<InventoryItemStatus[]>([])
  const [consignment, setConsignment] = useState<'true' | 'false' | undefined>()
  const { value: purchaseRange, setPreset: setPurchaseRangePreset, setCustomRange: setPurchaseCustomRange } = useDateRange('all')
  const { value: saleRange, setPreset: setSaleRangePreset, setCustomRange: setSaleCustomRange } = useDateRange('all')

  const query = useTableQuery({ sortBy: 'createdAt', sortOrder: 'descend' })
  const { data, isLoading, isFetching } = useGetInventoryItemsQuery({
    ...query.params,
    branchId: branchIds.length ? branchIds.join(',') : undefined,
    status: statuses.length ? statuses.join(',') : undefined,
    consignment,
    // The sale date is a plain day; the purchase date is a timestamp, so it gets the user's exact start/end of day.
    ...(saleRange.preset === 'all' ? {} : { saleFrom: saleRange.from, saleTo: saleRange.to }),
    ...(purchaseRange.preset === 'all'
      ? {}
      : { purchaseFrom: dayjs(purchaseRange.from).startOf('day').toISOString(), purchaseTo: dayjs(purchaseRange.to).endOf('day').toISOString() }),
  })

  const { data: stats, isLoading: statsLoading } = useGetInventoryStatsQuery({ branchId: branchIds.length ? branchIds.join(',') : undefined })

  const [deleteItem, { isLoading: deleting }] = useDeleteInventoryItemMutation()
  const [markAvailable] = useMarkInventoryItemAvailableMutation()
  const [setItemConsignment, { isLoading: savingConsignment }] = useSetInventoryConsignmentMutation()

  const [consigning, setConsigning] = useState<InventoryItem | null>(null)
  const [unmarking, setUnmarking] = useState<InventoryItem | null>(null)
  const [viewingConsignment, setViewingConsignment] = useState<InventoryItem | null>(null)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [cloning, setCloning] = useState<InventoryItem | null>(null)
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

  const handleSaveConsignment = async (body: ConsignmentPayload) => {
    if (!consigning) return
    try {
      await setItemConsignment({ id: consigning.id, body }).unwrap()
      notify.success(t(consigning.isConsignment ? 'consignment.saved' : 'consignment.marked'))
      setConsigning(null)
    } catch (error) {
      notify.apiError(error)
    }
  }

  const handleClearConsignment = async () => {
    if (!unmarking) return
    try {
      await setItemConsignment({ id: unmarking.id, body: { isConsignment: false } }).unwrap()
      notify.success(t('consignment.cleared'))
      setUnmarking(null)
    } catch (error) {
      notify.apiError(error)
    }
  }

  const columns: ColumnsType<InventoryItem> = [
    {
      title: t('inventory.carType'),
      dataIndex: 'carType',
      render: (value: string, row) => (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {row.isConsignment ? (
            <button type="button" onClick={() => setViewingConsignment(row)} className="cursor-pointer font-medium text-ink hover:text-rose hover:underline">
              {value}
            </button>
          ) : (
            <span className="font-medium text-ink">{value}</span>
          )}
          {row.isConsignment && <ConsignmentTag details={row} onClick={() => setViewingConsignment(row)} />}
        </div>
      ),
    },
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
      render: (_, row) => renderBalance(row),
    },
    { title: t('common.status'), dataIndex: 'status', render: (value: InventoryItem['status']) => <InventoryStatusTag status={value} /> },
    {
      title: t('purchases.date'),
      dataIndex: 'createdAt',
      sorter: true,
      responsive: ['lg'],
      render: (value: string) => <span className="whitespace-nowrap">{formatDate(value)}</span>,
    },
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
      width: 260,
      fixed: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2">
          {row.status === 'in_stock' && (
            <ActionPill tone="success" icon={ACTION_ICONS.cash} onClick={() => setSelling(row)}>
              {t('inventory.markSold')}
            </ActionPill>
          )}
          {row.status === 'partial_paid' && (
            <ActionPill tone="warning" icon={ACTION_ICONS.cash} onClick={() => setPayingItem(row)}>
              {t('inventory.recordPayment')}
            </ActionPill>
          )}
          <CloneButton
            onClick={() => {
              setEditing(null)
              setCloning(row)
              setFormOpen(true)
            }}
          />
          <RowActions
            actions={[
              {
                key: 'consignment',
                label: row.isConsignment ? t('consignment.edit') : t('consignment.mark'),
                icon: ACTION_ICONS.handover,
                onClick: () => setConsigning(row),
              },
              {
                key: 'consignment-clear',
                label: t('consignment.unmark'),
                icon: ACTION_ICONS.restore,
                hidden: !row.isConsignment,
                onClick: () => setUnmarking(row),
              },
              {
                key: 'edit-sale',
                label: t('inventory.editSale'),
                icon: ACTION_ICONS.cash,
                hidden: row.status === 'in_stock',
                onClick: () => setSelling(row),
              },
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
                  setCloning(null)
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
        setCloning(null)
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
    { value: 'exceeded', label: t('status.exceeded') },
  ]

  return (
    <>
      <PageHeader
        title={t('inventory.title')}
        subtitle={t('inventory.subtitle')}
        actions={addButton}
      />

      <div className="mb-4">
        <KpiGrid>
          <KpiCard label={t('status.in_stock')} value={stats?.inStock ?? 0} icon={UI_ICONS.box} tone="info" loading={statsLoading} />
          <KpiCard label={t('status.sold')} value={stats?.sold ?? 0} icon={UI_ICONS.invoice} tone="success" loading={statsLoading} />
          <KpiCard label={t('consignment.label')} value={stats?.consignment ?? 0} icon={ACTION_ICONS.handover} tone="rose" loading={statsLoading} />
          <KpiCard
            label={t('inventory.kpiPartialExceeded')}
            value={(stats?.partialPaid ?? 0) + (stats?.exceeded ?? 0)}
            icon={UI_ICONS.alert}
            tone="warning"
            loading={statsLoading}
            footer={
              <>
                <span className="text-warning">
                  {stats?.partialPaid ?? 0} {t('status.partial_paid')}
                </span>
                <span className="text-accent">
                  {stats?.exceeded ?? 0} {t('status.exceeded')}
                </span>
              </>
            }
          />
        </KpiGrid>
      </div>

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
        <Select
          allowClear
          value={consignment}
          onChange={(value) => setConsignment(value)}
          options={[
            { value: 'true', label: t('consignment.only') },
            { value: 'false', label: t('consignment.exclude') },
          ]}
          placeholder={t('consignment.label')}
          style={{ minWidth: 180 }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted">{t('purchases.date')}</span>
          <DateRangeFilter value={purchaseRange} onPreset={setPurchaseRangePreset} onCustom={setPurchaseCustomRange} allowAllTime dropdownOnly />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted">{t('inventory.saleDate')}</span>
          <DateRangeFilter value={saleRange} onPreset={setSaleRangePreset} onCustom={setSaleCustomRange} allowAllTime dropdownOnly />
        </div>
      </div>

      <DataTable<InventoryItem>
        rowKey="id"
        columns={columns}
        data={data}
        loading={isLoading || isFetching}
        query={query}
        rowClassName={(row) => ROW_CLASS[row.status]}
        searchPlaceholder={`${t('inventory.carType')} · ${t('purchases.chassisNumber')} · ${t('sales.buyerName')}`}
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
                <dt className="text-[11px] font-medium tracking-wide text-subtle uppercase">{row.status === 'exceeded' ? t('inventory.advance') : t('inventory.remaining')}</dt>
                <dd className="mt-0.5 text-sm text-ink">{renderBalance(row)}</dd>
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
        cloneFrom={cloning}
        defaultBranchId={branchIds.length === 1 ? branchIds[0] : undefined}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
          setCloning(null)
        }}
      />

      <MarkSoldModal open={Boolean(selling)} item={selling} onClose={() => setSelling(null)} />

      <RecordInventoryPaymentModal open={Boolean(payingItem)} item={payingItem} onClose={() => setPayingItem(null)} />

      <ConsignmentDrawer
        open={Boolean(viewingConsignment)}
        title={viewingConsignment?.carType ?? ''}
        details={viewingConsignment}
        onClose={() => setViewingConsignment(null)}
        onEdit={() => {
          setConsigning(viewingConsignment)
          setViewingConsignment(null)
        }}
        onClear={() => {
          setUnmarking(viewingConsignment)
          setViewingConsignment(null)
        }}
      />

      <ConsignmentModal
        open={Boolean(consigning)}
        initial={consigning?.isConsignment ? consigning : null}
        loading={savingConsignment}
        onClose={() => setConsigning(null)}
        onSubmit={handleSaveConsignment}
      />

      <ConfirmModal
        open={Boolean(unmarking)}
        loading={savingConsignment}
        title={t('consignment.unmarkTitle')}
        description={t('consignment.unmarkBody', { name: unmarking?.carType ?? '' })}
        onConfirm={handleClearConsignment}
        onCancel={() => setUnmarking(null)}
      />

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
