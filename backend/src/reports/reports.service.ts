import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { paginate, resolveOrderBy, toSkipTake } from '../common/pagination'
import { round2 } from '../common/money'
import type { ListCashTransactionsQueryDto } from './dto/list-cash-transactions-query.dto'
import type { MovementsSummaryQueryDto } from './dto/movements-summary-query.dto'

const SORTABLE_FIELDS: Record<string, string> = { date: 'date', amount: 'amount' }

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async listCashTransactions(query: ListCashTransactionsQueryDto) {
    const where: Prisma.CashTransactionWhereInput = {
      ...(query.search
        ? { OR: [{ itemName: { contains: query.search } }, { counterpartyName: { contains: query.search } }, { description: { contains: query.search } }] }
        : {}),
      ...(query.from && query.to ? { date: { gte: new Date(query.from), lte: new Date(query.to) } } : {}),
    }

    const [rows, total] = await Promise.all([
      this.prisma.cashTransaction.findMany({
        where,
        orderBy: resolveOrderBy(query, SORTABLE_FIELDS, { date: 'desc' }),
        ...toSkipTake(query),
      }),
      this.prisma.cashTransaction.count({ where }),
    ])

    return paginate(rows, total, query)
  }

  async getMovementsSummary(query: MovementsSummaryQueryDto) {
    const where: Prisma.CashTransactionWhereInput = { date: { gte: new Date(query.from), lte: new Date(query.to) } }

    const [credits, debits] = await Promise.all([
      this.prisma.cashTransaction.aggregate({ where: { ...where, direction: 'credit' }, _sum: { amount: true } }),
      this.prisma.cashTransaction.aggregate({ where: { ...where, direction: 'debit' }, _sum: { amount: true } }),
    ])

    const totalCredit = round2(credits._sum.amount ?? 0)
    const totalDebit = round2(debits._sum.amount ?? 0)

    return { totalCredit, totalDebit, net: round2(totalCredit - totalDebit) }
  }
}
