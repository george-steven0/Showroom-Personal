import { baseApi } from './baseApi'
import type { AccountsSummary, OwedSupplierRow, ProfitSummary } from '@/types'

export const accountsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAccountsSummary: builder.query<AccountsSummary, void>({
      query: () => '/accounts/summary',
      providesTags: ['Accounts'],
    }),
    getOwedToSuppliers: builder.query<OwedSupplierRow[], void>({
      query: () => '/accounts/owed',
      providesTags: ['Accounts'],
    }),
    getProfitSummary: builder.query<ProfitSummary, { from: string; to: string }>({
      query: (params) => ({ url: '/accounts/profit', params }),
      providesTags: ['Accounts'],
    }),
  }),
})

export const { useGetAccountsSummaryQuery, useGetOwedToSuppliersQuery, useGetProfitSummaryQuery } = accountsApi
