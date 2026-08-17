import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { router } from '@/app/router'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { RouterProvider } from 'react-router-dom'
import { App as AntApp, ConfigProvider } from 'antd'
import { StyleProvider } from '@ant-design/cssinjs'
import arEG from 'antd/locale/ar_EG'
import enUS from 'antd/locale/en_US'
import { persistor, store } from '@/app/store'
import { useAppSelector } from '@/app/hooks'
import { applyLanguage, directionOf } from '@/i18n/i18nConfig'
import { buildTheme } from './antdTheme'
import { DarkModeContext } from './ThemeContext'

/** Tracks the OS preference so the "system" theme option stays live. */
function usePrefersDark(enabled: boolean): boolean {
  const query = useMemo(
    () => (typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null),
    [],
  )
  const [dark, setDark] = useState(() => query?.matches ?? false)

  useEffect(() => {
    if (!enabled || !query) return
    const listener = (event: MediaQueryListEvent) => setDark(event.matches)
    query.addEventListener('change', listener)
    return () => query.removeEventListener('change', listener)
  }, [enabled, query])

  return dark
}

function ThemeBridge({ children }: { children: ReactNode }) {
  const themeMode = useAppSelector((state) => state.ui.theme)
  const language = useAppSelector((state) => state.ui.language)
  const prefersDark = usePrefersDark(themeMode === 'system')

  const isDark = themeMode === 'dark' || (themeMode === 'system' && prefersDark)
  const isArabic = language === 'ar'

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  useEffect(() => {
    applyLanguage(language)
  }, [language])

  const config = useMemo(() => buildTheme(isDark, isArabic), [isDark, isArabic])

  return (
    <DarkModeContext.Provider value={isDark}>
      <ConfigProvider
        theme={config}
        direction={directionOf(language)}
        locale={isArabic ? arEG : enUS}
        componentSize="middle"
        form={{ requiredMark: false }}
      >
        <AntApp className="h-full">{children}</AntApp>
      </ConfigProvider>
    </DarkModeContext.Provider>
  )
}

export function AppProviders() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        {/* `layer` puts antd's styles in the `antd` cascade layer, which index.css orders below Tailwind's. */}
        <StyleProvider layer>
          <ThemeBridge>
            <RouterProvider router={router} />
          </ThemeBridge>
        </StyleProvider>
      </PersistGate>
    </Provider>
  )
}
