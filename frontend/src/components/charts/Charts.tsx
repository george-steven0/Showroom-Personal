import { type ReactNode, useMemo } from 'react'
import ReactEChartsCore from 'echarts-for-react/esm/core'
import * as echarts from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'
import { Skeleton } from 'antd'
import { useTranslation } from 'react-i18next'
import { formatMoney } from '@/lib/format'
import { EmptyState, SectionCard } from '@/components/ui/primitives'
import { areaGradient, baseOption, useChartTokens } from './chartTheme'

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

export interface ChartCardProps {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  loading?: boolean
  isEmpty?: boolean
  emptyText?: string
  height?: number
  children: ReactNode
}

export function ChartCard({ title, description, actions, loading, isEmpty, emptyText, height = 280, children }: ChartCardProps) {
  const { t } = useTranslation()

  return (
    <SectionCard title={title} description={description} actions={actions} bodyClassName="p-3 sm:p-4">
      {loading ? (
        <div style={{ height }} className="flex items-center px-2">
          <Skeleton active paragraph={{ rows: 4 }} title={false} />
        </div>
      ) : isEmpty ? (
        <div style={{ height }} className="flex items-center justify-center">
          <EmptyState compact title={emptyText ?? t('dashboard.empty')} />
        </div>
      ) : (
        children
      )}
    </SectionCard>
  )
}

function Chart({ option, height }: { option: EChartsOption; height: number }) {
  return <ReactEChartsCore echarts={echarts} option={option} style={{ height, width: '100%' }} opts={{ renderer: 'canvas' }} notMerge lazyUpdate />
}

export function ProfitTrendChart({ data, height = 280 }: { data: { bucket: string; profit: number }[]; height?: number }) {
  const tokens = useChartTokens()

  const option = useMemo(() => {
    const color = tokens.series[0]
    return {
      ...baseOption(tokens),
      legend: { show: false },
      tooltip: {
        ...baseOption(tokens).tooltip,
        trigger: 'axis',
        axisPointer: { type: 'line', lineStyle: { color: tokens.axis } },
        valueFormatter: (value) => formatMoney(Number(value)),
      },
      xAxis: { ...baseOption(tokens).xAxis, data: data.map((point) => point.bucket) },
      yAxis: {
        ...baseOption(tokens).yAxis,
        axisLabel: { color: tokens.muted, fontSize: 11, formatter: (value: number) => formatMoney(value, undefined, { compact: true, withSymbol: false }) },
      },
      series: [
        {
          type: 'line',
          smooth: 0.3,
          symbol: 'circle',
          symbolSize: 8,
          showSymbol: false,
          lineStyle: { width: 2, color },
          itemStyle: { color, borderWidth: 2, borderColor: tokens.surface },
          areaStyle: { color: areaGradient(color, tokens.isDark) },
          data: data.map((point) => point.profit),
        },
      ],
    } as EChartsOption
  }, [data, tokens])

  return <Chart option={option} height={height} />
}

export function BuysVsSellsChart({
  data,
  height = 280,
}: {
  data: { bucket: string; buys: number; sells: number }[]
  height?: number
}) {
  const tokens = useChartTokens()
  const { t } = useTranslation()

  const option = useMemo(() => {
    const base = baseOption(tokens)
    return {
      ...base,
      legend: { ...base.legend, data: [t('dashboard.buys'), t('dashboard.sells')] },
      tooltip: { ...base.tooltip, trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (value) => formatMoney(Number(value)) },
      xAxis: { ...base.xAxis, data: data.map((point) => point.bucket) },
      yAxis: {
        ...base.yAxis,
        axisLabel: { color: tokens.muted, fontSize: 11, formatter: (value: number) => formatMoney(value, undefined, { compact: true, withSymbol: false }) },
      },
      series: [
        {
          name: t('dashboard.buys'),
          type: 'bar',
          barMaxWidth: 20,
          barGap: '20%',
          itemStyle: { color: tokens.series[1], borderRadius: [4, 4, 0, 0] },
          data: data.map((point) => point.buys),
        },
        {
          name: t('dashboard.sells'),
          type: 'bar',
          barMaxWidth: 20,
          itemStyle: { color: tokens.series[0], borderRadius: [4, 4, 0, 0] },
          data: data.map((point) => point.sells),
        },
      ],
    } as EChartsOption
  }, [data, t, tokens])

  return <Chart option={option} height={height} />
}

export function RankedBarChart({ data, height = 260 }: { data: { name: string; value: number }[]; height?: number }) {
  const tokens = useChartTokens()

  const option = useMemo(() => {
    const base = baseOption(tokens)
    const rows = [...data].sort((a, b) => a.value - b.value)
    const max = Math.max(...rows.map((r) => r.value), 1)

    return {
      ...base,
      grid: { left: 4, right: 64, top: 8, bottom: 4, containLabel: true },
      legend: { show: false },
      tooltip: {
        ...base.tooltip,
        trigger: 'item',
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number }
          return `<strong>${p.name}</strong><br/>${formatMoney(p.value)}`
        },
      },
      xAxis: { type: 'value', max: max * 1.12, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { show: false }, splitLine: { show: false } },
      yAxis: {
        type: 'category',
        data: rows.map((row) => row.name),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: tokens.muted, fontSize: 11, width: 150, overflow: 'truncate' },
        splitLine: { show: false },
      },
      series: [
        {
          type: 'bar',
          barMaxWidth: 16,
          itemStyle: { color: tokens.sequential[3], borderRadius: [0, 4, 4, 0] },
          label: { show: true, position: 'right', color: tokens.muted, fontSize: 11, formatter: (params: { value: number }) => formatMoney(params.value, undefined, { compact: true }) },
          data: rows.map((row) => row.value),
        },
      ],
    } as EChartsOption
  }, [data, tokens])

  return <Chart option={option} height={height} />
}
