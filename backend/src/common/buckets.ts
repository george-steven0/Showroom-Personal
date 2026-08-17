import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(isoWeek)

export type Granularity = 'day' | 'week' | 'month'

/** Picks a bucket size so a chart never renders hundreds of points for a year-long range. */
export function inferGranularity(from: string, to: string): Granularity {
  const days = dayjs(to).diff(dayjs(from), 'day')
  if (days <= 31) return 'day'
  if (days <= 180) return 'week'
  return 'month'
}

export function bucketKey(date: Date, granularity: Granularity): string {
  const d = dayjs(date)
  if (granularity === 'week') return d.startOf('isoWeek').format('YYYY-MM-DD')
  if (granularity === 'month') return d.format('YYYY-MM')
  return d.format('YYYY-MM-DD')
}

export function bucketLabel(key: string, granularity: Granularity): string {
  if (granularity === 'month') return dayjs(`${key}-01`).format('MMM YYYY')
  return dayjs(key).format('DD MMM')
}

/** Every bucket between two dates, so charts show gaps as zero rather than skipping them. */
export function enumerateBuckets(from: string, to: string, granularity: Granularity): string[] {
  const out: string[] = []
  const unit = granularity
  let cursor = granularity === 'week' ? dayjs(from).startOf('isoWeek') : dayjs(from).startOf(unit)
  const end = dayjs(to)
  let guard = 0
  while (cursor.isBefore(end) || cursor.isSame(end, unit === 'week' ? 'day' : unit)) {
    out.push(bucketKey(cursor.toDate(), granularity))
    cursor = cursor.add(1, unit)
    if (++guard > 400) break
  }
  return Array.from(new Set(out))
}
