import { useState } from 'react'
import { Button, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import { useGetAccountsSummaryQuery, useGetOwedToSuppliersQuery, useGetProfitSummaryQuery } from '@/api/accountsApi'
import { useDeleteExpenseMutation, useGetExpensesQuery } from '@/api/expensesApi'
import { useTableQuery } from '@/lib/hooks/useTableQuery'
import { useDateRange } from '@/lib/hooks/useDateRange'
import { useNotify } from '@/lib/hooks/useNotify'
import { formatDate, formatMoney } from '@/lib/format'
import { DataTable } from '@/components/ui/DataTable'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { DateRangeFilter } from '@/components/ui/DateRangeFilter'
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard'
import { Money } from '@/components/ui/Money'
import { EmptyState, PageHeader, SectionCard } from '@/components/ui/primitives'
import { ACTION_ICONS, RowActions } from '@/components/ui/RowActions'
import { ChartCard, ProfitTrendChart } from '@/components/charts/Charts'
import { UI_ICONS } from '@/components/layout/icons'
import type { Expense, OwedSupplierRow } from '@/types'
import { AddCapitalModal } from './AddCapitalModal'
import { ExpenseModal } from './ExpenseModal'
import { RecordPaymentModal } from './RecordPaymentModal'

export default function AccountsPage() {
  const { t } = useTranslation()
  const { value: range, setPreset, setCustomRange } = useDateRange('month')

  const { data: summary, isLoading: loadingSummary } = useGetAccountsSummaryQuery()
  const { data: owed, isLoading: loadingOwed } = useGetOwedToSuppliersQuery()
  const { data: profit, isLoading: loadingProfit } = useGetProfitSummaryQuery({ from: range.from, to: range.to })

  const [capitalOpen, setCapitalOpen] = useState(false)
  const [paymentTarget, setPaymentTarget] = useState<OwedSupplierRow | null>(null)

  const owedColumns: ColumnsType<OwedSupplierRow> = [
    { title: t('accounts.item'), dataIndex: 'itemName', render: (value: string) => <span className="font-medium text-ink">{value}</span> },
    { title: t('accounts.chassis'), dataIndex: 'chassisNumber', responsive: ['md'], render: (value: string) => <span className="tnum text-muted">{value}</span> },
    { title: t('accounts.supplier'), dataIndex: 'supplierName' },
    { title: t('accounts.cost'), dataIndex: 'price', align: 'right', render: (value: number) => <Money value={value} /> },
    { title: t('accounts.paid'), dataIndex: 'paidAmount', align: 'right', responsive: ['lg'], render: (value: number) => <Money value={value} className="text-success" /> },
    { title: t('accounts.owed'), dataIndex: 'owed', align: 'right', render: (value: number) => <Money value={value} strong className="text-danger" /> },
    {
      title: t('common.actions'),
      key: 'actions',
      align: 'right',
      width: 60,
      fixed: 'right',
      render: (_, row) => <RowActions actions={[{ key: 'pay', label: t('accounts.recordPayment'), icon: ACTION_ICONS.cash, onClick: () => setPaymentTarget(row) }]} />,
    },
  ]

  return (
    <>
      <PageHeader title={t('accounts.title')} subtitle={t('accounts.subtitle')} actions={<Button icon={UI_ICONS.plus} onClick={() => setCapitalOpen(true)}>{t('accounts.addCapital')}</Button>} />

      <div className="space-y-4">
        <KpiGrid>
          <KpiCard
            label={t('accounts.totalCapital')}
            value={<Money value={summary?.totalCapital} signed />}
            icon={UI_ICONS.wallet}
            tone={(summary?.totalCapital ?? 0) >= 0 ? 'success' : 'danger'}
            loading={loadingSummary}
            hint={(summary?.totalCapital ?? 0) < 0 ? t('accounts.negativeCapitalHint') : undefined}
          />
          <KpiCard
            label={t('accounts.owedToSuppliers')}
            value={<Money value={summary?.totalOwedToSuppliers} />}
            icon={UI_ICONS.alert}
            tone={(summary?.totalOwedToSuppliers ?? 0) > 0 ? 'warning' : 'success'}
            loading={loadingSummary}
          />
          <KpiCard label={t('accounts.carsInStock')} value={summary?.carsInStock ?? 0} icon={UI_ICONS.car} tone="info" loading={loadingSummary} />
          <KpiCard label={t('accounts.carsSold')} value={summary?.carsSoldCount ?? 0} icon={UI_ICONS.invoice} tone="primary" loading={loadingSummary} />
        </KpiGrid>

        <SectionCard title={t('accounts.whoIOwe')} description={t('accounts.whoIOweHint')}>
          {(owed ?? []).length === 0 && !loadingOwed ? (
            <EmptyState compact title={t('accounts.emptyOwed')} />
          ) : (
            <Table<OwedSupplierRow>
              rowKey="purchaseLineId"
              size="small"
              loading={loadingOwed}
              dataSource={owed ?? []}
              pagination={false}
              scroll={{ x: 'max-content' }}
              columns={owedColumns}
            />
          )}
        </SectionCard>

        <div className="grid gap-4 xl:grid-cols-3">
          <KpiCard
            label={t('accounts.profit')}
            value={<Money value={profit?.totalProfit} signed />}
            icon={UI_ICONS.chart}
            tone={(profit?.totalProfit ?? 0) >= 0 ? 'success' : 'danger'}
            loading={loadingProfit}
            hint={t('accounts.profitHint')}
            footer={
              <span className="text-xs text-muted">
                {t('sales.title')}: {profit?.carsSold ?? 0}
              </span>
            }
          />
          <div className="xl:col-span-2">
            <ChartCard
              title={t('accounts.profit')}
              actions={<DateRangeFilter value={range} onPreset={setPreset} onCustom={setCustomRange} />}
              loading={loadingProfit}
              isEmpty={!profit?.series.some((point) => point.profit !== 0)}
              height={240}
            >
              <ProfitTrendChart data={profit?.series ?? []} height={240} />
            </ChartCard>
          </div>
        </div>

        <ExpensesSection range={range} />
      </div>

      <AddCapitalModal open={capitalOpen} onClose={() => setCapitalOpen(false)} />
      <RecordPaymentModal open={Boolean(paymentTarget)} row={paymentTarget} onClose={() => setPaymentTarget(null)} />
    </>
  )
}

/** Declared at module scope so it isn't remounted (losing its table state) on every AccountsPage re-render. */
function ExpensesSection({ range }: { range: { from: string; to: string } }) {
  const { t } = useTranslation()
  const notify = useNotify()

  const query = useTableQuery({ sortBy: 'date', sortOrder: 'descend' })
  const { data, isLoading, isFetching } = useGetExpensesQuery({ ...query.params, from: range.from, to: range.to })
  const [deleteExpense, { isLoading: deleting }] = useDeleteExpenseMutation()

  const [editing, setEditing] = useState<Expense | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [target, setTarget] = useState<Expense | null>(null)

  const handleDelete = async () => {
    if (!target) return
    try {
      await deleteExpense(target.id).unwrap()
      notify.success(t('messages.expenseDeleted'))
      setTarget(null)
    } catch (error) {
      notify.apiError(error, 'messages.deleteFailed')
    }
  }

  const columns: ColumnsType<Expense> = [
    { title: t('accounts.expenseName'), dataIndex: 'name', sorter: true, render: (value: string) => <span className="font-medium text-ink">{value}</span> },
    { title: t('common.note'), dataIndex: 'note', responsive: ['lg'], render: (value: string | null) => value ?? <span className="text-subtle">—</span> },
    { title: t('common.amount'), dataIndex: 'amount', sorter: true, align: 'right', render: (value: number) => <Money value={value} strong /> },
    { title: t('common.date'), dataIndex: 'date', sorter: true, render: (value: string) => <span className="whitespace-nowrap">{formatDate(value)}</span> },
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
      {t('accounts.addExpense')}
    </Button>
  )

  return (
    <SectionCard title={t('accounts.expenses')} bodyClassName="p-0">
      <div className="p-4 sm:p-5">
        <DataTable<Expense>
          rowKey="id"
          columns={columns}
          data={data}
          loading={isLoading || isFetching}
          query={query}
          searchPlaceholder={t('accounts.expenseName')}
          actions={addButton}
          empty={{ title: t('accounts.emptyExpenses'), description: t('accounts.emptyExpensesHint'), action: addButton }}
        />
      </div>

      <ExpenseModal
        open={formOpen}
        expense={editing}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
      />

      <ConfirmModal
        open={Boolean(target)}
        loading={deleting}
        title={t('accounts.deleteExpenseTitle')}
        description={t('accounts.deleteExpenseBody', { name: target?.name ?? '', amount: formatMoney(target?.amount ?? 0) })}
        onConfirm={handleDelete}
        onCancel={() => setTarget(null)}
      />
    </SectionCard>
  )
}
