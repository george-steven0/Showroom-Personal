export const BILL_STATUSES = ['active', 'cancelled'] as const
export type BillStatus = (typeof BILL_STATUSES)[number]

export const PURCHASE_LINE_STATUSES = ['in_stock', 'sold'] as const
export type PurchaseLineStatus = (typeof PURCHASE_LINE_STATUSES)[number]

export const CASH_TRANSACTION_TYPES = ['capital_injection', 'purchase_payment', 'debt_settlement', 'sale', 'expense'] as const
export type CashTransactionType = (typeof CASH_TRANSACTION_TYPES)[number]

export const CASH_DIRECTIONS = ['credit', 'debit'] as const
export type CashDirection = (typeof CASH_DIRECTIONS)[number]
