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
    const [totalCapital, activeLines, carsSoldCount] = await Promise.all([
      this.ledger.getCapitalBalance(),
      this.prisma.purchaseBillLine.findMany({
        where: { purchaseBill: { status: 'active' } },
        select: { status: true, price: true, paidAmount: true },
      }),
      this.prisma.sellingBill.count({ where: { status: 'active' } }),
    ])

    const totalOwedToSuppliers = round2(activeLines.reduce((sum, line) => sum + Math.max(0, line.price - line.paidAmount), 0))
    const carsInStock = activeLines.filter((line) => line.status === 'in_stock').length

    return { totalCapital, totalOwedToSuppliers, carsInStock, carsSoldCount }
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
