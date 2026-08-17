import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma, PurchaseBill, PurchaseBillLine, Supplier } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { LedgerService } from '../ledger/ledger.service'
import { paginate, resolveOrderBy, toSkipTake } from '../common/pagination'
import { round2 } from '../common/money'
import { nextBillNumber } from '../common/bill-number'
import type { CreatePurchaseBillDto } from './dto/create-purchase-bill.dto'
import type { UpdatePurchaseBillDto } from './dto/update-purchase-bill.dto'
import type { ListPurchaseBillsQueryDto } from './dto/list-purchase-bills-query.dto'
import type { SettlePaymentDto } from './dto/settle-payment.dto'
import type { RequestUser } from '../common/decorators/current-user.decorator'

const SORTABLE_FIELDS: Record<string, string> = { number: 'number', date: 'date', total: 'total' }

type LineWithSupplier = PurchaseBillLine & { supplier: Supplier }
type BillWithLines = PurchaseBill & { lines: LineWithSupplier[] }

@Injectable()
export class PurchaseBillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  async list(query: ListPurchaseBillsQueryDto) {
    const where: Prisma.PurchaseBillWhereInput = query.search
      ? {
          OR: [
            { number: { contains: query.search } },
            { lines: { some: { itemName: { contains: query.search } } } },
            { lines: { some: { chassisNumber: { contains: query.search } } } },
          ],
        }
      : {}

    const [rows, total] = await Promise.all([
      this.prisma.purchaseBill.findMany({
        where,
        include: { lines: { include: { supplier: true } } },
        orderBy: resolveOrderBy(query, SORTABLE_FIELDS, { date: 'desc' }),
        ...toSkipTake(query),
      }),
      this.prisma.purchaseBill.count({ where }),
    ])

