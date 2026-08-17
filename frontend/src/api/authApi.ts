import { baseApi } from './baseApi'
import type { AuthUser, LoginPayload, LoginResponse } from '@/types'

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginPayload>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
    me: builder.query<AuthUser, void>({
      query: () => '/auth/me',
    }),
  }),
})

export const { useLoginMutation, useMeQuery } = authApi
