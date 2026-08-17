import { Button } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import { useGetCashTransactionsQuery, useGetMovementsSummaryQuery } from '@/api/reportsApi'
import { useTableQuery } from '@/lib/hooks/useTableQuery'
import { useDateRange } from '@/lib/hooks/useDateRange'
import { formatDate } from '@/lib/format'
import { exportToExcel } from '@/lib/download'
import { DataTable } from '@/components/ui/DataTable'
import { DateRangeFilter } from '@/components/ui/DateRangeFilter'
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard'
import { Money } from '@/components/ui/Money'
import { PageHeader } from '@/components/ui/primitives'
import { CashTransactionTypeTag } from '@/components/ui/StatusTags'
import { UI_ICONS } from '@/components/layout/icons'
import { ACTION_ICONS } from '@/components/ui/RowActions'
import type { CashTransaction } from '@/types'

export default function SummaryPage() {
  const { t } = useTranslation()
  const { value: range, setPreset, setCustomRange } = useDateRange('month')

  const { data: totals, isLoading: loadingTotals } = useGetMovementsSummaryQuery({ from: range.from, to: range.to })

  const query = useTableQuery({ sortBy: 'date', sortOrder: 'descend' })
  const { data, isLoading, isFetching } = useGetCashTransactionsQuery({ ...query.params, from: range.from, to: range.to })
  const { data: exportRows } = useGetCashTransactionsQuery({ from: range.from, to: range.to, pageSize: 0 })

  const handleExport = () => {
    const rows = (exportRows?.rows ?? []).map((row) => ({
      [t('summary.date')]: formatDate(row.date),
      [t('summary.type')]: t(`summary.type${row.type.charAt(0).toUpperCase() + row.type.slice(1)}`),
      [t('summary.item')]: row.itemName ?? '',
      [t('summary.counterparty')]: row.counterpartyName ?? '',
      [t('summary.debit')]: row.direction === 'debit' ? row.amount : '',
      [t('summary.credit')]: row.direction === 'credit' ? row.amount : '',
    }))
    exportToExcel(rows, `showroom-summary-${range.from}-to-${range.to}.xlsx`, 'Summary')
  }

  const columns: ColumnsType<CashTransaction> = [
    { title: t('summary.date'), dataIndex: 'date', sorter: true, render: (value: string) => <span className="whitespace-nowrap">{formatDate(value)}</span> },
    { title: t('summary.type'), dataIndex: 'type', render: (_, row) => <CashTransactionTypeTag type={row.type} /> },
    { title: t('summary.item'), dataIndex: 'itemName', render: (value: string | null) => value ?? <span className="text-subtle">—</span> },
    { title: t('summary.counterparty'), dataIndex: 'counterpartyName', render: (value: string | null) => value ?? <span className="text-subtle">—</span> },
    {
      title: t('summary.debit'),
      dataIndex: 'amount',
      align: 'right',
      render: (value: number, row) => (row.direction === 'debit' ? <Money value={value} className="text-danger" /> : <span className="text-subtle">—</span>),
    },
    {
      title: t('summary.credit'),
      dataIndex: 'amount',
      align: 'right',
      render: (value: number, row) => (row.direction === 'credit' ? <Money value={value} className="text-success" /> : <span className="text-subtle">—</span>),
    },
  ]

  return (
    <>
      <PageHeader title={t('summary.title')} subtitle={t('summary.subtitle')} actions={<DateRangeFilter value={range} onPreset={setPreset} onCustom={setCustomRange} />} />

      <div className="space-y-4">
        <KpiGrid>
          <KpiCard label={t('summary.totalDebit')} value={<Money value={totals?.totalDebit} className="text-danger" />} icon={UI_ICONS.cart} tone="danger" loading={loadingTotals} />
          <KpiCard label={t('summary.totalCredit')} value={<Money value={totals?.totalCredit} className="text-success" />} icon={UI_ICONS.coins} tone="success" loading={loadingTotals} />
          <KpiCard label={t('summary.net')} value={<Money value={totals?.net} signed strong />} icon={UI_ICONS.wallet} tone={(totals?.net ?? 0) >= 0 ? 'success' : 'danger'} loading={loadingTotals} />
        </KpiGrid>

        <DataTable<CashTransaction>
          rowKey="id"
          columns={columns}
          data={data}
          loading={isLoading || isFetching}
          query={query}
          searchPlaceholder={`${t('summary.item')} · ${t('summary.counterparty')}`}
          showSearch={false}
          actions={
            <Button icon={ACTION_ICONS.print} onClick={handleExport}>
              {t('common.export')}
            </Button>
          }
          empty={{ title: t('summary.empty') }}
        />
      </div>
    </>
  )
}
