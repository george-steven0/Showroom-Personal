import { baseApi } from './baseApi'
import type { CashTransaction, ListQuery, MovementsSummary, Paginated } from '@/types'

export const reportsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCashTransactions: builder.query<Paginated<CashTransaction>, ListQuery>({
      query: (params) => ({ url: '/cash-transactions', params }),
      providesTags: (result) =>
        result
          ? [...result.rows.map((row) => ({ type: 'CashTransaction' as const, id: row.id })), { type: 'CashTransaction', id: 'LIST' }]
          : [{ type: 'CashTransaction', id: 'LIST' }],
    }),
    getMovementsSummary: builder.query<MovementsSummary, { from: string; to: string }>({
      query: (params) => ({ url: '/cash-transactions/summary', params }),
      providesTags: ['CashTransaction'],
    }),
  }),
})

export const { useGetCashTransactionsQuery, useGetMovementsSummaryQuery } = reportsApi
