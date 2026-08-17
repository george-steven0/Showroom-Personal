import { Injectable } from '@nestjs/common'
import dayjs from 'dayjs'
import { PrismaService } from '../prisma/prisma.service'
import { AccountsService } from '../accounts/accounts.service'
import { round2 } from '../common/money'
import { bucketKey, bucketLabel } from '../common/buckets'

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
  ) {}

  async getDashboard() {
    const monthStart = dayjs().startOf('month')
    const monthEnd = dayjs().endOf('month')
    const sixMonthsAgo = dayjs().subtract(5, 'month').startOf('month')

    const [summary, monthSellingBills, monthExpenses, purchaseLines, sellingBills, recentTransactions] = await Promise.all([
      this.accounts.getSummary(),
      this.prisma.sellingBill.findMany({
        where: { status: 'active', sellingDate: { gte: monthStart.toDate(), lte: monthEnd.toDate() } },
        select: { profit: true },
      }),
      this.prisma.expense.aggregate({
        where: { date: { gte: monthStart.toDate(), lte: monthEnd.toDate() } },
        _sum: { amount: true },
      }),
      this.prisma.purchaseBillLine.findMany({
        where: { purchaseBill: { status: 'active', date: { gte: sixMonthsAgo.toDate() } } },
        select: { price: true, purchaseBill: { select: { date: true } } },
      }),
      this.prisma.sellingBill.findMany({
        where: { status: 'active', sellingDate: { gte: sixMonthsAgo.toDate() } },
        select: { sellingPrice: true, profit: true, sellingDate: true },
      }),
      this.prisma.cashTransaction.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
    ])

    const months = Array.from({ length: 6 }, (_, i) => sixMonthsAgo.add(i, 'month').format('YYYY-MM'))

    const profitByMonth = new Map<string, number>()
    const buysByMonth = new Map<string, number>()
    const sellsByMonth = new Map<string, number>()

    for (const line of purchaseLines) {
      const key = bucketKey(line.purchaseBill.date, 'month')
      buysByMonth.set(key, round2((buysByMonth.get(key) ?? 0) + line.price))
    }
    for (const bill of sellingBills) {
      const key = bucketKey(bill.sellingDate, 'month')
      sellsByMonth.set(key, round2((sellsByMonth.get(key) ?? 0) + bill.sellingPrice))
      profitByMonth.set(key, round2((profitByMonth.get(key) ?? 0) + bill.profit))
    }

    const profitTrend = months.map((key) => ({ bucket: bucketLabel(key, 'month'), profit: profitByMonth.get(key) ?? 0 }))
    const buysVsSells = months.map((key) => ({
      bucket: bucketLabel(key, 'month'),
      buys: buysByMonth.get(key) ?? 0,
      sells: sellsByMonth.get(key) ?? 0,
    }))

    return {
      totalCapital: summary.totalCapital,
      totalOwedToSuppliers: summary.totalOwedToSuppliers,
      carsInStock: summary.carsInStock,
      profitThisMonth: round2(monthSellingBills.reduce((sum, bill) => sum + bill.profit, 0)),
      expensesThisMonth: round2(monthExpenses._sum.amount ?? 0),
      profitTrend,
      buysVsSells,
      recentTransactions,
    }
  }
}
