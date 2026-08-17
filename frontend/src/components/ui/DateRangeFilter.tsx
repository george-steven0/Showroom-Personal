import { DatePicker, Segmented, Select } from 'antd'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { formatIso } from '@/lib/format'
import type { DateRangePreset, DateRangeValue } from '@/types'

const PRESETS: DateRangePreset[] = ['week', 'month', 'year']

export interface DateRangeFilterProps {
  value: DateRangeValue
  onPreset: (preset: DateRangePreset) => void
  onCustom: (from: string, to: string) => void
}

/** Week / month / year / custom filter shared by the dashboard, accounts and summary pages. */
export function DateRangeFilter({ value, onPreset, onCustom }: DateRangeFilterProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Segmented
        value={value.preset === 'custom' ? '' : value.preset}
        onChange={(preset) => onPreset(preset as DateRangePreset)}
        options={PRESETS.map((preset) => ({ value: preset, label: t(`dateRange.${preset}`) }))}
        className="hidden md:inline-flex"
      />

      <Select
        value={value.preset}
        onChange={(preset) => onPreset(preset as DateRangePreset)}
        className="min-w-[150px] md:hidden"
        options={[...PRESETS, 'custom' as const].map((preset) => ({ value: preset, label: t(`dateRange.${preset}`) }))}
      />

      <DatePicker.RangePicker
        value={[dayjs(value.from), dayjs(value.to)]}
        allowClear={false}
        onChange={(dates) => {
          if (!dates?.[0] || !dates?.[1]) return
          onCustom(formatIso(dates[0]), formatIso(dates[1]))
        }}
        disabledDate={(current) => Boolean(current && current.isAfter(dayjs(), 'day'))}
        className="min-w-[240px]"
      />
    </div>
  )
}
