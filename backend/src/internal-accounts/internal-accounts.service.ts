import { Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { paginate, resolveOrderBy, toSkipTake } from '../common/pagination'
import { round2 } from '../common/money'
import type { CreateInternalEntryDto } from './dto/create-internal-entry.dto'
import type { UpdateInternalEntryDto } from './dto/update-internal-entry.dto'
import type { InternalEntriesSummaryQueryDto, ListInternalEntriesQueryDto } from './dto/list-internal-entries-query.dto'
import type { RequestUser } from '../common/decorators/current-user.decorator'

const SORTABLE_FIELDS: Record<string, string> = { itemName: 'itemName', amount: 'amount', type: 'type', date: 'date' }

function buildWhere(query: { search?: string; from?: string; to?: string }): Prisma.InternalAccountEntryWhereInput {
  return {
    ...(query.search ? { OR: [{ itemName: { contains: query.search } }, { notes: { contains: query.search } }] } : {}),
    ...(query.from && query.to ? { date: { gte: new Date(query.from), lte: new Date(query.to) } } : {}),
  }
}

/** Blank notes are stored as null, so clearing the field on an edit really clears it. */
function cleanNotes(notes: string | undefined): string | null {
  return notes?.trim() || null
}

/**
 * The owner's side calculations. Plain records only: unlike expenses, nothing here goes through the
 * ledger, so capital, profit, the Summary and the Dashboard never see these entries.
 */
@Injectable()
export class InternalAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListInternalEntriesQueryDto) {
    const where = buildWhere(query)

    const [rows, total] = await Promise.all([
      this.prisma.internalAccountEntry.findMany({
        where,
        orderBy: resolveOrderBy(query, SORTABLE_FIELDS, { date: 'desc' }),
        ...toSkipTake(query),
      }),
      this.prisma.internalAccountEntry.count({ where }),
    ])

    return paginate(rows, total, query)
  }

  /** Totals for the same search and date range as the table: net = owed − paid. */
  async summary(query: InternalEntriesSummaryQueryDto) {
    const groups = await this.prisma.internalAccountEntry.groupBy({
      by: ['type'],
      where: buildWhere(query),
      _sum: { amount: true },
      _count: true,
    })
    const of = (type: string) => groups.find((group) => group.type === type)
    const paid = round2(of('paid')?._sum.amount ?? 0)
    const owed = round2(of('owed')?._sum.amount ?? 0)

    return { paid, owed, net: round2(owed - paid), paidCount: of('paid')?._count ?? 0, owedCount: of('owed')?._count ?? 0 }
  }

  async create(dto: CreateInternalEntryDto, user: RequestUser) {
    return this.prisma.internalAccountEntry.create({
      data: {
        itemName: dto.itemName.trim(),
        amount: round2(dto.amount),
        type: dto.type,
        date: new Date(dto.date),
        notes: cleanNotes(dto.notes),
        createdBy: user.id,
        createdByName: user.fullName,
      },
    })
  }

  async update(id: string, dto: UpdateInternalEntryDto, user: RequestUser) {
    const existing = await this.prisma.internalAccountEntry.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Entry not found')

    return this.prisma.internalAccountEntry.update({
      where: { id },
      data: {
        itemName: dto.itemName?.trim() ?? existing.itemName,
        amount: dto.amount === undefined ? existing.amount : round2(dto.amount),
        type: dto.type ?? existing.type,
        date: dto.date ? new Date(dto.date) : existing.date,
        notes: dto.notes === undefined ? existing.notes : cleanNotes(dto.notes),
        updatedAt: new Date(),
        updatedBy: user.id,
        updatedByName: user.fullName,
      },
    })
  }

  async remove(id: string) {
    const existing = await this.prisma.internalAccountEntry.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Entry not found')
    await this.prisma.internalAccountEntry.delete({ where: { id } })
    return { success: true }
  }
}
