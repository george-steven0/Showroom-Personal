import { useTranslation } from 'react-i18next'
import { UI_ICONS } from './icons'

export interface BrandProps {
  variant?: 'rail' | 'light'
  compact?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = {
  sm: { box: 'size-8', text: 'text-[13px]', sub: 'text-[10px]' },
  md: { box: 'size-9', text: 'text-sm', sub: 'text-[11px]' },
  lg: { box: 'size-12', text: 'text-lg', sub: 'text-xs' },
}

export function Brand({ variant = 'rail', compact = false, size = 'md' }: BrandProps) {
  const { t } = useTranslation()
  const s = SIZES[size]

  const nameTone = variant === 'rail' ? 'text-rail-ink' : 'text-ink'
  const subTone = variant === 'rail' ? 'text-rail-muted' : 'text-muted'

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className={`${s.box} flex shrink-0 items-center justify-center rounded-lg bg-primary text-white`}>
        {UI_ICONS.car}
      </div>

      {!compact && (
        <div className="min-w-0">
          <p className={`truncate font-semibold ${s.text} ${nameTone}`}>{t('app.defaultName')}</p>
          <p className={`truncate ${s.sub} ${subTone}`}>{t('app.tagline')}</p>
        </div>
      )}
    </div>
  )
}
