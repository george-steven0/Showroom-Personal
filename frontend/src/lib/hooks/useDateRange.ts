import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { formatIso } from '@/lib/format'
import type { DateRangePreset, DateRangeValue } from '@/types'

function rangeForPreset(preset: DateRangePreset, from?: string, to?: string): { from: string; to: string } {
  const today = dayjs()
  switch (preset) {
    case 'week':
      return { from: formatIso(today.startOf('isoWeek')), to: formatIso(today.endOf('isoWeek')) }
    case 'month':
      return { from: formatIso(today.startOf('month')), to: formatIso(today.endOf('month')) }
    case 'year':
      return { from: formatIso(today.startOf('year')), to: formatIso(today.endOf('year')) }
    case 'all':
      return { from: '', to: '' }
    case 'custom':
      return { from: from ?? formatIso(today.startOf('month')), to: to ?? formatIso(today) }
  }
}

/** Drives every "week / month / year / custom" filter in the app. */
export function useDateRange(initialPreset: DateRangePreset = 'month') {
  const [preset, setPresetState] = useState<DateRangePreset>(initialPreset)
  const [customFrom, setCustomFrom] = useState<string | undefined>()
  const [customTo, setCustomTo] = useState<string | undefined>()

  const value: DateRangeValue = useMemo(() => {
    const { from, to } = rangeForPreset(preset, customFrom, customTo)
    return { preset, from, to }
  }, [preset, customFrom, customTo])

  function setPreset(next: DateRangePreset) {
    setPresetState(next)
  }

  function setCustomRange(from: string, to: string) {
    setPresetState('custom')
    setCustomFrom(from)
    setCustomTo(to)
  }

  return { value, setPreset, setCustomRange }
}
