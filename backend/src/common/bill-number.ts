import type { PrismaService } from '../prisma/prisma.service'

/**
 * Sequential, zero-padded bill numbers (e.g. `PB-000042`): the highest existing number + 1. Not "count + 1" —
 * if a bill is ever removed from the middle, a count would hand out a number that's still taken. Numbers are
 * fixed-width, so the highest one is simply the last in text order. Single-owner, single-process app, so no
 * multi-writer coordination is needed.
 */
export async function nextBillNumber(
  prisma: PrismaService,
  model: 'purchaseBill' | 'sellingBill',
  prefix: string,
): Promise<string> {
  const delegate = prisma[model] as unknown as {
    findFirst: (args: { where: { number: { startsWith: string } }; orderBy: { number: 'desc' }; select: { number: true } }) => Promise<{ number: string } | null>
  }
  const last = await delegate.findFirst({ where: { number: { startsWith: `${prefix}-` } }, orderBy: { number: 'desc' }, select: { number: true } })
  const lastSeq = last ? Number.parseInt(last.number.slice(prefix.length + 1), 10) : 0
  return `${prefix}-${String((Number.isFinite(lastSeq) ? lastSeq : 0) + 1).padStart(6, '0')}`
}
