import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useGetSettingsQuery } from '@/api/settingsApi'
import type { SystemSettings } from '@/types'

const DEFAULT_SETTINGS: SystemSettings = {
  id: 'singleton',
  systemName: 'Showroom',
  systemNameAr: 'المعرض',
  logo: null,
  updatedAt: null,
  updatedBy: null,
  updatedByName: null,
}

/**
 * Anything needing the system name/logo reads it through here rather than
 * `useGetSettingsQuery` directly, so it always has a safe fallback (this
 * query is also the one that runs on the pre-auth login screen) and a
 * locale-aware display name.
 */
export function useSettings() {
  const { data, isLoading } = useGetSettingsQuery()
  const { i18n } = useTranslation()
  const settings = data ?? DEFAULT_SETTINGS

  const displayName = useMemo(
    () => (i18n.language === 'ar' && settings.systemNameAr ? settings.systemNameAr : settings.systemName),
    [i18n.language, settings.systemName, settings.systemNameAr],
  )

  return { settings, isLoading, displayName }
}