    return paginate(rows.map((row) => this.mapBill(row)), total, query)
  }

  async findOne(id: string) {
    const bill = await this.prisma.purchaseBill.findUnique({
      where: { id },
      include: { lines: { include: { supplier: true } } },
    })
    if (!bill) throw new NotFoundException('Buying bill not found')
    return this.mapBill(bill)
  }

  async create(dto: CreatePurchaseBillDto, user: RequestUser) {
    return this.prisma.$transaction(async (tx) => {
      const supplierIds = [...new Set(dto.lines.map((line) => line.supplierId))]
      const suppliers = await tx.supplier.findMany({ where: { id: { in: supplierIds } } })
      if (suppliers.length !== supplierIds.length) throw new BadRequestException('One or more suppliers were not found')
      const supplierById = new Map(suppliers.map((s) => [s.id, s]))

      const subtotal = round2(dto.lines.reduce((sum, line) => sum + line.price, 0))
      const number = await nextBillNumber(this.prisma, 'purchaseBill', 'PB')
      const date = new Date(dto.date)

      const bill = await tx.purchaseBill.create({
        data: {
          number,
          date,
          notes: dto.notes,
          subtotal,
          total: subtotal,
          createdBy: user.id,
          createdByName: user.fullName,
          lines: {
            create: dto.lines.map((line) => ({
              itemName: line.itemName,
              description: line.description,
              supplierId: line.supplierId,
              chassisNumber: line.chassisNumber,
              motorNumber: line.motorNumber,
              modelYear: line.modelYear,
              price: line.price,
              paidAmount: Math.min(line.paidAmount, line.price),
              notes: line.notes,
            })),
          },
        },
        include: { lines: { include: { supplier: true } } },
      })

      for (const line of bill.lines) {
        await this.ledger.writeEntry(tx, {
          type: 'purchase_payment',
          direction: 'debit',
          amount: line.paidAmount,
          date,
          description: `Bought ${line.itemName} from ${supplierById.get(line.supplierId)?.name ?? ''}`,
          itemName: line.itemName,
          counterpartyName: supplierById.get(line.supplierId)?.name,
          referenceType: 'purchase_bill_line',
          referenceId: line.id,
          createdBy: user.id,
          createdByName: user.fullName,
        })
      }

      return this.mapBill(bill)
    })
  }

  /** Full replace of a bill's lines — only while every line is still unsold, see the guard below. */
  async update(id: string, dto: UpdatePurchaseBillDto, user: RequestUser) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.purchaseBill.findUnique({ where: { id }, include: { lines: true } })
      if (!existing) throw new NotFoundException('Buying bill not found')
      this.assertEditable(existing)

      const supplierIds = [...new Set(dto.lines.map((line) => line.supplierId))]
      const suppliers = await tx.supplier.findMany({ where: { id: { in: supplierIds } } })
      if (suppliers.length !== supplierIds.length) throw new BadRequestException('One or more suppliers were not found')
      const supplierById = new Map(suppliers.map((s) => [s.id, s]))

      const date = new Date(dto.date)
      for (const line of existing.lines) {
        await this.ledger.reverseEntriesForReference(tx, line.id, { date, createdBy: user.id, createdByName: user.fullName })
      }
      await tx.purchaseBillLine.deleteMany({ where: { purchaseBillId: id } })

      const subtotal = round2(dto.lines.reduce((sum, line) => sum + line.price, 0))

      const bill = await tx.purchaseBill.update({
        where: { id },
        data: {
          date,
          notes: dto.notes,
          subtotal,
          total: subtotal,
          updatedAt: new Date(),
          updatedBy: user.id,
          updatedByName: user.fullName,
          lines: {
            create: dto.lines.map((line) => ({
              itemName: line.itemName,
              description: line.description,
              supplierId: line.supplierId,
              chassisNumber: line.chassisNumber,
              motorNumber: line.motorNumber,
              modelYear: line.modelYear,
              price: line.price,
              paidAmount: Math.min(line.paidAmount, line.price),
              notes: line.notes,
            })),
          },
        },
        include: { lines: { include: { supplier: true } } },
      })

      for (const line of bill.lines) {
        await this.ledger.writeEntry(tx, {
          type: 'purchase_payment',
          direction: 'debit',
          amount: line.paidAmount,
          date,
          description: `Bought ${line.itemName} from ${supplierById.get(line.supplierId)?.name ?? ''}`,
          itemName: line.itemName,
          counterpartyName: supplierById.get(line.supplierId)?.name,
          referenceType: 'purchase_bill_line',
          referenceId: line.id,
          createdBy: user.id,
          createdByName: user.fullName,
        })
      }

      return this.mapBill(bill)
    })
  }

  async cancel(id: string, reason: string | undefined, user: RequestUser) {
    return this.prisma.$transaction(async (tx) => {
      const bill = await tx.purchaseBill.findUnique({ where: { id }, include: { lines: true } })
      if (!bill) throw new NotFoundException('Buying bill not found')
      this.assertEditable(bill)

      const now = new Date()
      for (const line of bill.lines) {
        await this.ledger.reverseEntriesForReference(tx, line.id, { date: now, createdBy: user.id, createdByName: user.fullName })
      }

      const updated = await tx.purchaseBill.update({
        where: { id },
        data: { status: 'cancelled', cancelledAt: now, cancelledBy: user.id, cancelledByName: user.fullName, cancelReason: reason },
        include: { lines: { include: { supplier: true } } },
      })

      return this.mapBill(updated)
    })
  }

  async listAvailableLines() {
    const lines = await this.prisma.purchaseBillLine.findMany({
      where: { status: 'in_stock', purchaseBill: { status: 'active' } },
      include: { supplier: true, purchaseBill: true },
      orderBy: { createdAt: 'desc' },
    })
    return lines.map((line) => this.mapLine(line, line.purchaseBill, line.supplier))
  }

  async settlePayment(lineId: string, dto: SettlePaymentDto, user: RequestUser) {
    return this.prisma.$transaction(async (tx) => {
      const line = await tx.purchaseBillLine.findUnique({
        where: { id: lineId },
        include: { supplier: true, purchaseBill: true },
      })
      if (!line) throw new NotFoundException('Car not found')
      if (line.purchaseBill.status !== 'active') throw new BadRequestException('This buying bill has been cancelled')

      const remaining = round2(line.price - line.paidAmount)
      if (dto.amount > remaining) {
        throw new BadRequestException(`Payment cannot exceed the remaining owed amount (${remaining})`)
      }

      const updated = await tx.purchaseBillLine.update({
        where: { id: lineId },
        data: { paidAmount: round2(line.paidAmount + dto.amount) },
        include: { supplier: true, purchaseBill: true },
      })

      await this.ledger.writeEntry(tx, {
        type: 'debt_settlement',
        direction: 'debit',
        amount: dto.amount,
        date: new Date(dto.date),
        description: `Payment to ${line.supplier.name} for ${line.itemName}`,
        itemName: line.itemName,
        counterpartyName: line.supplier.name,
        referenceType: 'purchase_bill_line',
        referenceId: line.id,
        createdBy: user.id,
        createdByName: user.fullName,
      })

      return this.mapLine(updated, updated.purchaseBill, updated.supplier)
    })
  }

  private assertEditable(bill: PurchaseBill & { lines: PurchaseBillLine[] }) {
    if (bill.status !== 'active') throw new BadRequestException('This buying bill has already been cancelled')
    if (bill.lines.some((line) => line.status !== 'in_stock')) {
      throw new BadRequestException('This bill cannot be changed because at least one of its cars has already been sold')
    }
  }

  private mapBill(bill: BillWithLines) {
    return {
      ...bill,
      lines: bill.lines.map((line) => this.mapLine(line, bill, line.supplier)),
    }
  }

  private mapLine(line: PurchaseBillLine, bill: Pick<PurchaseBill, 'date' | 'number'>, supplier: Supplier) {
    return {
      id: line.id,
      purchaseBillId: line.purchaseBillId,
      itemName: line.itemName,
      description: line.description,
      supplierId: line.supplierId,
      supplierName: supplier.name,
      chassisNumber: line.chassisNumber,
      motorNumber: line.motorNumber,
      modelYear: line.modelYear,
      price: line.price,
      paidAmount: line.paidAmount,
      owed: round2(line.price - line.paidAmount),
      notes: line.notes,
      status: line.status,
      purchaseDate: bill.date,
      purchaseBillNumber: bill.number,
    }
  }
}
