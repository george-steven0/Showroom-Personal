import { baseApi } from './baseApi'
import type { CashTransaction } from '@/types'

export const capitalApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    injectCapital: builder.mutation<CashTransaction, { amount: number; date: string; note?: string }>({
      query: (body) => ({ url: '/capital/inject', method: 'POST', body }),
      invalidatesTags: ['Accounts', 'Dashboard', 'CashTransaction'],
    }),
  }),
})

export const { useInjectCapitalMutation } = capitalApi
