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

export type UpdateSellingBillPayload = Omit<SellingBillPayload, 'purchaseLineId'>

export const sellingBillsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSellingBills: builder.query<Paginated<SellingBill>, ListQuery>({
      query: (params) => ({ url: '/selling-bills', params }),
      providesTags: (result) =>
        result
          ? [...result.rows.map((row) => ({ type: 'SellingBill' as const, id: row.id })), { type: 'SellingBill', id: 'LIST' }]
          : [{ type: 'SellingBill', id: 'LIST' }],
    }),
    getSellingBill: builder.query<SellingBill, string>({
      query: (id) => `/selling-bills/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'SellingBill', id }],
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
    updateSellingBill: builder.mutation<SellingBill, { id: string; body: UpdateSellingBillPayload }>({
      query: ({ id, body }) => ({ url: `/selling-bills/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'SellingBill', id },
        { type: 'SellingBill', id: 'LIST' },
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

export const {
  useGetSellingBillsQuery,
  useGetSellingBillQuery,
  useCreateSellingBillMutation,
  useUpdateSellingBillMutation,
  useCancelSellingBillMutation,
} = sellingBillsApi
