import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'

export interface TableQueryState {
  page: number
  pageSize: number
  search: string
  sortBy?: string
  sortOrder?: 'ascend' | 'descend' | null
  filters: Record<string, unknown>
}

export interface TableQueryOptions {
  pageSize?: number
  sortBy?: string
  sortOrder?: 'ascend' | 'descend'
  filters?: Record<string, unknown>
}

/**
 * Table state in one place: debounced search, sorting, filters and paging.
 * `params` is handed straight to an RTK Query hook, so what the user sees
 * and what the server was asked for can never disagree.
 */
export function useTableQuery(options: TableQueryOptions = {}) {
  const [state, setState] = useState<TableQueryState>({
    page: 1,
    pageSize: options.pageSize ?? DEFAULT_PAGE_SIZE,
    search: '',
    sortBy: options.sortBy,
    sortOrder: options.sortOrder ?? null,
    filters: options.filters ?? {},
  })

  const [searchInput, setSearchInput] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setState((prev) => (prev.search === searchInput ? prev : { ...prev, search: searchInput, page: 1 }))
    }, 300)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [searchInput])

  const setPage = useCallback((page: number, pageSize?: number) => {
    setState((prev) => ({ ...prev, page, pageSize: pageSize ?? prev.pageSize }))
  }, [])

  const setSort = useCallback((sortBy?: string, sortOrder?: 'ascend' | 'descend' | null) => {
    setState((prev) => ({ ...prev, sortBy, sortOrder: sortOrder ?? null }))
  }, [])

  const setFilter = useCallback((key: string, value: unknown) => {
    setState((prev) => ({ ...prev, page: 1, filters: { ...prev.filters, [key]: value } }))
  }, [])

  const setFilters = useCallback((next: Record<string, unknown>) => {
    setState((prev) => ({ ...prev, page: 1, filters: { ...prev.filters, ...next } }))
  }, [])

  const reset = useCallback(() => {
    setSearchInput('')
    setState({
      page: 1,
      pageSize: options.pageSize ?? DEFAULT_PAGE_SIZE,
      search: '',
      sortBy: options.sortBy,
      sortOrder: options.sortOrder ?? null,
      filters: options.filters ?? {},
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const params = useMemo(
    () => ({
      page: state.page,
      pageSize: state.pageSize,
      search: state.search || undefined,
      sortBy: state.sortBy,
      sortOrder: state.sortOrder ?? undefined,
      ...state.filters,
    }),
    [state],
  )

  const activeFilterCount = useMemo(
    () =>
      Object.values(state.filters).filter(
        (value) => value != null && value !== '' && value !== 'all' && !(Array.isArray(value) && !value.length),
      ).length,
    [state.filters],
  )

  return { state, params, searchInput, setSearchInput, setPage, setSort, setFilter, setFilters, reset, activeFilterCount }
}

export type TableQuery = ReturnType<typeof useTableQuery>
