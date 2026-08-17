import type { EChartsOption } from 'echarts'
import { useIsDark } from '@/app/providers/ThemeContext'

/** Two categorical slots — profit vs cost, buys vs sells — is all this app's charts ever need. */
export const SERIES = {
  light: ['#0f8a5f', '#c2410c'],
  dark: ['#2fd694', '#e0a06a'],
}

export const SEQUENTIAL = {
  light: ['#a7d9c4', '#7cc4a4', '#52ae86', '#0f8a5f', '#0c7350', '#095c40', '#074632'],
  dark: ['#d3f3e6', '#a4e8c8', '#69dba7', '#2fd694', '#22b57e', '#1a9367', '#127150'],
}

export interface ChartTokens {
  series: string[]
  sequential: string[]
  ink: string
  muted: string
  grid: string
  axis: string
  surface: string
  tooltipBg: string
  tooltipBorder: string
  isDark: boolean
}

export function useChartTokens(): ChartTokens {
  const isDark = useIsDark()

  return isDark
    ? {
        series: SERIES.dark,
        sequential: SEQUENTIAL.dark,
        ink: '#e7f3ee',
        muted: '#84a89b',
        grid: '#1c2f28',
        axis: '#2c443c',
        surface: '#101c18',
        tooltipBg: '#14221d',
        tooltipBorder: '#2f4d43',
        isDark,
      }
    : {
        series: SERIES.light,
        sequential: SEQUENTIAL.light,
        ink: '#10201b',
        muted: '#77938a',
        grid: '#eef4f1',
        axis: '#dfe9e4',
        surface: '#ffffff',
        tooltipBg: '#ffffff',
        tooltipBorder: '#e1e9e6',
        isDark,
      }
}

export function baseOption(tokens: ChartTokens): EChartsOption {
  return {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif", color: tokens.ink },
    grid: { left: 8, right: 12, top: 24, bottom: 4, containLabel: true },
    tooltip: {
      backgroundColor: tokens.tooltipBg,
      borderColor: tokens.tooltipBorder,
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: tokens.ink, fontSize: 12 },
      extraCssText: 'box-shadow: 0 12px 32px -8px rgb(16 24 40 / 0.18); border-radius: 8px;',
    },
    legend: { top: 0, right: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, itemGap: 16, textStyle: { color: tokens.muted, fontSize: 12 } },
    xAxis: {
      type: 'category',
      axisLine: { lineStyle: { color: tokens.axis } },
      axisTick: { show: false },
      axisLabel: { color: tokens.muted, fontSize: 11, margin: 12 },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: tokens.muted, fontSize: 11 },
      splitLine: { lineStyle: { color: tokens.grid, width: 1 } },
    },
  }
}

export function areaGradient(color: string, isDark: boolean) {
  return {
    type: 'linear' as const,
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: hexAlpha(color, isDark ? 0.34 : 0.26) },
      { offset: 1, color: hexAlpha(color, 0) },
    ],
  }
}

function hexAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
