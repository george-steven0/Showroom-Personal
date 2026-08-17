import { baseApi } from './baseApi'
import type { ListQuery, Paginated, SellingBill } from '@/types'

export interface SellingBillPayload {
  purchaseLineId: string
  sellingPrice: number
  sellingDate: string
  buyerName: string
  buyerAddress?: string
  buyerPhone?: string
  notes?: string
}

export const sellingBillsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSellingBills: builder.query<Paginated<SellingBill>, ListQuery>({
      query: (params) => ({ url: '/selling-bills', params }),
      providesTags: (result) =>
        result
          ? [...result.rows.map((row) => ({ type: 'SellingBill' as const, id: row.id })), { type: 'SellingBill', id: 'LIST' }]
          : [{ type: 'SellingBill', id: 'LIST' }],
    }),
    createSellingBill: builder.mutation<SellingBill, SellingBillPayload>({
      query: (body) => ({ url: '/selling-bills', method: 'POST', body }),
      invalidatesTags: [
        { type: 'SellingBill', id: 'LIST' },
        { type: 'PurchaseBill', id: 'LIST' },
        { type: 'PurchaseLine', id: 'LIST' },
        'Accounts',
        'Dashboard',
        'CashTransaction',
      ],
    }),
    cancelSellingBill: builder.mutation<SellingBill, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({ url: `/selling-bills/${id}/cancel`, method: 'POST', body: { reason } }),
      invalidatesTags: [
        { type: 'SellingBill', id: 'LIST' },
        { type: 'PurchaseBill', id: 'LIST' },
        { type: 'PurchaseLine', id: 'LIST' },
        'Accounts',
        'Dashboard',
        'CashTransaction',
      ],
    }),
  }),
})

export const { useGetSellingBillsQuery, useCreateSellingBillMutation, useCancelSellingBillMutation } = sellingBillsApi
