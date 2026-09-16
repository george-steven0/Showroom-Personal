import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Drawer } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import { useCancelSellingBillMutation, useGetSellingBillsQuery } from '@/api/sellingBillsApi'
import { useTableQuery } from '@/lib/hooks/useTableQuery'
import { useDateRange } from '@/lib/hooks/useDateRange'
import { useNotify } from '@/lib/hooks/useNotify'
import { formatDate } from '@/lib/format'
import { DataTable } from '@/components/ui/DataTable'
import { BillStatusFilter, type BillStatusFilterValue } from '@/components/ui/BillStatusFilter'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { DateRangeFilter } from '@/components/ui/DateRangeFilter'
import { Money } from '@/components/ui/Money'
import { Field, PageHeader } from '@/components/ui/primitives'
import { BillStatusTag } from '@/components/ui/StatusTags'
import { ACTION_ICONS, RowActions } from '@/components/ui/RowActions'
import { UI_ICONS } from '@/components/layout/icons'
import { usePrintable, PrintButton } from '@/components/print/PrintDocument'
import type { SellingBill } from '@/types'
import { SellingBillPrint } from './SellingBillPrint'

export default function SellingBillsPage() {
  const { t } = useTranslation()
  const notify = useNotify()

  const query = useTableQuery({ sortBy: 'sellingDate', sortOrder: 'descend' })
  const [status, setStatus] = useState<BillStatusFilterValue>('active')
  const { value: range, setPreset, setCustomRange } = useDateRange('all')
  const { data, isLoading, isFetching } = useGetSellingBillsQuery({
    ...query.params,
    status: status === 'all' ? undefined : status,
    ...(range.preset === 'all' ? {} : { from: range.from, to: range.to }),
  })
  const [cancelBill, { isLoading: cancelling }] = useCancelSellingBillMutation()

  const [viewing, setViewing] = useState<SellingBill | null>(null)
  const [target, setTarget] = useState<SellingBill | null>(null)
  const { ref: printRef, print } = usePrintable(viewing?.number ?? 'selling-bill')

  const handleCancel = async () => {
    if (!target) return
    try {
      await cancelBill({ id: target.id }).unwrap()
      notify.success(t('messages.sellingCancelled'))
      setTarget(null)
    } catch (error) {
      notify.apiError(error)
    }
  }

  const columns: ColumnsType<SellingBill> = [
    {
      title: t('sales.number'),
      dataIndex: 'number',
      sorter: true,
      render: (value: string, row) => (
        <button type="button" onClick={() => setViewing(row)} className="tnum font-medium text-primary hover:underline">
          {value}
        </button>
      ),
    },
    { title: t('purchases.itemName'), dataIndex: 'itemName' },
    { title: t('sales.buyerName'), dataIndex: 'buyerName' },
    { title: t('sales.sellingDate'), dataIndex: 'sellingDate', sorter: true, render: (value: string) => formatDate(value) },
    { title: t('sales.buyingPrice'), dataIndex: 'buyingPrice', align: 'right', responsive: ['lg'], render: (value: number) => <Money value={value} /> },
    { title: t('sales.sellingPrice'), dataIndex: 'sellingPrice', align: 'right', render: (value: number) => <Money value={value} strong /> },
    { title: t('sales.profit'), dataIndex: 'profit', align: 'right', render: (value: number) => <Money value={value} signed strong /> },
    { title: t('common.status'), dataIndex: 'status', render: (_, row) => <BillStatusTag status={row.status} /> },
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
            { key: 'cancel', label: t('common.delete'), icon: ACTION_ICONS.delete, danger: true, hidden: row.status === 'cancelled', onClick: () => setTarget(row) },
          ]}
        />
      ),
    },
  ]

  const addButton = (
    <Link to="/selling-bills/new">
      <Button type="primary" icon={UI_ICONS.plus}>
        {t('sales.add')}
      </Button>
    </Link>
  )

  return (
    <>
      <PageHeader
        title={t('sales.title')}
        subtitle={t('sales.subtitle')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DateRangeFilter value={range} onPreset={setPreset} onCustom={setCustomRange} allowAllTime dropdownOnly />
            {addButton}
          </div>
        }
      />

      <DataTable<SellingBill>
        rowKey="id"
        columns={columns}
        data={data}
        loading={isLoading || isFetching}
        query={query}
        filters={
          <BillStatusFilter
            value={status}
            onChange={(next) => {
              setStatus(next)
              query.setPage(1)
            }}
          />
        }
        rowClassName={(row) => (row.status === 'cancelled' ? 'row-danger' : '')}
        searchPlaceholder={`${t('sales.number')} · ${t('sales.buyerName')}`}
        empty={
          status === 'active'
            ? { title: t('sales.empty'), description: t('sales.emptyHint'), action: addButton }
            : { title: t('common.noResults') }
        }
      />

      <Drawer
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={`${t('sales.view')} — ${viewing?.number ?? ''}`}
        size={560}
        destroyOnHidden
        extra={viewing && <PrintButton onClick={print} />}
      >
        {viewing && (
          <dl className="grid grid-cols-2 gap-4">
            <Field label={t('purchases.itemName')} value={viewing.itemName} />
            <Field label={t('purchases.chassisNumber')} value={viewing.chassisNumber} mono />
            <Field label={t('sales.supplier')} value={viewing.supplierName} />
            <Field label={t('sales.buyingDate')} value={formatDate(viewing.buyingDate)} />
            <Field label={t('sales.buyingPrice')} value={<Money value={viewing.buyingPrice} />} mono />
            <Field label={t('sales.sellingPrice')} value={<Money value={viewing.sellingPrice} />} mono />
            <Field label={t('sales.profit')} value={<Money value={viewing.profit} signed strong />} mono />
            <Field label={t('common.status')} value={<BillStatusTag status={viewing.status} />} />
            <Field label={t('sales.buyerName')} value={viewing.buyerName} />
            <Field label={t('sales.buyerPhone')} value={viewing.buyerPhone} />
            <Field label={t('sales.buyerAddress')} value={viewing.buyerAddress} className="col-span-2" />
            {viewing.notes && <Field label={t('common.notes')} value={viewing.notes} className="col-span-2" />}
          </dl>
        )}
      </Drawer>

      <div className="hidden">{viewing && <SellingBillPrint ref={printRef} bill={viewing} />}</div>

      <ConfirmModal
        open={Boolean(target)}
        loading={cancelling}
        title={t('sales.cancelTitle')}
        description={t('sales.cancelBody')}
        onConfirm={handleCancel}
        onCancel={() => setTarget(null)}
      />
    </>
  )
}
