import { z } from 'zod'
import type { TFunction } from 'i18next'

const CURRENT_YEAR = new Date().getFullYear() + 1
const PHONE_RE = /^[+\d][\d\s\-()]{6,19}$/

export function loginSchema(t: TFunction) {
  return z.object({
    username: z.string().trim().min(1, t('validation.usernameRequired')),
    password: z.string().min(1, t('validation.passwordRequired')),
  })
}

export function supplierSchema(t: TFunction) {
  return z.object({
    name: z.string().trim().min(1, t('validation.nameRequired')),
    phone: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || PHONE_RE.test(value), t('validation.phoneInvalid')),
    address: z.string().trim().optional(),
    notes: z.string().trim().optional(),
  })
}

export function purchaseLineSchema(t: TFunction) {
  return z
    .object({
      key: z.string(),
      itemName: z.string().trim().min(2, t('validation.itemRequired')),
      quantity: z.number({ message: t('validation.quantityPositive') }).positive(t('validation.quantityPositive')),
      description: z.string().trim().optional(),
      supplierId: z.string().min(1, t('validation.supplierRequired')),
      chassisNumber: z.string().trim().min(1, t('validation.chassisRequired')),
      motorNumber: z.string().trim().min(1, t('validation.motorRequired')),
      modelYear: z
        .number()
        .int()
        .min(1950, t('validation.yearInvalid', { max: CURRENT_YEAR }))
        .max(CURRENT_YEAR, t('validation.yearInvalid', { max: CURRENT_YEAR }))
        .nullable()
        .optional(),
      price: z.number({ message: t('validation.pricePositive') }).positive(t('validation.pricePositive')),
      paidAmount: z.number({ message: t('validation.amountNonNegative') }).min(0, t('validation.amountNonNegative')),
      notes: z.string().trim().optional(),
    })
    .refine((line) => line.paidAmount <= line.price, {
      message: t('validation.paidExceedsPrice'),
      path: ['paidAmount'],
    })
}

export function purchaseBillSchema(t: TFunction) {
  return z.object({
    date: z.string().min(1, t('validation.required')),
    lines: z.array(purchaseLineSchema(t)).min(1, t('validation.atLeastOneLine')),
    notes: z.string().trim().optional(),
  })
}

export function sellingBillSchema(t: TFunction) {
  return z.object({
    purchaseLineId: z.string().min(1, t('validation.itemRequired')),
    sellingPrice: z.number({ message: t('validation.pricePositive') }).positive(t('validation.pricePositive')),
    sellingDate: z.string().min(1, t('validation.required')),
    buyerName: z.string().trim().min(1, t('validation.nameRequired')),
    buyerAddress: z.string().trim().optional(),
    buyerPhone: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || PHONE_RE.test(value), t('validation.phoneInvalid')),
    notes: z.string().trim().optional(),
  })
}

export function expenseSchema(t: TFunction) {
  return z.object({
    name: z.string().trim().min(2, t('validation.nameRequired')),
    amount: z.number({ message: t('validation.amountPositive') }).positive(t('validation.amountPositive')),
    date: z.string().min(1, t('validation.required')),
    note: z.string().trim().optional(),
  })
}

export function capitalInjectionSchema(t: TFunction) {
  return z.object({
    amount: z.number({ message: t('validation.amountPositive') }).positive(t('validation.amountPositive')),
    date: z.string().min(1, t('validation.required')),
    note: z.string().trim().optional(),
  })
}

export function recordPaymentSchema(t: TFunction, maxAmount: number, formattedMax: string) {
  return z.object({
    amount: z
      .number({ message: t('validation.amountPositive') })
      .positive(t('validation.amountPositive'))
      .max(maxAmount, t('validation.exceedsOwed', { amount: formattedMax })),
    date: z.string().min(1, t('validation.required')),
    note: z.string().trim().optional(),
  })
}

export type LoginFormValues = z.infer<ReturnType<typeof loginSchema>>
export type SupplierFormValues = z.infer<ReturnType<typeof supplierSchema>>
export type PurchaseLineFormValues = z.infer<ReturnType<typeof purchaseLineSchema>>
export type PurchaseBillFormValues = z.infer<ReturnType<typeof purchaseBillSchema>>
export type SellingBillFormValues = z.infer<ReturnType<typeof sellingBillSchema>>
export type ExpenseFormValues = z.infer<ReturnType<typeof expenseSchema>>
export type CapitalInjectionFormValues = z.infer<ReturnType<typeof capitalInjectionSchema>>
export type RecordPaymentFormValues = z.infer<ReturnType<typeof recordPaymentSchema>>
