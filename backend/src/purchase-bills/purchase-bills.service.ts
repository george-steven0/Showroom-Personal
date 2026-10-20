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

  /**
   * Edits a bill in place — any active bill, even once its cars are sold, since entries get corrected after
   * the fact. Cars keep their ids, so whatever hangs off them survives: the consignment marker and their sales.
   * Each form row is matched to its car by the id it sends; a row without one falls back to a matching
   * non-blank chassis number, otherwise it's a new car. A car with a sale on record can't be removed.
   *
   * A car's payment entry in the ledger is redone only if something it records changed (paid amount, date,
   * supplier, item name), so re-saving an unchanged bill adds no noise — see `rerecordPayment`. A sale keeps a
   * copy of the car it sold (name, supplier, buying price and date, numbers), so those are kept in step and its
   * profit recomputed from the corrected price.
   */
  async update(id: string, dto: UpdatePurchaseBillDto, user: RequestUser) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.purchaseBill.findUnique({
        where: { id },
        include: { lines: { include: { sellingBills: { select: { id: true, number: true, status: true, sellingPrice: true } } } } },
      })
      if (!existing) throw new NotFoundException('Buying bill not found')
      if (existing.status !== 'active') throw new BadRequestException('This buying bill has already been cancelled')

      const existingById = new Map(existing.lines.map((line) => [line.id, line]))
      const sentIds = dto.lines.flatMap((line) => (line.id ? [line.id] : []))
      if (sentIds.some((lineId) => !existingById.has(lineId))) throw new BadRequestException('A car in this bill does not belong to it')
      if (new Set(sentIds).size !== sentIds.length) throw new BadRequestException('The same car appears twice in this bill')

      const claimed = new Set(sentIds)
      const rows = dto.lines.map((input) => {
        if (input.id) return { input, current: existingById.get(input.id) }
        const chassis = cleanNumber(input.chassisNumber).toLowerCase()
        const current = chassis ? existing.lines.find((line) => !claimed.has(line.id) && line.chassisNumber.trim().toLowerCase() === chassis) : undefined
        if (current) claimed.add(current.id)
        return { input, current }
      })
      const removed = existing.lines.filter((line) => !claimed.has(line.id))
      const removedWithHistory = removed.find((line) => line.sellingBills.length > 0)
      if (removedWithHistory) {
        const activeSale = removedWithHistory.sellingBills.find((sale) => sale.status === 'active')
        throw new BadRequestException(
          activeSale
            ? `"${removedWithHistory.itemName}" is sold on ${activeSale.number}, so it can't be removed from this bill. Cancel that sale first if the car shouldn't be here, or edit it instead.`
            : `"${removedWithHistory.itemName}" has an earlier (cancelled) sale on record, so it can't be removed from this bill. You can still edit it, or cancel the whole bill.`,
        )
      }

      this.assertNoDuplicateWithinLines(dto.lines)
      await this.assertUniqueAgainstOtherBills(tx, dto.lines, { excludeBillId: id })

      const supplierIds = [...new Set(dto.lines.map((line) => line.supplierId))]
      const suppliers = await tx.supplier.findMany({ where: { id: { in: supplierIds } } })
      if (suppliers.length !== supplierIds.length) throw new BadRequestException('One or more suppliers were not found')
      const supplierById = new Map(suppliers.map((s) => [s.id, s]))

      const date = new Date(dto.date)
      const now = new Date()
      const audit = { createdBy: user.id, createdByName: user.fullName }
      const dateChanged = existing.date.getTime() !== date.getTime()
      const recordPayment = (line: { id: string; itemName: string; supplierId: string }, amount: number) =>
        this.ledger.writeEntry(tx, {
          type: 'purchase_payment',
          direction: 'debit',
          amount,
          date,
          description: `Bought ${line.itemName} from ${supplierById.get(line.supplierId)?.name ?? ''}`,
          itemName: line.itemName,
          counterpartyName: supplierById.get(line.supplierId)?.name,
          referenceType: 'purchase_bill_line',
          referenceId: line.id,
          ...audit,
        })

      // A car taken off the bill was entered by mistake, so its payments are offset on the dates they were recorded.
      for (const line of removed) {
        await this.ledger.reverseEntriesForReference(tx, line.id, { date: 'original', ...audit })
        await tx.purchaseBillLine.delete({ where: { id: line.id } })
      }

      const subtotal = round2(dto.lines.reduce((sum, line) => sum + line.price, 0))
      await tx.purchaseBill.update({
        where: { id },
        data: { date, notes: dto.notes ?? null, subtotal, total: subtotal, updatedAt: now, updatedBy: user.id, updatedByName: user.fullName },
      })

      for (const { input, current } of rows) {
        // Explicit nulls: on an update, `undefined` would mean "leave the old value", so a cleared field would stick.
        const data = {
          itemName: input.itemName,
          description: input.description ?? null,
          supplierId: input.supplierId,
          chassisNumber: cleanNumber(input.chassisNumber),
          motorNumber: cleanNumber(input.motorNumber),
          modelYear: input.modelYear ?? null,
          price: input.price,
          paidAmount: input.paidAmount,
          notes: input.notes ?? null,
        }

        if (!current) {
          const created = await tx.purchaseBillLine.create({ data: { ...data, purchaseBillId: id } })
          await recordPayment(created, created.paidAmount)
          continue
        }

        await tx.purchaseBillLine.update({ where: { id: current.id }, data })
        const paymentChanged = current.paidAmount !== data.paidAmount || current.supplierId !== data.supplierId || current.itemName !== data.itemName || dateChanged
        if (paymentChanged) await this.rerecordPayment(tx, { id: current.id, ...data }, recordPayment, audit)

        // Every sale of this car (the active one and any cancelled ones) carries a copy of it — keep them in step.
        // Profit is selling minus buying price, so a corrected price moves the profit the Accounts page reports.
        const snapshotChanged =
          current.itemName !== data.itemName ||
          current.supplierId !== data.supplierId ||
          current.price !== data.price ||
          dateChanged ||
          current.chassisNumber !== data.chassisNumber ||
          current.motorNumber !== data.motorNumber ||
          current.modelYear !== data.modelYear
        if (snapshotChanged) {
          for (const sale of current.sellingBills) {
            await tx.sellingBill.update({
              where: { id: sale.id },
              data: {
                itemName: data.itemName,
                supplierName: supplierById.get(data.supplierId)?.name ?? '',
                buyingPrice: data.price,
                buyingDate: date,
                chassisNumber: data.chassisNumber,
                motorNumber: data.motorNumber,
                modelYear: data.modelYear,
                profit: round2(sale.sellingPrice - data.price),
                updatedAt: now,
                updatedBy: user.id,
                updatedByName: user.fullName,
              },
            })
          }
        }
      }

      const bill = await tx.purchaseBill.findUniqueOrThrow({ where: { id }, include: { lines: { include: { supplier: true } } } })
      return this.mapBill(bill)
    })
  }

  async cancel(id: string, reason: string | undefined, user: RequestUser) {
    return this.prisma.$transaction(async (tx) => {
      const bill = await tx.purchaseBill.findUnique({ where: { id }, include: { lines: true } })
      if (!bill) throw new NotFoundException('Buying bill not found')
      this.assertCancellable(bill)

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

  /**
   * Brings an edited car's ledger in line with its new paid amount. Payments made later from Accounts
   * (`debt_settlement`) keep their own entries and dates; only the up-front `purchase_payment` is offset — on
   * the dates it was recorded — and written again for the rest of the paid amount. If the paid amount was cut
   * below what was settled later, those settlements can't all stand, so everything is offset and the full paid
   * amount recorded as one payment on the bill date.
   */
  private async rerecordPayment(
    tx: Prisma.TransactionClient,
    line: { id: string; itemName: string; supplierId: string; paidAmount: number },
    recordPayment: (line: { id: string; itemName: string; supplierId: string }, amount: number) => Promise<unknown>,
    audit: { createdBy: string; createdByName: string },
  ) {
    const settlements = await tx.cashTransaction.findMany({ where: { referenceId: line.id, type: 'debt_settlement' }, select: { direction: true, amount: true } })
    const settled = round2(settlements.reduce((sum, entry) => sum + (entry.direction === 'debit' ? entry.amount : -entry.amount), 0))
    const upFront = round2(line.paidAmount - settled)

    if (upFront >= 0) {
      await this.ledger.reverseEntriesForReference(tx, line.id, { date: 'original', types: ['purchase_payment'], ...audit })
      await recordPayment(line, upFront)
    } else {
      await this.ledger.reverseEntriesForReference(tx, line.id, { date: 'original', ...audit })
      await recordPayment(line, line.paidAmount)
    }
  }

  /** Cancelling voids every car on the bill, so it's refused once one is sold — that sale would point at a car never bought. */
  private assertCancellable(bill: PurchaseBill & { lines: PurchaseBillLine[] }) {
    if (bill.status !== 'active') throw new BadRequestException('This buying bill has already been cancelled')
    if (bill.lines.some((line) => line.status !== 'in_stock')) {
      throw new BadRequestException('This bill cannot be cancelled because at least one of its cars has already been sold')
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
