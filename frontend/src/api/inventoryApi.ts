import { baseApi } from './baseApi'
import type { InventoryBranch, InventoryItem, ListQuery, Paginated } from '@/types'

export interface InventoryItemPayload {
  carType: string
  brand?: string
  trimLevel?: string
  chassisNumber?: string
  motorNumber?: string
  modelYear?: number | null
  color?: string
  notes?: string
  branchId: string
  buyPrice?: number | null
  traderSellPrice: number
  agreedPrice: number
}

export interface MarkSoldPayload {
  buyerName: string
  buyerPhone?: string
  buyerAddress?: string
  saleNotes?: string
  saleDate?: string
  paidAmount: number
}

export interface RecordInventoryPaymentPayload {
  amount: number
  date?: string
}

export const inventoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getInventoryBranches: builder.query<InventoryBranch[], void>({
      query: () => '/inventory/branches',
      providesTags: (result) =>
        result
          ? [...result.map((row) => ({ type: 'InventoryBranch' as const, id: row.id })), { type: 'InventoryBranch', id: 'LIST' }]
          : [{ type: 'InventoryBranch', id: 'LIST' }],
    }),
    createInventoryBranch: builder.mutation<InventoryBranch, { name: string; nameAr: string }>({
      query: (body) => ({ url: '/inventory/branches', method: 'POST', body }),
      invalidatesTags: [{ type: 'InventoryBranch', id: 'LIST' }],
    }),
    updateInventoryBranch: builder.mutation<InventoryBranch, { id: string; name: string; nameAr: string }>({
      query: ({ id, name, nameAr }) => ({ url: `/inventory/branches/${id}`, method: 'PATCH', body: { name, nameAr } }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'InventoryBranch', id }, { type: 'InventoryBranch', id: 'LIST' }, { type: 'InventoryItem', id: 'LIST' }],
    }),
    deleteInventoryBranch: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/inventory/branches/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'InventoryBranch', id: 'LIST' }],
    }),

    getInventoryItems: builder.query<Paginated<InventoryItem>, ListQuery>({
      query: (params) => ({ url: '/inventory/items', params }),
      providesTags: (result) =>
        result
          ? [...result.rows.map((row) => ({ type: 'InventoryItem' as const, id: row.id })), { type: 'InventoryItem', id: 'LIST' }]
          : [{ type: 'InventoryItem', id: 'LIST' }],
    }),
    createInventoryItem: builder.mutation<InventoryItem, InventoryItemPayload>({
      query: (body) => ({ url: '/inventory/items', method: 'POST', body }),
      invalidatesTags: [{ type: 'InventoryItem', id: 'LIST' }],
    }),
    updateInventoryItem: builder.mutation<InventoryItem, { id: string; body: InventoryItemPayload }>({
      query: ({ id, body }) => ({ url: `/inventory/items/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'InventoryItem', id }, { type: 'InventoryItem', id: 'LIST' }],
    }),
    deleteInventoryItem: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/inventory/items/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'InventoryItem', id: 'LIST' }],
    }),
    markInventoryItemSold: builder.mutation<InventoryItem, { id: string; body: MarkSoldPayload }>({
      query: ({ id, body }) => ({ url: `/inventory/items/${id}/mark-sold`, method: 'POST', body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'InventoryItem', id }, { type: 'InventoryItem', id: 'LIST' }],
    }),
    updateInventorySale: builder.mutation<InventoryItem, { id: string; body: MarkSoldPayload }>({
      query: ({ id, body }) => ({ url: `/inventory/items/${id}/sale`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'InventoryItem', id }, { type: 'InventoryItem', id: 'LIST' }],
    }),
    markInventoryItemAvailable: builder.mutation<InventoryItem, string>({
      query: (id) => ({ url: `/inventory/items/${id}/mark-available`, method: 'POST' }),
      invalidatesTags: (_result, _error, id) => [{ type: 'InventoryItem', id }, { type: 'InventoryItem', id: 'LIST' }],
    }),
    recordInventoryPayment: builder.mutation<InventoryItem, { id: string; body: RecordInventoryPaymentPayload }>({
      query: ({ id, body }) => ({ url: `/inventory/items/${id}/record-payment`, method: 'POST', body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'InventoryItem', id }, { type: 'InventoryItem', id: 'LIST' }],
    }),
  }),
})

export const {
  useGetInventoryBranchesQuery,
  useCreateInventoryBranchMutation,
  useUpdateInventoryBranchMutation,
  useDeleteInventoryBranchMutation,
  useGetInventoryItemsQuery,
  useCreateInventoryItemMutation,
  useUpdateInventoryItemMutation,
  useDeleteInventoryItemMutation,
  useMarkInventoryItemSoldMutation,
  useUpdateInventorySaleMutation,
  useMarkInventoryItemAvailableMutation,
  useRecordInventoryPaymentMutation,
} = inventoryApi
