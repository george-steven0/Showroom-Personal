/** The shape every list endpoint returns — matches `Paginated<T>` in `frontend/src/types/index.ts`. */
export interface Paginated<T> {
  rows: T[]
  total: number
  page: number
  pageSize: number
}

export interface PageParams {
  page?: number
  pageSize?: number
}

/** Prisma `skip`/`take` from the same page params every controller receives. */
export function toSkipTake({ page = 1, pageSize = 20 }: PageParams): { skip: number; take: number | undefined } {
  if (pageSize === 0) return { skip: 0, take: undefined }
  return { skip: (Math.max(1, page) - 1) * pageSize, take: pageSize }
}

/** Wraps a Prisma `[rows, total]` pair into the response envelope. */
export function paginate<T>(rows: T[], total: number, { page = 1, pageSize = 20 }: PageParams): Paginated<T> {
  return { rows, total, page, pageSize: pageSize === 0 ? total : pageSize }
}

export interface SortParams {
  sortBy?: string
  sortOrder?: 'ascend' | 'descend' | null
}

/**
 * Turns a client's `sortBy`/`sortOrder` into a real Prisma `orderBy`, restricted to a per-entity
 * allowlist so a request can never sort by an arbitrary or non-existent column.
 */
export function resolveOrderBy(
  query: SortParams,
  sortableFields: Record<string, string | string[]>,
  fallback: Record<string, unknown>,
): Record<string, unknown> {
  const path = query.sortBy ? sortableFields[query.sortBy] : undefined
  if (!path) return fallback

  const direction: 'asc' | 'desc' = query.sortOrder === 'ascend' ? 'asc' : 'desc'
  const keys = Array.isArray(path) ? path : [path]
  return keys.reduceRight<unknown>((acc, key) => ({ [key]: acc }), direction) as Record<string, unknown>
}
