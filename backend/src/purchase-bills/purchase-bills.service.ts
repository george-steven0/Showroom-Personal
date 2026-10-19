import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma, PurchaseBill, PurchaseBillLine, Supplier } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { LedgerService } from '../ledger/ledger.service'
import { paginate, resolveOrderBy, toSkipTake } from '../common/pagination'
import { round2 } from '../common/money'
import { nextBillNumber } from '../common/bill-number'
import type { CreatePurchaseBillDto } from './dto/create-purchase-bill.dto'
import type { UpdatePurchaseBillDto } from './dto/update-purchase-bill.dto'
import type { UpdateLineDetailsDto } from './dto/update-line-details.dto'
import type { ListPurchaseBillsQueryDto } from './dto/list-purchase-bills-query.dto'
import type { SettlePaymentDto } from './dto/settle-payment.dto'
import type { RequestUser } from '../common/decorators/current-user.decorator'
import type { SetConsignmentDto } from '../common/dto/set-consignment.dto'
import { consignmentData } from '../common/consignment'

const SORTABLE_FIELDS: Record<string, string> = { number: 'number', date: 'date', total: 'total' }

type LineWithSupplier = PurchaseBillLine & { supplier: Supplier }
type VehicleNumbers = { chassisNumber?: string | null; motorNumber?: string | null }

/** Chassis / motor numbers are stored trimmed, with '' meaning "not known yet" (missing info). */
function cleanNumber(value: string | null | undefined): string {
  return (value ?? '').trim()
}
type BillWithLines = PurchaseBill & { lines: LineWithSupplier[] }

