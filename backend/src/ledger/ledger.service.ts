import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { round2 } from '../common/money'
import type { CashDirection, CashTransactionType } from '../common/enums'

export interface LedgerEntryInput {
  type: CashTransactionType
  direction: CashDirection
  amount: number
  date: Date
  description: string
  itemName?: string | null
  counterpartyName?: string | null
  referenceType?: string | null
  referenceId?: string | null
  createdBy: string
  createdByName: string
}

/**
 * The one place every cash-affecting write goes through. Every entry here
 * powers both the running capital balance (`getCapitalBalance`) and the
 * Summary page's movement journal — nothing else computes either
 * independently, so the two views of "money in this business" can never
 * drift apart.
 */
@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /** Zero-amount entries are skipped — a fully-unpaid purchase line writes no `purchase_payment` row at all. */
  async writeEntry(tx: Prisma.TransactionClient, entry: LedgerEntryInput) {
    if (entry.amount <= 0) return null
    return tx.cashTransaction.create({ data: { ...entry, amount: round2(entry.amount) } })
  }

  /**
   * Reverses every ledger entry tied to a reference (a cancelled bill, a
   * cancelled sale) by writing offsetting entries with the opposite
   * direction — never mutates or deletes the originals, so the ledger
   * stays an append-only audit trail.
   */
  async reverseEntriesForReference(
    tx: Prisma.TransactionClient,
    referenceId: string,
    opts: { date: Date; createdBy: string; createdByName: string },
  ) {
    const entries = await tx.cashTransaction.findMany({ where: { referenceId } })
    for (const entry of entries) {
      await tx.cashTransaction.create({
        data: {
          type: entry.type,
          direction: entry.direction === 'credit' ? 'debit' : 'credit',
          amount: entry.amount,
          date: opts.date,
          description: `Reversal — ${entry.description}`,
          itemName: entry.itemName,
          counterpartyName: entry.counterpartyName,
          referenceType: entry.referenceType,
          referenceId: entry.referenceId,
          createdBy: opts.createdBy,
          createdByName: opts.createdByName,
        },
      })
    }
  }

  async getCapitalBalance(): Promise<number> {
    const [credits, debits] = await Promise.all([
      this.prisma.cashTransaction.aggregate({ where: { direction: 'credit' }, _sum: { amount: true } }),
      this.prisma.cashTransaction.aggregate({ where: { direction: 'debit' }, _sum: { amount: true } }),
    ])
    return round2((credits._sum.amount ?? 0) - (debits._sum.amount ?? 0))
  }
}
