import { baseApi } from './baseApi'
import type { ListQuery, Paginated, Supplier } from '@/types'
import type { SupplierFormValues } from '@/lib/validation'

export const suppliersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSuppliers: builder.query<Paginated<Supplier>, ListQuery>({
      query: (params) => ({ url: '/suppliers', params }),
      providesTags: (result) =>
        result
          ? [...result.rows.map((row) => ({ type: 'Supplier' as const, id: row.id })), { type: 'Supplier', id: 'LIST' }]
          : [{ type: 'Supplier', id: 'LIST' }],
    }),
    createSupplier: builder.mutation<Supplier, SupplierFormValues>({
      query: (body) => ({ url: '/suppliers', method: 'POST', body }),
      invalidatesTags: [{ type: 'Supplier', id: 'LIST' }],
    }),
    updateSupplier: builder.mutation<Supplier, { id: string; body: SupplierFormValues }>({
      query: ({ id, body }) => ({ url: `/suppliers/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Supplier', id }, { type: 'Supplier', id: 'LIST' }],
    }),
    deleteSupplier: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/suppliers/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Supplier', id: 'LIST' }],
    }),
  }),
})

export const { useGetSuppliersQuery, useCreateSupplierMutation, useUpdateSupplierMutation, useDeleteSupplierMutation } = suppliersApi
