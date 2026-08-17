import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Avatar, Button, Dropdown, Tooltip, type MenuProps } from 'antd'
import { useTranslation } from 'react-i18next'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { setLanguage, toggleSidebar, toggleTheme } from '@/app/uiSlice'
import { signedOut } from '@/features/auth/authSlice'
import { baseApi } from '@/api/baseApi'
import { useMediaQuery } from '@/lib/hooks/useMediaQuery'
import { initials } from '@/lib/format'
import { UI_ICONS } from './icons'
import { ROUTE_TITLES } from './navigation'

export interface HeaderProps {
  onOpenMobileNav: () => void
}

export function Header({ onOpenMobileNav }: HeaderProps) {
  const { t, i18n } = useTranslation()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAppSelector((state) => state.auth.user)
  const themeMode = useAppSelector((state) => state.ui.theme)
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  const crumb = useMemo(
    () => ROUTE_TITLES.find((entry) => location.pathname.startsWith(entry.prefix)),
    [location.pathname],
  )

  const handleSignOut = () => {
    dispatch(signedOut())
    dispatch(baseApi.util.resetApiState())
    navigate('/login', { replace: true })
  }

  const profileMenu: MenuProps['items'] = [
    {
      key: 'identity',
      label: (
        <div className="px-1 py-1">
          <p className="text-sm font-medium text-ink">{user?.fullName}</p>
          <p className="text-xs text-muted">@{user?.username}</p>
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' },
    { key: 'signout', label: t('auth.signOut'), danger: true, onClick: handleSignOut },
  ]

  const languageMenu: MenuProps['items'] = [
    { key: 'en', label: t('language.english'), onClick: () => dispatch(setLanguage('en')) },
    { key: 'ar', label: t('language.arabic'), onClick: () => dispatch(setLanguage('ar')) },
  ]

  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-surface px-3 sm:px-4" style={{ height: 60 }}>
      <Button
        type="text"
        aria-label={isDesktop ? t('nav.collapse') : t('nav.expand')}
        icon={UI_ICONS.menu}
        onClick={() => (isDesktop ? dispatch(toggleSidebar()) : onOpenMobileNav())}
      />

      <div className="min-w-0 flex-1">
        {crumb && <p className="truncate text-sm font-semibold text-ink">{t(crumb.labelKey)}</p>}
      </div>

      <div className="flex items-center gap-1">
        <Dropdown menu={{ items: languageMenu, selectedKeys: [i18n.language] }} trigger={['click']}>
          <Button type="text" aria-label={t('language.label')} icon={UI_ICONS.globe}>
            <span className="hidden text-xs font-medium sm:inline">{i18n.language === 'ar' ? 'AR' : 'EN'}</span>
          </Button>
        </Dropdown>

        <Tooltip title={t('theme.toggle')}>
          <Button
            type="text"
            aria-label={t('theme.toggle')}
            icon={themeMode === 'dark' ? UI_ICONS.sun : UI_ICONS.moon}
            onClick={() => dispatch(toggleTheme())}
          />
        </Tooltip>

        <Dropdown menu={{ items: profileMenu }} trigger={['click']} placement="bottomRight">
          <button type="button" className="ms-1 flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-surface-3">
            <Avatar size={32} className="bg-primary text-xs font-semibold">
              {initials(user?.fullName ?? '?')}
            </Avatar>
            <span className="hidden text-start md:block">
              <span className="block max-w-[150px] truncate text-[13px] leading-tight font-medium text-ink">{user?.fullName}</span>
            </span>
          </button>
        </Dropdown>
      </div>
    </header>
  )
}
