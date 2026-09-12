import { Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { LedgerService } from '../ledger/ledger.service'
import { paginate, resolveOrderBy, toSkipTake } from '../common/pagination'
import { round2 } from '../common/money'
import type { CreateExpenseDto } from './dto/create-expense.dto'
import type { UpdateExpenseDto } from './dto/update-expense.dto'
import type { ListExpensesQueryDto } from './dto/list-expenses-query.dto'
import type { ExpenseSummaryQueryDto } from './dto/expense-summary-query.dto'
import type { RequestUser } from '../common/decorators/current-user.decorator'

const SORTABLE_FIELDS: Record<string, string> = { name: 'name', amount: 'amount', date: 'date' }

function buildWhere(query: { search?: string; from?: string; to?: string }): Prisma.ExpenseWhereInput {
  return {
    ...(query.search ? { name: { contains: query.search } } : {}),
    ...(query.from && query.to ? { date: { gte: new Date(query.from), lte: new Date(query.to) } } : {}),
  }
}

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  async list(query: ListExpensesQueryDto) {
    const where = buildWhere(query)

    const [rows, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        orderBy: resolveOrderBy(query, SORTABLE_FIELDS, { date: 'desc' }),
        ...toSkipTake(query),
      }),
      this.prisma.expense.count({ where }),
    ])

    return paginate(rows, total, query)
  }

  async summary(query: ExpenseSummaryQueryDto) {
    const where = buildWhere(query)
    const { _sum, _count } = await this.prisma.expense.aggregate({ where, _sum: { amount: true }, _count: true })
    return { totalAmount: round2(_sum.amount ?? 0), count: _count }
  }

  async create(dto: CreateExpenseDto, user: RequestUser) {
    return this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: { name: dto.name, amount: dto.amount, date: new Date(dto.date), note: dto.note, createdBy: user.id, createdByName: user.fullName },
      })

      await this.ledger.writeEntry(tx, {
        type: 'expense',
        direction: 'debit',
        amount: dto.amount,
        date: expense.date,
        description: `Expense — ${dto.name}`,
        itemName: dto.name,
        referenceType: 'expense',
        referenceId: expense.id,
        createdBy: user.id,
        createdByName: user.fullName,
      })

      return expense
    })
  }

  async update(id: string, dto: UpdateExpenseDto, user: RequestUser) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.expense.findUnique({ where: { id } })
      if (!existing) throw new NotFoundException('Expense not found')

      const now = new Date()
      await this.ledger.reverseEntriesForReference(tx, id, { date: now, createdBy: user.id, createdByName: user.fullName })

      const expense = await tx.expense.update({
        where: { id },
        data: {
          name: dto.name ?? existing.name,
          amount: dto.amount ?? existing.amount,
          date: dto.date ? new Date(dto.date) : existing.date,
          note: dto.note ?? existing.note,
          updatedAt: now,
          updatedBy: user.id,
          updatedByName: user.fullName,
        },
      })

      await this.ledger.writeEntry(tx, {
        type: 'expense',
        direction: 'debit',
        amount: expense.amount,
        date: expense.date,
        description: `Expense — ${expense.name}`,
        itemName: expense.name,
        referenceType: 'expense',
        referenceId: expense.id,
        createdBy: user.id,
        createdByName: user.fullName,
      })

      return expense
    })
  }

  async remove(id: string, user: RequestUser) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.expense.findUnique({ where: { id } })
      if (!existing) throw new NotFoundException('Expense not found')

      await this.ledger.reverseEntriesForReference(tx, id, { date: new Date(), createdBy: user.id, createdByName: user.fullName })
      await tx.expense.delete({ where: { id } })

      return { success: true }
    })
  }
}
