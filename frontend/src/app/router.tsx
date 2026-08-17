import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/features/auth/LoginPage'
import { NotFoundPage, RouteErrorPage } from '@/features/errors/ErrorPages'
import { RequireAuth } from './guards'

const page = (load: () => Promise<{ default: React.ComponentType }>) => async () => ({ Component: (await load()).default })

const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <AppShell />,
        errorElement: <RouteErrorPage />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', lazy: page(() => import('@/features/dashboard/DashboardPage')) },
          { path: 'suppliers', lazy: page(() => import('@/features/suppliers/SuppliersPage')) },
          { path: 'buying-bills', lazy: page(() => import('@/features/purchases/PurchaseBillsPage')) },
          { path: 'buying-bills/new', lazy: page(() => import('@/features/purchases/PurchaseBillFormPage')) },
          { path: 'buying-bills/:id/edit', lazy: page(() => import('@/features/purchases/PurchaseBillFormPage')) },
          { path: 'selling-bills', lazy: page(() => import('@/features/sales/SellingBillsPage')) },
          { path: 'selling-bills/new', lazy: page(() => import('@/features/sales/SellingBillFormPage')) },
          { path: 'accounts', lazy: page(() => import('@/features/accounts/AccountsPage')) },
          { path: 'summary', lazy: page(() => import('@/features/summary/SummaryPage')) },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
