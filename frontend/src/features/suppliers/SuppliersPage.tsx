import { useState } from 'react'
import { Button } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import { useDeleteSupplierMutation, useGetSuppliersQuery } from '@/api/suppliersApi'
import { useTableQuery } from '@/lib/hooks/useTableQuery'
import { useNotify } from '@/lib/hooks/useNotify'
import { DataTable } from '@/components/ui/DataTable'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { PageHeader } from '@/components/ui/primitives'
import { ACTION_ICONS, RowActions } from '@/components/ui/RowActions'
import { UI_ICONS } from '@/components/layout/icons'
import type { Supplier } from '@/types'
import { SupplierModal } from './SupplierModal'

export default function SuppliersPage() {
  const { t } = useTranslation()
  const notify = useNotify()

  const query = useTableQuery({ sortBy: 'name' })
  const { data, isLoading, isFetching } = useGetSuppliersQuery(query.params)
  const [deleteSupplier, { isLoading: deleting }] = useDeleteSupplierMutation()

  const [editing, setEditing] = useState<Supplier | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [target, setTarget] = useState<Supplier | null>(null)

  const handleDelete = async () => {
    if (!target) return
    try {
      await deleteSupplier(target.id).unwrap()
      notify.success(t('messages.supplierDeleted'))
      setTarget(null)
    } catch (error) {
      notify.apiError(error, 'messages.deleteFailed')
    }
  }

  const columns: ColumnsType<Supplier> = [
    { title: t('common.name'), dataIndex: 'name', sorter: true, render: (value: string) => <span className="font-medium text-ink">{value}</span> },
    { title: t('common.phone'), dataIndex: 'phone', render: (value: string | null) => value ?? <span className="text-subtle">—</span> },
    {
      title: t('suppliers.phone2'),
      dataIndex: 'phone2',
      responsive: ['lg'],
      render: (value: string | null) => value ?? <span className="text-subtle">—</span>,
    },
    { title: t('common.address'), dataIndex: 'address', ellipsis: true, render: (value: string | null) => value ?? <span className="text-subtle">—</span> },
    {
      title: t('common.actions'),
      key: 'actions',
      align: 'right',
      width: 60,
      fixed: 'right',
      render: (_, row) => (
        <RowActions
          actions={[
            {
              key: 'edit',
              label: t('common.edit'),
              icon: ACTION_ICONS.edit,
              onClick: () => {
                setEditing(row)
                setFormOpen(true)
              },
            },
            { key: 'delete', label: t('common.delete'), icon: ACTION_ICONS.delete, danger: true, onClick: () => setTarget(row) },
          ]}
        />
      ),
    },
  ]

  const addButton = (
    <Button
      type="primary"
      icon={UI_ICONS.plus}
      onClick={() => {
        setEditing(null)
        setFormOpen(true)
      }}
    >
      {t('suppliers.add')}
    </Button>
  )

  return (
    <>
      <PageHeader title={t('suppliers.title')} subtitle={t('suppliers.subtitle')} actions={addButton} />

      <DataTable<Supplier>
        rowKey="id"
        columns={columns}
        data={data}
        loading={isLoading || isFetching}
        query={query}
        searchPlaceholder={t('common.name')}
        empty={{ title: t('suppliers.empty'), description: t('suppliers.emptyHint'), action: addButton }}
      />

      <SupplierModal
        open={formOpen}
        supplier={editing}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
      />

      <ConfirmModal
        open={Boolean(target)}
        loading={deleting}
        title={t('suppliers.deleteTitle')}
        description={t('suppliers.deleteBody', { name: target?.name ?? '' })}
        onConfirm={handleDelete}
        onCancel={() => setTarget(null)}
      />
    </>
  )
}
