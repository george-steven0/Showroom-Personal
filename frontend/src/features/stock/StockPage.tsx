import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input, Select, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import { useGetAvailablePurchaseLinesQuery, useSetLineConsignmentMutation } from '@/api/purchaseBillsApi'
import { useNotify } from '@/lib/hooks/useNotify'
import { formatDate, round2 } from '@/lib/format'
import { EmptyState, PageHeader, SectionCard } from '@/components/ui/primitives'
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard'
import { Money } from '@/components/ui/Money'
import { ActionPill } from '@/components/ui/ActionPill'
import { ACTION_ICONS, RowActions } from '@/components/ui/RowActions'
import { ConsignmentTag } from '@/components/ui/StatusTags'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { ConsignmentDrawer } from '@/components/ui/ConsignmentDrawer'
import { ConsignmentModal } from '@/components/ui/ConsignmentModal'
import { UI_ICONS } from '@/components/layout/icons'
import type { ConsignmentPayload, PurchaseBillLine } from '@/types'

export default function StockPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const notify = useNotify()
  const [search, setSearch] = useState('')
  const [consignment, setConsignment] = useState<'true' | 'false' | undefined>()

  const { data, isLoading } = useGetAvailablePurchaseLinesQuery()
  const [setLineConsignment, { isLoading: savingConsignment }] = useSetLineConsignmentMutation()
  const [consigning, setConsigning] = useState<PurchaseBillLine | null>(null)
  const [unmarking, setUnmarking] = useState<PurchaseBillLine | null>(null)
  const [viewingConsignment, setViewingConsignment] = useState<PurchaseBillLine | null>(null)

  const lines = data ?? []
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return lines.filter((line) => {
      if (consignment && line.isConsignment !== (consignment === 'true')) return false
      if (!term) return true
      return [line.itemName, line.chassisNumber, line.motorNumber, line.supplierName, line.consignmentTraderName ?? ''].some((field) => field.toLowerCase().includes(term))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, search, consignment])

  const handleSaveConsignment = async (body: ConsignmentPayload) => {
    if (!consigning) return
    try {
      await setLineConsignment({ id: consigning.id, body }).unwrap()
      notify.success(t(consigning.isConsignment ? 'consignment.saved' : 'consignment.marked'))
      setConsigning(null)
    } catch (error) {
      notify.apiError(error)
    }
  }

  const handleClearConsignment = async () => {
    if (!unmarking) return
    try {
      await setLineConsignment({ id: unmarking.id, body: { isConsignment: false } }).unwrap()
      notify.success(t('consignment.cleared'))
      setUnmarking(null)
    } catch (error) {
      notify.apiError(error)
    }
  }

  const totalValue = round2(lines.reduce((sum, line) => sum + line.price, 0))

  const columns: ColumnsType<PurchaseBillLine> = [
    {
      title: t('purchases.itemName'),
      dataIndex: 'itemName',
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
    { title: t('purchases.chassisNumber'), dataIndex: 'chassisNumber', render: (value: string) => <span className="ltr-code">{value}</span> },
    { title: t('purchases.motorNumber'), dataIndex: 'motorNumber', responsive: ['lg'], render: (value: string) => <span className="ltr-code">{value}</span> },
    { title: t('purchases.modelYear'), dataIndex: 'modelYear', responsive: ['lg'], render: (value: number | null) => value ?? '—' },
    { title: t('purchases.supplier'), dataIndex: 'supplierName' },
    { title: t('sales.buyingDate'), dataIndex: 'purchaseDate', render: (value: string) => <span className="whitespace-nowrap">{formatDate(value)}</span> },
    { title: t('purchases.price'), dataIndex: 'price', align: 'right', render: (value: number) => <Money value={value} strong /> },
    {
      title: t('accounts.owed'),
      dataIndex: 'owed',
      align: 'right',
      render: (value: number) => (value > 0 ? <Money value={value} className="text-danger" /> : <span className="text-subtle">—</span>),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      align: 'right',
      width: 150,
      fixed: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2">
          <ActionPill tone="success" icon={ACTION_ICONS.cash} onClick={() => navigate(`/selling-bills/new?lineId=${row.id}`)}>
            {t('stock.sell')}
          </ActionPill>
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
            ]}
          />
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader title={t('stock.title')} subtitle={t('stock.subtitle')} />

      <div className="space-y-4">
        <KpiGrid>
          <KpiCard label={t('accounts.carsInStock')} value={lines.length} icon={UI_ICONS.car} tone="info" loading={isLoading} />
          <KpiCard
            label={t('stock.totalValue')}
            value={<Money value={totalValue} />}
            icon={UI_ICONS.wallet}
            tone="primary"
            loading={isLoading}
            footer={<span>{t('stock.carsCount', { count: lines.length })}</span>}
          />
        </KpiGrid>

        <SectionCard bodyClassName="p-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-3 sm:p-4">
            <Input.Search
              allowClear
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`${t('purchases.itemName')} · ${t('purchases.chassisNumber')} · ${t('purchases.supplier')}`}
              className="w-full sm:max-w-xs"
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
          </div>

          {filtered.length === 0 && !isLoading ? (
            <div className="p-4 sm:p-5">
              <EmptyState compact title={t('stock.empty')} description={t('stock.emptyHint')} />
            </div>
          ) : (
            <Table<PurchaseBillLine>
              rowKey="id"
              size="middle"
              dataSource={filtered}
              loading={isLoading}
              pagination={false}
              scroll={{ x: 'max-content' }}
              columns={columns}
            />
          )}
        </SectionCard>
      </div>

      <ConsignmentDrawer
        open={Boolean(viewingConsignment)}
        title={viewingConsignment?.itemName ?? ''}
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
        description={t('consignment.unmarkBody', { name: unmarking?.itemName ?? '' })}
        onConfirm={handleClearConsignment}
        onCancel={() => setUnmarking(null)}
      />
    </>
  )
}
