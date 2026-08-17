import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { API_BASE } from '@/lib/constants'
import type { RootState } from '@/app/store'

export const TAGS = [
  'Supplier',
  'PurchaseBill',
  'PurchaseLine',
  'SellingBill',
  'Expense',
  'CashTransaction',
  'Accounts',
  'Dashboard',
] as const

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return headers
  },
})

/** A 401 from any endpoint means the session is gone; clear it here so every screen bounces to /login the same way. */
const baseQueryWithAuth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const result = await rawBaseQuery(args, api, extraOptions)

  if (result.error?.status === 401) {
    const { sessionExpired } = await import('@/features/auth/authSlice')
    api.dispatch(sessionExpired())
  }

  return result
}

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  tagTypes: TAGS,
  refetchOnMountOrArgChange: false,
  refetchOnReconnect: true,
  endpoints: () => ({}),
})

export function errorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback
  const data = (error as FetchBaseQueryError).data
  if (data && typeof data === 'object' && 'message' in data) {
    return String((data as { message: unknown }).message)
  }
  if ('error' in (error as Record<string, unknown>)) {
    return String((error as { error: unknown }).error)
  }
  return fallback
}
