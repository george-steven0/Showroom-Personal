import { useCallback, useMemo } from 'react'
import { App } from 'antd'
import { useTranslation } from 'react-i18next'
import { errorMessage } from '@/api/baseApi'

/** Single entry point for user feedback — every mutation reports through here. */
export function useNotify() {
  const { notification } = App.useApp()
  const { t } = useTranslation()

  const success = useCallback(
    (title: string, description?: string) => {
      notification.success({ title, description, placement: 'topRight', duration: 3 })
    },
    [notification],
  )

  const warning = useCallback(
    (title: string, description?: string) => {
      notification.warning({ title, description, placement: 'topRight', duration: 4 })
    },
    [notification],
  )

  const error = useCallback(
    (title: string, description?: string) => {
      notification.error({ title, description, placement: 'topRight', duration: 5 })
    },
    [notification],
  )

  const apiError = useCallback(
    (err: unknown, fallbackKey = 'messages.saveFailed') => {
      error(t('common.error'), errorMessage(err, t(fallbackKey)))
    },
    [error, t],
  )

  return useMemo(() => ({ success, warning, error, apiError }), [success, warning, error, apiError])
}
