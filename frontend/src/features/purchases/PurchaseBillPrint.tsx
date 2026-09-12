import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import { formatMoney } from '@/lib/format'
import { PrintDocument } from '@/components/print/PrintDocument'
import type { PurchaseBill } from '@/types'

export const PurchaseBillPrint = forwardRef<HTMLDivElement, { bill: PurchaseBill }>(function PurchaseBillPrint({ bill }, ref) {
  const { t } = useTranslation()

  return (
    <PrintDocument ref={ref} title={t('purchases.view')} number={bill.number} date={bill.date}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-start text-xs text-muted uppercase">
            <th className="py-2 text-start">{t('purchases.itemName')}</th>
            <th className="py-2 text-start">{t('purchases.supplier')}</th>
            <th className="py-2 text-start">{t('purchases.chassisNumber')}</th>
            <th className="py-2 text-end">{t('purchases.price')}</th>
            <th className="py-2 text-end">{t('purchases.paidAmount')}</th>
            <th className="py-2 text-end">{t('purchases.owed')}</th>
          </tr>
        </thead>
        <tbody>
          {bill.lines.map((line) => (
            <tr key={line.id} className="border-b border-line/60">
              <td className="py-2">{line.itemName}</td>
              <td className="py-2">{line.supplierName}</td>
              <td className="py-2 ltr-code">{line.chassisNumber}</td>
              <td className="py-2 text-end tnum">{formatMoney(line.price)}</td>
              <td className="py-2 text-end tnum">{formatMoney(line.paidAmount)}</td>
              <td className="py-2 text-end tnum">{formatMoney(line.owed)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} />
            <td className="pt-3 text-end font-semibold">{formatMoney(bill.total)}</td>
            <td className="pt-3 text-end font-semibold">{formatMoney(bill.lines.reduce((sum, line) => sum + line.paidAmount, 0))}</td>
            <td className="pt-3 text-end font-semibold">{formatMoney(bill.lines.reduce((sum, line) => sum + line.owed, 0))}</td>
          </tr>
        </tfoot>
      </table>

      {bill.notes && (
        <p className="mt-6 text-sm text-muted">
          <strong className="text-ink">{t('common.notes')}:</strong> {bill.notes}
        </p>
      )}
    </PrintDocument>
  )
})
