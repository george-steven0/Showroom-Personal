import { Tooltip } from 'antd'
import { useTranslation } from 'react-i18next'

/** Flags a record saved with details still missing; hovering lists exactly what. Renders nothing when complete. */
export function MissingInfoTag({ items }: { items: string[] }) {
  const { t } = useTranslation()
  if (items.length === 0) return null
  return (
    <Tooltip
      title={
        <ul className="m-0 list-disc ps-4">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      }
    >
      <span className="inline-flex shrink-0 items-center rounded-full bg-info/15 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-info ring-1 ring-info/30 ring-inset">
        {t('missingInfo.tag')}
      </span>
    </Tooltip>
  )
}

/** Inline "Missing" marker for an empty cell that should have a value. */
export function MissingValue() {
  const { t } = useTranslation()
  return <span className="text-xs font-medium text-info">{t('missingInfo.missing')}</span>
}
