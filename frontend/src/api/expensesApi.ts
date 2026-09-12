import { baseApi } from './baseApi'
import type { Expense, ListQuery, Paginated } from '@/types'
import type { ExpenseFormValues } from '@/lib/validation'

export const expensesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getExpenses: builder.query<Paginated<Expense>, ListQuery>({
      query: (params) => ({ url: '/expenses', params }),
      providesTags: (result) =>
        result
          ? [...result.rows.map((row) => ({ type: 'Expense' as const, id: row.id })), { type: 'Expense', id: 'LIST' }]
          : [{ type: 'Expense', id: 'LIST' }],
    }),
    getExpensesSummary: builder.query<{ totalAmount: number; count: number }, { search?: string; from?: string; to?: string }>({
      query: (params) => ({ url: '/expenses/summary', params }),
      providesTags: [{ type: 'Expense', id: 'LIST' }],
    }),
    createExpense: builder.mutation<Expense, ExpenseFormValues>({
      query: (body) => ({ url: '/expenses', method: 'POST', body }),
      invalidatesTags: [{ type: 'Expense', id: 'LIST' }, 'Accounts', 'Dashboard', 'CashTransaction'],
    }),
    updateExpense: builder.mutation<Expense, { id: string; body: ExpenseFormValues }>({
      query: ({ id, body }) => ({ url: `/expenses/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Expense', id }, { type: 'Expense', id: 'LIST' }, 'Accounts', 'Dashboard', 'CashTransaction'],
    }),
    deleteExpense: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/expenses/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Expense', id: 'LIST' }, 'Accounts', 'Dashboard', 'CashTransaction'],
    }),
  }),
})

export const { useGetExpensesQuery, useGetExpensesSummaryQuery, useCreateExpenseMutation, useUpdateExpenseMutation, useDeleteExpenseMutation } =
  expensesApi
