export interface AuditFields {
  createdAt: string
  createdBy: string
  createdByName: string
  updatedAt: string | null
  updatedBy: string | null
  updatedByName: string | null
}

export interface ListQuery {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: string
  sortOrder?: 'ascend' | 'descend' | null
  [key: string]: unknown
}

export interface Paginated<T> {
  rows: T[]
  total: number
  page: number
  pageSize: number
}

export interface AuthUser {
  id: string
  username: string
  fullName: string
}

export interface LoginPayload {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  user: AuthUser
}

export interface Supplier extends AuditFields {
  id: string
  name: string
  phone: string | null
  phone2: string | null
  address: string | null
  notes: string | null
}

export type PurchaseLineStatus = 'in_stock' | 'sold'
export type BillStatus = 'active' | 'cancelled'

export interface PurchaseBillLine {
  id: string
  purchaseBillId: string
  itemName: string
  description: string | null
  supplierId: string
  supplierName: string
  chassisNumber: string
  motorNumber: string
  modelYear: number | null
  price: number
  paidAmount: number
  owed: number
  notes: string | null
  status: PurchaseLineStatus
  purchaseDate: string
  purchaseBillNumber: string
}

export interface PurchaseBill extends AuditFields {
  id: string
  number: string
  date: string
  notes: string | null
  subtotal: number
  total: number
  status: BillStatus
  cancelledAt: string | null
  cancelledByName: string | null
  cancelReason: string | null
  lines: PurchaseBillLine[]
}

export interface SellingBill extends AuditFields {
  id: string
  number: string
  purchaseLineId: string
  itemName: string
  supplierName: string
  buyingPrice: number
  buyingDate: string
  chassisNumber: string
  motorNumber: string
  modelYear: number | null
  sellingPrice: number
  sellingDate: string
  buyerName: string
  buyerAddress: string | null
  buyerPhone: string | null
  notes: string | null
  profit: number
  status: BillStatus
  cancelledAt: string | null
  cancelledByName: string | null
  cancelReason: string | null
}

export interface Expense extends AuditFields {
  id: string
  name: string
  amount: number
  date: string
  note: string | null
}

export type CashTransactionType =
  | 'capital_injection'
  | 'purchase_payment'
  | 'debt_settlement'
  | 'sale'
  | 'expense'

export type CashDirection = 'credit' | 'debit'

export interface CashTransaction {
  id: string
  type: CashTransactionType
  direction: CashDirection
  amount: number
  date: string
  description: string
  itemName: string | null
  counterpartyName: string | null
  referenceType: string | null
  referenceId: string | null
  createdAt: string
  createdByName: string
}

export interface OwedSupplierRow {
  purchaseLineId: string
  itemName: string
  chassisNumber: string
  supplierId: string
  supplierName: string
  price: number
  paidAmount: number
  owed: number
  purchaseDate: string
  purchaseBillNumber: string
}

export interface AccountsSummary {
  totalCapital: number
  totalOwedToSuppliers: number
  carsInStock: number
  carsSoldCount: number
}

export interface ProfitSummary {
  totalProfit: number
  totalRevenue: number
  totalCost: number
  carsSold: number
  series: { bucket: string; profit: number }[]
}

export interface DashboardData {
  totalCapital: number
  totalOwedToSuppliers: number
  carsInStock: number
  profitThisMonth: number
  expensesThisMonth: number
  profitTrend: { bucket: string; profit: number }[]
  buysVsSells: { bucket: string; buys: number; sells: number }[]
  recentTransactions: CashTransaction[]
}

export type DateRangePreset = 'week' | 'month' | 'year' | 'custom'

export interface DateRangeValue {
  preset: DateRangePreset
  from: string
  to: string
}

export interface MovementsSummary {
  totalDebit: number
  totalCredit: number
  net: number
}

export interface SystemSettings {
  id: string
  systemName: string
  systemNameAr: string
  logo: string | null
  updatedAt: string | null
  updatedBy: string | null
  updatedByName: string | null
}

export type BackupKind = 'backup' | 'pre-reset' | 'pre-restore'

export interface BackupFileInfo {
  filename: string
  kind: BackupKind
  createdAt: string
  size: number
}

export interface BackupResult {
  success: boolean
  filename: string
  createdAt: string
}

export interface RestoreResult {
  success: boolean
  backupFilename: string
}
