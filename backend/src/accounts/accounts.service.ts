import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { LedgerService } from '../ledger/ledger.service'
import { round2 } from '../common/money'
import { bucketKey, bucketLabel, enumerateBuckets, inferGranularity } from '../common/buckets'
import type { ProfitQueryDto } from './dto/profit-query.dto'

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  async getSummary() {
    const [totalCapital, activeLines, carsSoldCount, capitalInjected, allTimeProfit, allTimeExpenses] = await Promise.all([
      this.ledger.getCapitalBalance(),
      this.prisma.purchaseBillLine.findMany({
        where: { purchaseBill: { status: 'active' } },
        select: { status: true, price: true, paidAmount: true },
      }),
      this.prisma.sellingBill.count({ where: { status: 'active' } }),
      this.prisma.cashTransaction.aggregate({ where: { type: 'capital_injection' }, _sum: { amount: true } }),
      this.prisma.sellingBill.aggregate({ where: { status: 'active' }, _sum: { profit: true } }),
      this.prisma.expense.aggregate({ _sum: { amount: true } }),
    ])

    const totalOwedToSuppliers = round2(activeLines.reduce((sum, line) => sum + Math.max(0, line.price - line.paidAmount), 0))
    // Paying a supplier more than a car's price leaves the extra with them as an advance — still the owner's money,
    // not a cost and not stock. Counted across sold cars too: selling the car doesn't hand the advance back.
    const totalAdvanceToSuppliers = round2(activeLines.reduce((sum, line) => sum + Math.max(0, line.paidAmount - line.price), 0))
    const inStockLines = activeLines.filter((line) => line.status === 'in_stock')
    const carsInStock = inStockLines.length

    // What the owner has ever put in, plus every dollar of profit or loss
    // actually realized by selling a car, minus every expense — never
    // touched by an unsold purchase, since that's just cash turned into a
    // car of equal value, not money spent or lost. See moneyTiedUpInStock
    // for how much of this total isn't liquid cash right now.
    const totalMoneyAllTime = round2((capitalInjected._sum.amount ?? 0) + (allTimeProfit._sum.profit ?? 0) - (allTimeExpenses._sum.amount ?? 0))
    // A car is worth at most its price; anything paid above that is the supplier advance, reported separately.
    const moneyTiedUpInStock = round2(inStockLines.reduce((sum, line) => sum + Math.min(line.paidAmount, line.price), 0))

    return { totalCapital, totalOwedToSuppliers, totalAdvanceToSuppliers, carsInStock, carsSoldCount, totalMoneyAllTime, moneyTiedUpInStock }
  }

  async getOwed() {
    const lines = await this.prisma.purchaseBillLine.findMany({
      where: { purchaseBill: { status: 'active' } },
      include: { supplier: true, purchaseBill: true },
      orderBy: { createdAt: 'desc' },
    })

    return lines
      .filter((line) => line.price - line.paidAmount > 0.001)
      .map((line) => ({
        purchaseLineId: line.id,
        itemName: line.itemName,
        chassisNumber: line.chassisNumber,
        supplierId: line.supplierId,
        supplierName: line.supplier.name,
        price: line.price,
        paidAmount: line.paidAmount,
        owed: round2(line.price - line.paidAmount),
        purchaseDate: line.purchaseBill.date,
        purchaseBillNumber: line.purchaseBill.number,
      }))
  }

  /** Cars paid for above their price — the extra is an advance the supplier is holding (e.g. toward a future car). */
  async getSupplierAdvances() {
    const lines = await this.prisma.purchaseBillLine.findMany({
      where: { purchaseBill: { status: 'active' } },
      include: { supplier: true, purchaseBill: true },
      orderBy: { createdAt: 'desc' },
    })

    return lines
      .filter((line) => line.paidAmount - line.price > 0.001)
      .map((line) => ({
        purchaseLineId: line.id,
        itemName: line.itemName,
        chassisNumber: line.chassisNumber,
        supplierId: line.supplierId,
        supplierName: line.supplier.name,
        price: line.price,
        paidAmount: line.paidAmount,
        advance: round2(line.paidAmount - line.price),
        status: line.status,
        purchaseDate: line.purchaseBill.date,
        purchaseBillNumber: line.purchaseBill.number,
      }))
  }

  /**
   * Net profit for a period: what the cars sold in it earned (selling minus buying price), minus every expense
   * dated in it. Each expense lands in the period — and the chart bucket — of its own date, not the date it
   * was entered. `grossProfit` and `totalExpenses` are the two halves, so the page can show the breakdown.
   */
  async getProfitSummary(query: ProfitQueryDto) {
    const from = new Date(query.from)
    const to = new Date(query.to)

    const [bills, expenses] = await Promise.all([
      this.prisma.sellingBill.findMany({
        where: { status: 'active', sellingDate: { gte: from, lte: to } },
        select: { sellingDate: true, sellingPrice: true, buyingPrice: true, profit: true },
      }),
      this.prisma.expense.findMany({
        where: { date: { gte: from, lte: to } },
        select: { date: true, amount: true },
      }),
    ])

    const grossProfit = round2(bills.reduce((sum, bill) => sum + bill.profit, 0))
    const totalExpenses = round2(expenses.reduce((sum, expense) => sum + expense.amount, 0))
    const totalProfit = round2(grossProfit - totalExpenses)
    const totalRevenue = round2(bills.reduce((sum, bill) => sum + bill.sellingPrice, 0))
    const totalCost = round2(bills.reduce((sum, bill) => sum + bill.buyingPrice, 0))

    const granularity = inferGranularity(query.from, query.to)
    const totals = new Map<string, number>()
    for (const bill of bills) {
      const key = bucketKey(bill.sellingDate, granularity)
      totals.set(key, round2((totals.get(key) ?? 0) + bill.profit))
    }
    for (const expense of expenses) {
      const key = bucketKey(expense.date, granularity)
      totals.set(key, round2((totals.get(key) ?? 0) - expense.amount))
    }

    const series = enumerateBuckets(query.from, query.to, granularity).map((key) => ({
      bucket: bucketLabel(key, granularity),
      profit: totals.get(key) ?? 0,
    }))

    return { totalProfit, grossProfit, totalExpenses, expensesCount: expenses.length, totalRevenue, totalCost, carsSold: bills.length, series }
  }
}
