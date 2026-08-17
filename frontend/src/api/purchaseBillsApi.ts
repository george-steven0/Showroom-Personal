import { baseApi } from './baseApi'
import type { ListQuery, Paginated, PurchaseBill, PurchaseBillLine } from '@/types'

export interface PurchaseLinePayload {
  itemName: string
  quantity: number
  description?: string
  supplierId: string
  chassisNumber: string
  motorNumber: string
  modelYear?: number | null
  price: number
  paidAmount: number
  notes?: string
}

export interface PurchaseBillPayload {
  date: string
  notes?: string
  lines: PurchaseLinePayload[]
}

export const purchaseBillsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPurchaseBills: builder.query<Paginated<PurchaseBill>, ListQuery>({
      query: (params) => ({ url: '/purchase-bills', params }),
      providesTags: (result) =>
        result
          ? [...result.rows.map((row) => ({ type: 'PurchaseBill' as const, id: row.id })), { type: 'PurchaseBill', id: 'LIST' }]
          : [{ type: 'PurchaseBill', id: 'LIST' }],
    }),
    getPurchaseBill: builder.query<PurchaseBill, string>({
      query: (id) => `/purchase-bills/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'PurchaseBill', id }],
    }),
    createPurchaseBill: builder.mutation<PurchaseBill, PurchaseBillPayload>({
      query: (body) => ({ url: '/purchase-bills', method: 'POST', body }),
      invalidatesTags: [{ type: 'PurchaseBill', id: 'LIST' }, { type: 'PurchaseLine', id: 'LIST' }, 'Accounts', 'Dashboard', 'CashTransaction'],
    }),
    updatePurchaseBill: builder.mutation<PurchaseBill, { id: string; body: PurchaseBillPayload }>({
      query: ({ id, body }) => ({ url: `/purchase-bills/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'PurchaseBill', id },
        { type: 'PurchaseBill', id: 'LIST' },
        { type: 'PurchaseLine', id: 'LIST' },
        'Accounts',
        'Dashboard',
        'CashTransaction',
      ],
    }),
    cancelPurchaseBill: builder.mutation<PurchaseBill, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({ url: `/purchase-bills/${id}/cancel`, method: 'POST', body: { reason } }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'PurchaseBill', id },
        { type: 'PurchaseBill', id: 'LIST' },
        { type: 'PurchaseLine', id: 'LIST' },
        'Accounts',
        'Dashboard',
        'CashTransaction',
      ],
    }),
    getAvailablePurchaseLines: builder.query<PurchaseBillLine[], void>({
      query: () => '/purchase-bill-lines?status=in_stock',
      providesTags: [{ type: 'PurchaseLine', id: 'LIST' }],
    }),
    settlePayment: builder.mutation<PurchaseBillLine, { id: string; amount: number; date: string; note?: string }>({
      query: ({ id, ...body }) => ({ url: `/purchase-bill-lines/${id}/settle-payment`, method: 'POST', body }),
      invalidatesTags: [{ type: 'PurchaseBill', id: 'LIST' }, 'Accounts', 'Dashboard', 'CashTransaction'],
    }),
  }),
})

export const {
  useGetPurchaseBillsQuery,
  useGetPurchaseBillQuery,
  useCreatePurchaseBillMutation,
  useUpdatePurchaseBillMutation,
  useCancelPurchaseBillMutation,
  useGetAvailablePurchaseLinesQuery,
  useSettlePaymentMutation,
} = purchaseBillsApi
