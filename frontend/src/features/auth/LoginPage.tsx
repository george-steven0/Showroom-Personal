import { useEffect, useMemo } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button } from 'antd'
import { useTranslation } from 'react-i18next'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { credentialsReceived, expiryAcknowledged } from './authSlice'
import { useLoginMutation } from '@/api/authApi'
import { errorMessage } from '@/api/baseApi'
import { TextField } from '@/components/form/fields'
import { Brand } from '@/components/layout/Brand'
import { loginSchema, type LoginFormValues } from '@/lib/validation'
import { useNotify } from '@/lib/hooks/useNotify'
import { setLanguage, toggleTheme } from '@/app/uiSlice'
import { UI_ICONS } from '@/components/layout/icons'

export function LoginPage() {
  const { t, i18n } = useTranslation()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const notify = useNotify()

  const token = useAppSelector((state) => state.auth.token)
  const expired = useAppSelector((state) => state.auth.expired)
  const themeMode = useAppSelector((state) => state.ui.theme)

  const [login, { isLoading, error }] = useLoginMutation()
  const schema = useMemo(() => loginSchema(t), [t])

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '' },
    mode: 'onSubmit',
  })

  useEffect(() => {
    if (expired) {
      notify.warning(t('auth.sessionExpired'))
      dispatch(expiryAcknowledged())
    }
  }, [expired, dispatch, notify, t])

  if (token) {
    return <Navigate to={(location.state as { from?: string })?.from ?? '/dashboard'} replace />
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const result = await login(values).unwrap()
      dispatch(credentialsReceived(result))
      navigate('/dashboard', { replace: true })
    } catch {
      // The inline alert below reports the reason; input stays intact.
    }
  })

  return (
    <div className="flex min-h-screen bg-canvas">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-rail p-10 lg:flex xl:w-[55%]">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)',
            backgroundSize: '48px 48px, 64px 64px',
          }}
          aria-hidden
        />
        <Brand size="lg" />

        <div className="relative max-w-lg">
          <h2 className="text-3xl leading-tight font-semibold text-rail-ink">{t('app.tagline')}</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-rail-muted">{t('auth.loginSubtitle')}</p>

          <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5">
            {[
              { label: t('nav.buyingBills'), value: t('purchases.subtitle') },
              { label: t('nav.sellingBills'), value: t('sales.subtitle') },
              { label: t('nav.accounts'), value: t('accounts.subtitle') },
              { label: t('nav.summary'), value: t('summary.subtitle') },
            ].map((entry) => (
              <div key={entry.label}>
                <dt className="text-sm font-medium text-rail-ink">{entry.label}</dt>
                <dd className="mt-0.5 text-[13px] text-rail-muted">{entry.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="relative text-xs text-rail-muted">© {new Date().getFullYear()}</p>
      </div>

      <div className="flex w-full flex-col lg:w-1/2 xl:w-[45%]">
        <div className="flex items-center justify-between p-4">
          <div className="lg:hidden">
            <Brand variant="light" size="sm" />
          </div>
          <div className="ms-auto flex items-center gap-1">
            <Button type="text" size="small" onClick={() => dispatch(setLanguage(i18n.language === 'ar' ? 'en' : 'ar'))}>
              {i18n.language === 'ar' ? 'English' : 'العربية'}
            </Button>
            <Button
              type="text"
              size="small"
              aria-label={t('theme.toggle')}
              icon={themeMode === 'dark' ? UI_ICONS.sun : UI_ICONS.moon}
              onClick={() => dispatch(toggleTheme())}
            />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-10">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-semibold text-ink">{t('auth.welcomeBack')}</h1>
            <p className="mt-1.5 text-sm text-muted">{t('auth.loginSubtitle')}</p>

            {error && <Alert className="mt-5" type="error" showIcon title={errorMessage(error, t('auth.invalidCredentials'))} />}

            <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
              <TextField control={form.control} name="username" label={t('auth.username')} required autoFocus placeholder="admin" />
              <TextField control={form.control} name="password" type="password" label={t('auth.password')} required placeholder="••••••••" />

              <Button type="primary" htmlType="submit" size="large" block loading={isLoading}>
                {isLoading ? t('auth.signingIn') : t('auth.signIn')}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
