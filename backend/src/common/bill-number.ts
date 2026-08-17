import type { PrismaService } from '../prisma/prisma.service'

/**
 * Sequential, zero-padded bill numbers (e.g. `PB-000042`). Single-owner,
 * single-process app — a plain "count existing rows + 1" is enough,
 * without the coordination a multi-writer system would need.
 */
export async function nextBillNumber(
  prisma: PrismaService,
  model: 'purchaseBill' | 'sellingBill',
  prefix: string,
): Promise<string> {
  const count = await (prisma[model] as { count: () => Promise<number> }).count()
  return `${prefix}-${String(count + 1).padStart(6, '0')}`
}
