import { forwardRef, type ReactNode } from 'react'
import { useReactToPrint } from 'react-to-print'
import { useRef } from 'react'
import { Button } from 'antd'
import { useTranslation } from 'react-i18next'
import { ACTION_ICONS } from '@/components/ui/RowActions'
import { formatDate } from '@/lib/format'

/** Print trigger + the ref/print pair a document component wires to its printable root. */
export function usePrintable(documentTitle: string) {
  const ref = useRef<HTMLDivElement>(null)
  const print = useReactToPrint({ contentRef: ref, documentTitle })
  return { ref, print }
}

export function PrintButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <Button icon={ACTION_ICONS.print} onClick={onClick}>
      {t('common.print')}
    </Button>
  )
}

export interface PrintDocumentProps {
  title: string
  number: string
  date: string
  children: ReactNode
}

/** A4 print layout shared by buying and selling bill documents. */
export const PrintDocument = forwardRef<HTMLDivElement, PrintDocumentProps>(function PrintDocument(
  { title, number, date, children },
  ref,
) {
  return (
    <div ref={ref} className="print-root p-8 text-ink">
      <header className="mb-6 flex items-start justify-between border-b border-line pb-4">
        <div>
          <p className="text-lg font-semibold text-ink">Showroom</p>
          <p className="mt-0.5 text-sm text-muted">{title}</p>
        </div>
        <div className="text-end text-sm">
          <p className="font-medium text-ink">#{number}</p>
          <p className="text-muted">{formatDate(date)}</p>
        </div>
      </header>
      {children}
    </div>
  )
})
