import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDate, formatMoney } from '@/lib/format'
import { PrintDocument } from '@/components/print/PrintDocument'
import type { SellingBill } from '@/types'

export const SellingBillPrint = forwardRef<HTMLDivElement, { bill: SellingBill }>(function SellingBillPrint({ bill }, ref) {
  const { t } = useTranslation()

  return (
    <PrintDocument ref={ref} title={t('sales.view')} number={bill.number} date={bill.sellingDate}>
      <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-muted uppercase">{t('sales.buyerName')}</p>
          <p className="font-medium">{bill.buyerName}</p>
        </div>
        {bill.buyerPhone && (
          <div>
            <p className="text-xs text-muted uppercase">{t('sales.buyerPhone')}</p>
            <p className="font-medium">{bill.buyerPhone}</p>
          </div>
        )}
        {bill.buyerAddress && (
          <div className="col-span-2">
            <p className="text-xs text-muted uppercase">{t('sales.buyerAddress')}</p>
            <p className="font-medium">{bill.buyerAddress}</p>
          </div>
        )}
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-start text-xs text-muted uppercase">
            <th className="py-2 text-start">{t('purchases.itemName')}</th>
            <th className="py-2 text-start">{t('purchases.chassisNumber')}</th>
            <th className="py-2 text-start">{t('sales.buyingDate')}</th>
            <th className="py-2 text-end">{t('sales.sellingPrice')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="py-2">{bill.itemName}</td>
            <td className="py-2 ltr-code">{bill.chassisNumber}</td>
            <td className="py-2">{formatDate(bill.buyingDate)}</td>
            <td className="py-2 text-end tnum font-semibold">{formatMoney(bill.sellingPrice)}</td>
          </tr>
        </tbody>
      </table>

      {bill.notes && (
        <p className="mt-6 text-sm text-muted">
          <strong className="text-ink">{t('common.notes')}:</strong> {bill.notes}
        </p>
      )}
    </PrintDocument>
  )
})
