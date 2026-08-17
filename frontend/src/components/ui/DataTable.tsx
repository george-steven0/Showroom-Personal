import { type ReactNode, useMemo } from 'react'
import { Badge, Button, Input, Table, Tooltip } from 'antd'
import type { TableProps } from 'antd'
import { useTranslation } from 'react-i18next'
import { PAGE_SIZE_OPTIONS } from '@/lib/constants'
import type { Paginated } from '@/types'
import type { TableQuery } from '@/lib/hooks/useTableQuery'
import { EmptyState } from './primitives'

export interface DataTableProps<T> extends Omit<TableProps<T>, 'dataSource' | 'pagination' | 'title'> {
  data: Paginated<T> | undefined
  loading?: boolean
  query: TableQuery
  searchPlaceholder?: string
  filters?: ReactNode
  actions?: ReactNode
  empty?: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }
  showSearch?: boolean
  toolbar?: boolean
}

/** Search, filters, sorting and paging driven by `useTableQuery`, handed straight to the RTK Query hook. */
export function DataTable<T extends object>({
  data,
  loading = false,
  query,
  searchPlaceholder,
  filters,
  actions,
  empty,
  showSearch = true,
  toolbar = true,
  columns,
  ...tableProps
}: DataTableProps<T>) {
  const { t } = useTranslation()

  const isEmpty = !loading && (data?.total ?? 0) === 0
  const isFiltered = Boolean(query.state.search) || query.activeFilterCount > 0

  const emptyRender = useMemo(() => {
    if (isFiltered) {
      return (
        <EmptyState
          compact
          title={t('common.noResults')}
          action={
            <Button size="small" onClick={query.reset}>
              {t('common.clearFilters')}
            </Button>
          }
        />
      )
    }
    return (
      <EmptyState compact icon={empty?.icon} title={empty?.title ?? t('common.noResults')} description={empty?.description} action={empty?.action} />
    )
  }, [empty, isFiltered, query.reset, t])

  return (
    <div className="rounded-card border border-line bg-surface shadow-card mt-4">
      {toolbar && (showSearch || filters || actions) && (
        <div className="flex flex-col gap-3 border-b border-line p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {showSearch && (
              <Input.Search
                allowClear
                value={query.searchInput}
                onChange={(event) => query.setSearchInput(event.target.value)}
                placeholder={searchPlaceholder ?? t('common.search')}
                className="w-full sm:max-w-xs"
              />
            )}
            {filters}
            {isFiltered && (
              <Tooltip title={t('common.clearFilters')}>
                <Badge count={query.activeFilterCount} size="small" offset={[-2, 2]}>
                  <Button size="middle" onClick={query.reset}>
                    {t('common.reset')}
                  </Button>
                </Badge>
              </Tooltip>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}

      <Table<T>
        {...tableProps}
        columns={columns}
        dataSource={data?.rows ?? []}
        loading={loading}
        size="middle"
        scroll={{ x: 'max-content', ...(tableProps.scroll ?? {}) }}
        locale={{ emptyText: isEmpty ? emptyRender : undefined, ...tableProps.locale }}
        onChange={(pagination, _filters, sorter) => {
          const single = Array.isArray(sorter) ? sorter[0] : sorter
          const field = single?.field
          query.setSort(single?.order ? (Array.isArray(field) ? field.join('.') : String(field ?? '')) : undefined, single?.order ?? null)
          query.setPage(pagination.current ?? 1, pagination.pageSize)
        }}
        pagination={
          (data?.total ?? 0) === 0
            ? false
            : {
                current: query.state.page,
                pageSize: query.state.pageSize,
                total: data?.total ?? 0,
                showSizeChanger: true,
                pageSizeOptions: PAGE_SIZE_OPTIONS,
                responsive: true,
                showTotal: (total, range) => t('common.showing', { from: range[0], to: range[1], total }),
                className: 'px-4 pb-1',
              }
        }
      />
    </div>
  )
}