@Injectable()
export class PurchaseBillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  async list(query: ListPurchaseBillsQueryDto) {
    const where: Prisma.PurchaseBillWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.from && query.to ? { date: { gte: new Date(query.from), lte: new Date(query.to) } } : {}),
      ...(query.search
        ? {
            OR: [
              { number: { contains: query.search } },
              { lines: { some: { itemName: { contains: query.search } } } },
              { lines: { some: { chassisNumber: { contains: query.search } } } },
            ],
          }
        : {}),
    }

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
      this.assertNoDuplicateWithinLines(dto.lines)
      await this.assertUniqueAgainstOtherBills(tx, dto.lines)

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
              chassisNumber: cleanNumber(line.chassisNumber),
              motorNumber: cleanNumber(line.motorNumber),
              modelYear: line.modelYear,
              price: line.price,
              paidAmount: line.paidAmount,
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
      const existingIds = new Set(existing.lines.map((line) => line.id))
      if (dto.lines.some((line) => line.id && !existingIds.has(line.id))) throw new BadRequestException('A car in this bill does not belong to it')
      this.assertNoDuplicateWithinLines(dto.lines)
      await this.assertUniqueAgainstOtherBills(tx, dto.lines, { excludeBillId: id })

      const supplierIds = [...new Set(dto.lines.map((line) => line.supplierId))]
      const suppliers = await tx.supplier.findMany({ where: { id: { in: supplierIds } } })
      if (suppliers.length !== supplierIds.length) throw new BadRequestException('One or more suppliers were not found')
      const supplierById = new Map(suppliers.map((s) => [s.id, s]))

      const date = new Date(dto.date)
      // Lines are replaced wholesale below, so carry the consignment marker and its details over — by the
      // line's own id when the form sent it, otherwise by (non-blank) chassis number.
      const consignmentEntries = existing.lines
        .filter((line) => line.isConsignment)
        .map((line) => [
          line,
          {
              isConsignment: true,
              consignmentTraderName: line.consignmentTraderName,
              consignmentDate: line.consignmentDate,
              consignmentAddress: line.consignmentAddress,
              consignmentPaidAmount: line.consignmentPaidAmount,
            consignmentNotes: line.consignmentNotes,
          },
        ] as const)
      const consignmentById = new Map(consignmentEntries.map(([line, data]) => [line.id, data]))
      const consignmentByChassis = new Map(
        consignmentEntries.filter(([line]) => line.chassisNumber.trim() !== '').map(([line, data]) => [line.chassisNumber.trim().toLowerCase(), data]),
      )
      const carriedConsignment = (line: { id?: string; chassisNumber?: string }) => {
        if (line.id) return consignmentById.get(line.id)
        const chassis = cleanNumber(line.chassisNumber)
        return chassis ? consignmentByChassis.get(chassis.toLowerCase()) : undefined
      }
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
              chassisNumber: cleanNumber(line.chassisNumber),
              motorNumber: cleanNumber(line.motorNumber),
              modelYear: line.modelYear,
              price: line.price,
              paidAmount: line.paidAmount,
              notes: line.notes,
              ...carriedConsignment(line),
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

  /**
   * Fills in or corrects a car's chassis / motor number and model year in place — allowed even after the car
   * is sold, unlike a full bill edit. Money, supplier and ledger are untouched. Every selling bill for this car
   * carries a copy of these details, so they're updated in the same transaction and never drift apart.
   */
  async updateLineDetails(lineId: string, dto: UpdateLineDetailsDto, user: RequestUser) {
    return this.prisma.$transaction(async (tx) => {
      const line = await tx.purchaseBillLine.findUnique({ where: { id: lineId }, include: { purchaseBill: true } })
      if (!line) throw new NotFoundException('Car not found')
      if (line.purchaseBill.status !== 'active') throw new BadRequestException('This buying bill has been cancelled')

      const details = {
        chassisNumber: dto.chassisNumber === undefined ? line.chassisNumber : cleanNumber(dto.chassisNumber),
        motorNumber: dto.motorNumber === undefined ? line.motorNumber : cleanNumber(dto.motorNumber),
        modelYear: dto.modelYear === undefined ? line.modelYear : dto.modelYear,
      }
      // Only numbers that actually change are checked, so fixing a model year isn't blocked by an old duplicate.
      const changed = (next: string, current: string) => next.toLowerCase() !== current.trim().toLowerCase()
      await this.assertUniqueAgainstOtherBills(
        tx,
        [
          {
            chassisNumber: changed(details.chassisNumber, line.chassisNumber) ? details.chassisNumber : '',
            motorNumber: changed(details.motorNumber, line.motorNumber) ? details.motorNumber : '',
          },
        ],
        { excludeLineId: lineId },
      )

      const now = new Date()
      const updated = await tx.purchaseBillLine.update({
        where: { id: lineId },
        data: details,
        include: { supplier: true, purchaseBill: true },
      })
      await tx.purchaseBill.update({ where: { id: line.purchaseBillId }, data: { updatedAt: now, updatedBy: user.id, updatedByName: user.fullName } })
      const synced = await tx.sellingBill.updateMany({
        where: { purchaseLineId: lineId },
        data: { ...details, updatedAt: now, updatedBy: user.id, updatedByName: user.fullName },
      })

      return { line: this.mapLine(updated, updated.purchaseBill, updated.supplier), syncedSellingBills: synced.count }
    })
  }

  /** Marks, edits the details of, or clears a car's consignment. No ledger, price or status effect, so it only needs the car to still be in stock. */
  async setLineConsignment(lineId: string, dto: SetConsignmentDto) {
    const line = await this.prisma.purchaseBillLine.findUnique({ where: { id: lineId }, include: { supplier: true, purchaseBill: true } })
    if (!line) throw new NotFoundException('Car not found')
    if (line.status !== 'in_stock') throw new BadRequestException('Only cars still in stock can be marked as consignment')

    const updated = await this.prisma.purchaseBillLine.update({
      where: { id: lineId },
      data: consignmentData(dto),
      include: { supplier: true, purchaseBill: true },
    })
    return this.mapLine(updated, updated.purchaseBill, updated.supplier)
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

  /**
   * A chassis or motor number identifies one physical car, so a bill can't list the same one twice — almost
   * always a copy-paste slip on a cloned or duplicated row. Case-insensitive, same reasoning as the check below.
   */
  private assertNoDuplicateWithinLines(lines: VehicleNumbers[]) {
    const chassisSeen = new Set<string>()
    const motorSeen = new Set<string>()
    for (const line of lines) {
      const chassis = cleanNumber(line.chassisNumber)
      const motor = cleanNumber(line.motorNumber)
      if (chassis) {
        if (chassisSeen.has(chassis.toLowerCase())) throw new BadRequestException(`Chassis number "${chassis}" is used by more than one car in this bill.`)
        chassisSeen.add(chassis.toLowerCase())
      }
      if (motor) {
        if (motorSeen.has(motor.toLowerCase())) throw new BadRequestException(`Motor number "${motor}" is used by more than one car in this bill.`)
        motorSeen.add(motor.toLowerCase())
      }
    }
  }

  /**
   * Rejects a chassis/motor number already recorded on another *active* bill — a cancelled bill's cars were
   * never really acquired, so their numbers are free to reuse. `excludeBillId` lets an edit keep its own
   * numbers (its old lines are about to be deleted and recreated by the caller, not checked against here);
   * `excludeLineId` does the same for a single car whose details are being edited in place.
   * Matching is case-insensitive, compared in JS (see the same note on the Inventory guard) — one query for
   * every active line, not per submitted line. A blank number is "missing", never a duplicate.
   */
  private async assertUniqueAgainstOtherBills(tx: Prisma.TransactionClient, lines: VehicleNumbers[], exclude: { excludeBillId?: string; excludeLineId?: string } = {}) {
    const others = await tx.purchaseBillLine.findMany({
      where: {
        purchaseBill: { status: 'active', ...(exclude.excludeBillId ? { id: { not: exclude.excludeBillId } } : {}) },
        ...(exclude.excludeLineId ? { id: { not: exclude.excludeLineId } } : {}),
      },
      select: { chassisNumber: true, motorNumber: true, purchaseBill: { select: { number: true } } },
    })
    const same = (stored: string, value: string) => stored.trim().toLowerCase() === value.toLowerCase()

    for (const line of lines) {
      const chassis = cleanNumber(line.chassisNumber)
      const motor = cleanNumber(line.motorNumber)

      const chassisDupe = chassis ? others.find((row) => same(row.chassisNumber, chassis)) : undefined
      if (chassisDupe) throw new BadRequestException(`Chassis number "${chassis}" already exists on bill ${chassisDupe.purchaseBill.number}.`)

      const motorDupe = motor ? others.find((row) => same(row.motorNumber, motor)) : undefined
      if (motorDupe) throw new BadRequestException(`Motor number "${motor}" already exists on bill ${motorDupe.purchaseBill.number}.`)
    }
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
      isConsignment: line.isConsignment,
      consignmentTraderName: line.consignmentTraderName,
      consignmentDate: line.consignmentDate,
      consignmentAddress: line.consignmentAddress,
      consignmentPaidAmount: line.consignmentPaidAmount,
      consignmentNotes: line.consignmentNotes,
      purchaseDate: bill.date,
      purchaseBillNumber: bill.number,
    }
  }
}
