import { baseApi } from './baseApi'
import type { FollowUpClient, ListQuery, Paginated } from '@/types'

export interface FollowUpClientPayload {
  clientName: string
  phone: string
  address: string
  carType: string
  carModel?: string
  modelYear: number
  color: string
  agreedPrice?: number | null
  downPayment?: number | null
  rating?: string
  status?: string
  notes?: string
  nextFollowUpDate?: string | null
}

export const followUpApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFollowUpClients: builder.query<Paginated<FollowUpClient>, ListQuery>({
      query: (params) => ({ url: '/follow-up', params }),
      providesTags: (result) =>
        result
          ? [...result.rows.map((row) => ({ type: 'FollowUpClient' as const, id: row.id })), { type: 'FollowUpClient', id: 'LIST' }]
          : [{ type: 'FollowUpClient', id: 'LIST' }],
    }),
    createFollowUpClient: builder.mutation<FollowUpClient, FollowUpClientPayload>({
      query: (body) => ({ url: '/follow-up', method: 'POST', body }),
      invalidatesTags: [{ type: 'FollowUpClient', id: 'LIST' }],
    }),
    updateFollowUpClient: builder.mutation<FollowUpClient, { id: string; body: FollowUpClientPayload }>({
      query: ({ id, body }) => ({ url: `/follow-up/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'FollowUpClient', id }, { type: 'FollowUpClient', id: 'LIST' }],
    }),
    deleteFollowUpClient: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/follow-up/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'FollowUpClient', id: 'LIST' }],
    }),
  }),
})

export const { useGetFollowUpClientsQuery, useCreateFollowUpClientMutation, useUpdateFollowUpClientMutation, useDeleteFollowUpClientMutation } = followUpApi
