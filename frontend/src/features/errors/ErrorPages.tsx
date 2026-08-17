import { Button, Result } from 'antd'
import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <Result
      status="404"
      title={t('errors.pageTitle')}
      subTitle={t('errors.pageBody')}
      extra={
        <Link to="/dashboard">
          <Button type="primary">{t('errors.goHome')}</Button>
        </Link>
      }
    />
  )
}

/** Router `errorElement` — catches render errors and failed lazy route loads. */
export function RouteErrorPage() {
  const error = useRouteError()
  const { t } = useTranslation()

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />
  }

  const message =
    error instanceof Error ? error.message : isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : String(error ?? '')

  return (
    <Result
      status="error"
      title={t('errors.boundaryTitle')}
      subTitle={message || t('errors.boundaryBody')}
      extra={
        <Button type="primary" onClick={() => window.location.reload()}>
          {t('errors.reload')}
        </Button>
      }
    />
  )
}
