import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import { useGetAvailablePurchaseLinesQuery } from '@/api/purchaseBillsApi'
import { formatDate, round2 } from '@/lib/format'
import { EmptyState, PageHeader, SectionCard } from '@/components/ui/primitives'
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard'
import { Money } from '@/components/ui/Money'
import { UI_ICONS } from '@/components/layout/icons'
import type { PurchaseBillLine } from '@/types'

export default function StockPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { data, isLoading } = useGetAvailablePurchaseLinesQuery()

  const lines = data ?? []
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return lines
    return lines.filter((line) =>
      [line.itemName, line.chassisNumber, line.motorNumber, line.supplierName].some((field) => field.toLowerCase().includes(term)),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, search])

  const totalValue = round2(lines.reduce((sum, line) => sum + line.price, 0))

  const columns: ColumnsType<PurchaseBillLine> = [
    { title: t('purchases.itemName'), dataIndex: 'itemName', render: (value: string) => <span className="font-medium text-ink">{value}</span> },
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
      width: 100,
      fixed: 'right',
      render: (_, row) => (
        <Button size="small" type="primary" onClick={() => navigate(`/selling-bills/new?lineId=${row.id}`)}>
          {t('stock.sell')}
        </Button>
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
          <div className="border-b border-line p-3 sm:p-4">
            <Input.Search
              allowClear
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`${t('purchases.itemName')} · ${t('purchases.chassisNumber')} · ${t('purchases.supplier')}`}
              className="w-full sm:max-w-xs"
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
    </>
  )
}
