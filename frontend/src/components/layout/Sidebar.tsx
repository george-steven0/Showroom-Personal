import { NavLink } from 'react-router-dom'
import { Tooltip } from 'antd'
import { useTranslation } from 'react-i18next'
import { Brand } from './Brand'
import { NAV_ICONS } from './icons'
import { NAV_ITEMS, type NavItem } from './navigation'

export interface SidebarProps {
  collapsed: boolean
  mobile?: boolean
  onNavigate?: () => void
}

export function Sidebar({ collapsed, mobile = false, onNavigate }: SidebarProps) {
  const { t } = useTranslation()
  const isCollapsed = collapsed && !mobile

  return (
    <nav aria-label={t('nav.dashboard')} className="flex h-full flex-col bg-rail text-rail-ink">
      <div
        className={`flex h-15 shrink-0 items-center border-b border-rail-line ${isCollapsed ? 'justify-center px-2' : 'px-4'}`}
        style={{ height: 60 }}
      >
        <Brand compact={isCollapsed} />
      </div>

      <ul className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-2 py-3">
        {NAV_ITEMS.map((item) => (
          <li key={item.key}>
            {/* A parent with sub-pages lights up only on its own page; the sub-page link lights up on its. */}
            <NavEntry item={item} collapsed={isCollapsed} end={Boolean(item.children)} onNavigate={onNavigate} />
            {item.children && (
              <ul className={`mt-0.5 space-y-0.5 ${isCollapsed ? '' : 'ms-5 border-s border-rail-line ps-2'}`}>
                {item.children.map((child) => (
                  <li key={child.key}>
                    <NavEntry item={child} collapsed={isCollapsed} nested onNavigate={onNavigate} />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}

function NavEntry({ item, collapsed, end = false, nested = false, onNavigate }: { item: NavItem; collapsed: boolean; end?: boolean; nested?: boolean; onNavigate?: () => void }) {
  const { t } = useTranslation()

  if (collapsed) {
    return (
      <Tooltip title={t(item.labelKey)} placement="right">
        <NavLink
          to={item.path}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `relative flex size-10 items-center justify-center rounded-lg transition-colors duration-150 ${
              isActive ? 'bg-rail-active text-white shadow-sm' : 'text-rail-muted hover:bg-white/8 hover:text-rail-ink'
            }`
          }
        >
          {NAV_ICONS[item.icon]}
        </NavLink>
      </Tooltip>
    )
  }

  return (
    <NavLink
      to={item.path}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group relative flex items-center gap-2.5 rounded-lg px-3 text-[13px] transition-all duration-150 ${nested ? 'py-2' : 'py-2.5'} ${
          isActive ? 'bg-rail-active font-semibold text-white shadow-sm' : 'font-medium text-rail-muted hover:bg-white/8 hover:text-rail-ink'
        }`
      }
    >
      <span className="shrink-0">{NAV_ICONS[item.icon]}</span>
      <span className="flex-1 truncate">{t(item.labelKey)}</span>
    </NavLink>
  )
}
