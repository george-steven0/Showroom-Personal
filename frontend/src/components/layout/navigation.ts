export interface NavItem {
  key: string
  path: string
  labelKey: string
  icon: keyof typeof import('./icons').NAV_ICONS
  /** Sub-pages listed under this item; their paths sit under its path. */
  children?: NavItem[]
}

/** One owner, one role, no permission gating needed. */
export const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', path: '/dashboard', labelKey: 'nav.dashboard', icon: 'gauge' },
  { key: 'suppliers', path: '/suppliers', labelKey: 'nav.suppliers', icon: 'users' },
  { key: 'purchases', path: '/buying-bills', labelKey: 'nav.buyingBills', icon: 'cart' },
  { key: 'sales', path: '/selling-bills', labelKey: 'nav.sellingBills', icon: 'invoice' },
  { key: 'stock', path: '/stock', labelKey: 'nav.stock', icon: 'car' },
  {
    key: 'accounts',
    path: '/accounts',
    labelKey: 'nav.accounts',
    icon: 'wallet',
    children: [{ key: 'internalAccounts', path: '/accounts/internal', labelKey: 'nav.internalAccounts', icon: 'calculator' }],
  },
  { key: 'summary', path: '/summary', labelKey: 'nav.summary', icon: 'chart' },
  { key: 'inventory', path: '/inventory', labelKey: 'nav.inventory', icon: 'box' },
  { key: 'followUp', path: '/follow-up', labelKey: 'nav.followUp', icon: 'phoneCall' },
  { key: 'settings', path: '/settings', labelKey: 'nav.settings', icon: 'gear' },
]

/** Page titles for the header breadcrumb, keyed by route prefix — first match wins, so sub-pages go before their parent. */
export const ROUTE_TITLES: { prefix: string; labelKey: string }[] = [
  { prefix: '/accounts/internal', labelKey: 'nav.internalAccounts' },
  { prefix: '/dashboard', labelKey: 'nav.dashboard' },
  { prefix: '/suppliers', labelKey: 'nav.suppliers' },
  { prefix: '/buying-bills', labelKey: 'nav.buyingBills' },
  { prefix: '/selling-bills', labelKey: 'nav.sellingBills' },
  { prefix: '/stock', labelKey: 'nav.stock' },
  { prefix: '/accounts', labelKey: 'nav.accounts' },
  { prefix: '/summary', labelKey: 'nav.summary' },
  { prefix: '/inventory', labelKey: 'nav.inventory' },
  { prefix: '/follow-up', labelKey: 'nav.followUp' },
  { prefix: '/settings', labelKey: 'nav.settings' },
]
