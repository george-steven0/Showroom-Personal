import { baseApi } from './baseApi'
import type { DashboardData } from '@/types'

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboard: builder.query<DashboardData, void>({
      query: () => '/dashboard',
      providesTags: ['Dashboard'],
    }),
  }),
})

export const { useGetDashboardQuery } = dashboardApi
