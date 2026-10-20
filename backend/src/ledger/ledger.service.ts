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
const REVERSAL_PREFIX = 'Reversal — '

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /** Zero-amount entries are skipped — a fully-unpaid purchase line writes no `purchase_payment` row at all. */
  async writeEntry(tx: Prisma.TransactionClient, entry: LedgerEntryInput) {
    if (entry.amount <= 0) return null
    return tx.cashTransaction.create({ data: { ...entry, amount: round2(entry.amount) } })
  }

  /**
   * Cancels out what's recorded against a reference (a cancelled bill or sale, or an edit about to be
   * re-recorded) with one offsetting entry per transaction type for whatever is still outstanding. The
   * originals are never mutated or deleted, so the ledger stays an append-only audit trail.
   *
   * It offsets the *net* rather than mirroring every row: a record edited more than once already carries
   * earlier reversals, and mirroring would reverse those too — the same cash result, but the journal would
   * double on every edit. A reference that's already balanced writes nothing.
   *
   * `date: 'original'` is for correcting a mistake: each date's net is offset on that same date, so any date
   * range adds up as if the wrong entry had never been made. A cancellation passes the day it happens instead.
   * `types` limits the offset to those transaction types (the rest of the reference is left as it is).
   */
  async reverseEntriesForReference(
    tx: Prisma.TransactionClient,
    referenceId: string,
    opts: { date: Date | 'original'; types?: CashTransactionType[]; createdBy: string; createdByName: string },
  ) {
    const entries = await tx.cashTransaction.findMany({
      where: { referenceId, ...(opts.types ? { type: { in: opts.types } } : {}) },
      orderBy: { createdAt: 'asc' },
    })
    const groups = new Map<string, typeof entries>()
    for (const entry of entries) {
      const key = opts.date === 'original' ? `${entry.type}|${entry.date.getTime()}` : entry.type
      groups.set(key, [...(groups.get(key) ?? []), entry])
    }

    for (const rows of groups.values()) {
      const net = round2(rows.reduce((sum, entry) => sum + (entry.direction === 'credit' ? entry.amount : -entry.amount), 0))
      if (net === 0) continue
      // Describe the offset after the latest original entry, not after an earlier reversal.
      const source = [...rows].reverse().find((entry) => !entry.description.startsWith(REVERSAL_PREFIX)) ?? rows[rows.length - 1]
      await tx.cashTransaction.create({
        data: {
          type: source.type,
          direction: net > 0 ? 'debit' : 'credit',
          amount: Math.abs(net),
          date: opts.date === 'original' ? source.date : opts.date,
          description: `${REVERSAL_PREFIX}${source.description}`,
          itemName: source.itemName,
          counterpartyName: source.counterpartyName,
          referenceType: source.referenceType,
          referenceId,
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
