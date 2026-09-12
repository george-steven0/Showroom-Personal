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
    const inStockLines = activeLines.filter((line) => line.status === 'in_stock')
    const carsInStock = inStockLines.length

    // What the owner has ever put in, plus every dollar of profit or loss
    // actually realized by selling a car, minus every expense — never
    // touched by an unsold purchase, since that's just cash turned into a
    // car of equal value, not money spent or lost. See moneyTiedUpInStock
    // for how much of this total isn't liquid cash right now.
    const totalMoneyAllTime = round2((capitalInjected._sum.amount ?? 0) + (allTimeProfit._sum.profit ?? 0) - (allTimeExpenses._sum.amount ?? 0))
    const moneyTiedUpInStock = round2(inStockLines.reduce((sum, line) => sum + line.paidAmount, 0))

    return { totalCapital, totalOwedToSuppliers, carsInStock, carsSoldCount, totalMoneyAllTime, moneyTiedUpInStock }
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

  async getProfitSummary(query: ProfitQueryDto) {
    const from = new Date(query.from)
    const to = new Date(query.to)

    const bills = await this.prisma.sellingBill.findMany({
      where: { status: 'active', sellingDate: { gte: from, lte: to } },
      select: { sellingDate: true, sellingPrice: true, buyingPrice: true, profit: true },
    })

    const totalProfit = round2(bills.reduce((sum, bill) => sum + bill.profit, 0))
    const totalRevenue = round2(bills.reduce((sum, bill) => sum + bill.sellingPrice, 0))
    const totalCost = round2(bills.reduce((sum, bill) => sum + bill.buyingPrice, 0))

    const granularity = inferGranularity(query.from, query.to)
    const totals = new Map<string, number>()
    for (const bill of bills) {
      const key = bucketKey(bill.sellingDate, granularity)
      totals.set(key, round2((totals.get(key) ?? 0) + bill.profit))
    }

    const series = enumerateBuckets(query.from, query.to, granularity).map((key) => ({
      bucket: bucketLabel(key, granularity),
      profit: totals.get(key) ?? 0,
    }))

    return { totalProfit, totalRevenue, totalCost, carsSold: bills.length, series }
  }
}
