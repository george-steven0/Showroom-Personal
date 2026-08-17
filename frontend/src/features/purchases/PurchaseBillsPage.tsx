import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Descriptions, Drawer, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import { useCancelPurchaseBillMutation, useGetPurchaseBillsQuery } from '@/api/purchaseBillsApi'
import { useTableQuery } from '@/lib/hooks/useTableQuery'
import { useNotify } from '@/lib/hooks/useNotify'
import { formatDate } from '@/lib/format'
import { DataTable } from '@/components/ui/DataTable'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Money } from '@/components/ui/Money'
import { PageHeader } from '@/components/ui/primitives'
import { BillStatusTag, PurchaseLineStatusTag } from '@/components/ui/StatusTags'
import { ACTION_ICONS, RowActions } from '@/components/ui/RowActions'
import { UI_ICONS } from '@/components/layout/icons'
import { usePrintable, PrintButton } from '@/components/print/PrintDocument'
import type { PurchaseBill } from '@/types'
import { PurchaseBillPrint } from './PurchaseBillPrint'

export default function PurchaseBillsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const notify = useNotify()

  const query = useTableQuery({ sortBy: 'date', sortOrder: 'descend' })
  const { data, isLoading, isFetching } = useGetPurchaseBillsQuery(query.params)
  const [cancelBill, { isLoading: cancelling }] = useCancelPurchaseBillMutation()

  const [viewing, setViewing] = useState<PurchaseBill | null>(null)
  const [target, setTarget] = useState<PurchaseBill | null>(null)
  const { ref: printRef, print } = usePrintable(viewing?.number ?? 'buying-bill')

  const handleCancel = async () => {
    if (!target) return
    try {
      await cancelBill({ id: target.id }).unwrap()
      notify.success(t('messages.purchaseCancelled'))
      setTarget(null)
    } catch (error) {
      notify.apiError(error)
    }
  }

  const canEditOrCancel = (row: PurchaseBill) => row.status === 'active' && row.lines.every((line) => line.status === 'in_stock')

  const columns: ColumnsType<PurchaseBill> = [
    {
      title: t('purchases.number'),
      dataIndex: 'number',
      sorter: true,
      render: (value: string, row) => (
        <button type="button" onClick={() => setViewing(row)} className="tnum font-medium text-primary hover:underline">
          {value}
        </button>
      ),
    },
    { title: t('purchases.date'), dataIndex: 'date', sorter: true, render: (value: string) => <span className="whitespace-nowrap">{formatDate(value)}</span> },
    {
      title: t('purchases.supplier'),
      dataIndex: 'lines',
      ellipsis: true,
      render: (lines: PurchaseBill['lines']) => <span>{[...new Set(lines.map((line) => line.supplierName))].join(', ') || '—'}</span>,
    },
    { title: t('purchases.itemCount'), dataIndex: 'lines', align: 'right', width: 90, render: (lines: PurchaseBill['lines']) => lines.length },
    { title: t('purchases.grandTotal'), dataIndex: 'total', sorter: true, align: 'right', render: (value: number) => <Money value={value} strong /> },
    { title: t('common.status'), dataIndex: 'status', render: (_, row) => <BillStatusTag status={row.status} /> },
    {
      title: t('common.createdBy'),
      dataIndex: 'createdByName',
      responsive: ['xl'],
      render: (value: string) => <span className="text-xs text-muted">{value}</span>,
    },
    {
      title: t('common.actions'),
      key: 'actions',
      align: 'right',
      width: 60,
      fixed: 'right',
      render: (_, row) => (
        <RowActions
          actions={[
            { key: 'view', label: t('common.view'), icon: ACTION_ICONS.view, onClick: () => setViewing(row) },
            {
              key: 'edit',
              label: t('common.edit'),
              icon: ACTION_ICONS.edit,
              hidden: !canEditOrCancel(row),
              onClick: () => navigate(`/buying-bills/${row.id}/edit`),
            },
            {
              key: 'cancel',
              label: t('common.delete'),
              icon: ACTION_ICONS.delete,
              danger: true,
              hidden: row.status === 'cancelled',
              disabled: !canEditOrCancel(row),
              onClick: () => setTarget(row),
            },
          ]}
        />
      ),
    },
  ]

  const addButton = (
    <Link to="/buying-bills/new">
      <Button type="primary" icon={UI_ICONS.plus}>
        {t('purchases.add')}
      </Button>
    </Link>
  )

  return (
    <>
      <PageHeader title={t('purchases.title')} subtitle={t('purchases.subtitle')} actions={addButton} />

      <DataTable<PurchaseBill>
        rowKey="id"
        columns={columns}
        data={data}
        loading={isLoading || isFetching}
        query={query}
        rowClassName={(row) => (row.status === 'cancelled' ? 'row-danger' : '')}
        searchPlaceholder={`${t('purchases.number')} · ${t('purchases.itemName')}`}
        empty={{ title: t('purchases.empty'), description: t('purchases.emptyHint'), action: addButton }}
      />

      <Drawer
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={`${t('purchases.view')} — ${viewing?.number ?? ''}`}
        size={880}
        destroyOnHidden
        extra={viewing && <PrintButton onClick={print} />}
      >
        {viewing && (
          <>
            <Descriptions bordered size="small" column={2} className="mb-5">
              <Descriptions.Item label={t('purchases.date')}>{formatDate(viewing.date)}</Descriptions.Item>
              <Descriptions.Item label={t('common.status')}>
                <BillStatusTag status={viewing.status} />
              </Descriptions.Item>
              <Descriptions.Item label={t('common.createdBy')}>{viewing.createdByName}</Descriptions.Item>
              {viewing.notes && (
                <Descriptions.Item label={t('common.notes')} span={2}>
                  {viewing.notes}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Table
              rowKey="id"
              size="small"
              dataSource={viewing.lines}
              pagination={false}
              scroll={{ x: 'max-content' }}
              columns={[
                { title: t('purchases.itemName'), dataIndex: 'itemName' },
                { title: t('purchases.supplier'), dataIndex: 'supplierName' },
                { title: t('purchases.chassisNumber'), dataIndex: 'chassisNumber' },
                { title: t('purchases.motorNumber'), dataIndex: 'motorNumber' },
                { title: t('purchases.modelYear'), dataIndex: 'modelYear', render: (value: number | null) => value ?? '—' },
                { title: t('purchases.price'), dataIndex: 'price', align: 'right', render: (value: number) => <Money value={value} /> },
                { title: t('purchases.paidAmount'), dataIndex: 'paidAmount', align: 'right', render: (value: number) => <Money value={value} /> },
                { title: t('purchases.owed'), dataIndex: 'owed', align: 'right', render: (value: number) => <Money value={value} signed strong /> },
                { title: t('common.status'), dataIndex: 'status', render: (value) => <PurchaseLineStatusTag status={value} /> },
              ]}
              summary={() => (
                <Table.Summary>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={5} align="right">
                      <strong>{t('purchases.grandTotal')}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <Money value={viewing.total} strong />
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} colSpan={2} />
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </>
        )}
      </Drawer>

      <div className="hidden">{viewing && <PurchaseBillPrint ref={printRef} bill={viewing} />}</div>

      <ConfirmModal
        open={Boolean(target)}
        loading={cancelling}
        title={t('purchases.cancelTitle')}
        description={t('purchases.cancelBody')}
        onConfirm={handleCancel}
        onCancel={() => setTarget(null)}
      />
    </>
  )
}
