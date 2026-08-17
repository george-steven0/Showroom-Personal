import { useTranslation } from 'react-i18next'
import { useGetDashboardQuery } from '@/api/dashboardApi'
import { formatDate } from '@/lib/format'
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard'
import { Money } from '@/components/ui/Money'
import { EmptyState, PageHeader, SectionCard } from '@/components/ui/primitives'
import { CashTransactionTypeTag } from '@/components/ui/StatusTags'
import { BuysVsSellsChart, ChartCard, ProfitTrendChart } from '@/components/charts/Charts'
import { UI_ICONS } from '@/components/layout/icons'

export default function DashboardPage() {
  const { t } = useTranslation()
  const { data, isLoading } = useGetDashboardQuery()

  return (
    <>
      <PageHeader title={t('dashboard.title')} subtitle={t('dashboard.subtitle')} />

      <div className="space-y-4">
        <KpiGrid>
          <KpiCard
            label={t('dashboard.totalCapital')}
            value={<Money value={data?.totalCapital} signed />}
            icon={UI_ICONS.wallet}
            tone={(data?.totalCapital ?? 0) >= 0 ? 'success' : 'danger'}
            loading={isLoading}
          />
          <KpiCard
            label={t('dashboard.owedToSuppliers')}
            value={<Money value={data?.totalOwedToSuppliers} />}
            icon={UI_ICONS.alert}
            tone={(data?.totalOwedToSuppliers ?? 0) > 0 ? 'warning' : 'success'}
            loading={isLoading}
          />
          <KpiCard label={t('dashboard.carsInStock')} value={data?.carsInStock ?? 0} icon={UI_ICONS.car} tone="info" loading={isLoading} />
          <KpiCard label={t('dashboard.profitThisMonth')} value={<Money value={data?.profitThisMonth} signed />} icon={UI_ICONS.chart} tone="primary" loading={isLoading} />
        </KpiGrid>

        <div className="grid gap-4 xl:grid-cols-2">
          <ChartCard title={t('dashboard.profitTrend')} loading={isLoading} isEmpty={!data?.profitTrend.some((point) => point.profit !== 0)} height={260}>
            <ProfitTrendChart data={data?.profitTrend ?? []} height={260} />
          </ChartCard>
          <ChartCard title={t('dashboard.buysVsSells')} loading={isLoading} isEmpty={!data?.buysVsSells.some((point) => point.buys || point.sells)} height={260}>
            <BuysVsSellsChart data={data?.buysVsSells ?? []} height={260} />
          </ChartCard>
        </div>

        <SectionCard title={t('dashboard.recentActivity')}>
          {(data?.recentTransactions ?? []).length === 0 ? (
            <EmptyState compact title={t('dashboard.empty')} />
          ) : (
            <ul className="divide-y divide-line">
              {(data?.recentTransactions ?? []).map((tx) => (
                <li key={tx.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{tx.description}</p>
                    <p className="text-xs text-muted">{formatDate(tx.date)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <CashTransactionTypeTag type={tx.type} />
                    <Money value={tx.amount} className={tx.direction === 'credit' ? 'text-success' : 'text-danger'} strong />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </>
  )
}
