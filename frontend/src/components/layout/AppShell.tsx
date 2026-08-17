import { useState } from 'react'
import { Outlet, useNavigation } from 'react-router-dom'
import { Drawer } from 'antd'
import { useAppSelector } from '@/app/hooks'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function AppShell() {
  const collapsed = useAppSelector((state) => state.ui.sidebarCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigation = useNavigation()

  return (
    <div className="flex h-full bg-canvas">
      {navigation.state === 'loading' && (
        <div className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-primary-soft">
          <div className="h-full w-1/3 animate-[loading-bar_1s_ease-in-out_infinite] bg-primary" />
        </div>
      )}

      <aside className="hidden shrink-0 transition-[width] duration-200 ease-out lg:block" style={{ width: collapsed ? 68 : 252 }}>
        <div className="fixed inset-y-0 start-0 z-40" style={{ width: collapsed ? 68 : 252 }}>
          <Sidebar collapsed={collapsed} />
        </div>
      </aside>

      <Drawer
        placement="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        size={268}
        closable={false}
        styles={{ body: { padding: 0 } }}
        rootClassName="lg:hidden"
      >
        <div className="h-full">
          <Sidebar collapsed={false} mobile onNavigate={() => setMobileOpen(false)} />
        </div>
      </Drawer>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onOpenMobileNav={() => setMobileOpen(true)} />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1800px] p-4 sm:p-5 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
