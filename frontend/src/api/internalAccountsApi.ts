import { baseApi } from './baseApi'
import type { InternalAccountEntry, InternalAccountsSummary, ListQuery, Paginated } from '@/types'
import type { InternalEntryFormValues } from '@/lib/validation'

/** Internal accounts stand apart from the books: no mutation here touches the Accounts, Dashboard or ledger tags. */
export const internalAccountsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getInternalEntries: builder.query<Paginated<InternalAccountEntry>, ListQuery>({
      query: (params) => ({ url: '/internal-accounts', params }),
      providesTags: (result) =>
        result
          ? [...result.rows.map((row) => ({ type: 'InternalAccount' as const, id: row.id })), { type: 'InternalAccount', id: 'LIST' }]
          : [{ type: 'InternalAccount', id: 'LIST' }],
    }),
    getInternalSummary: builder.query<InternalAccountsSummary, { search?: string; from?: string; to?: string }>({
      query: (params) => ({ url: '/internal-accounts/summary', params }),
      providesTags: [{ type: 'InternalAccount', id: 'LIST' }],
    }),
    createInternalEntry: builder.mutation<InternalAccountEntry, InternalEntryFormValues>({
      query: (body) => ({ url: '/internal-accounts', method: 'POST', body }),
      invalidatesTags: [{ type: 'InternalAccount', id: 'LIST' }],
    }),
    updateInternalEntry: builder.mutation<InternalAccountEntry, { id: string; body: InternalEntryFormValues }>({
      query: ({ id, body }) => ({ url: `/internal-accounts/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'InternalAccount', id }, { type: 'InternalAccount', id: 'LIST' }],
    }),
    deleteInternalEntry: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/internal-accounts/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'InternalAccount', id: 'LIST' }],
    }),
  }),
})

export const {
  useGetInternalEntriesQuery,
  useGetInternalSummaryQuery,
  useCreateInternalEntryMutation,
  useUpdateInternalEntryMutation,
  useDeleteInternalEntryMutation,
} = internalAccountsApi
