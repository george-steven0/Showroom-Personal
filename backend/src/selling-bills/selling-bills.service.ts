import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { LedgerService } from '../ledger/ledger.service'
import { paginate, resolveOrderBy, toSkipTake } from '../common/pagination'
import { round2 } from '../common/money'
import { nextBillNumber } from '../common/bill-number'
import type { CreateSellingBillDto } from './dto/create-selling-bill.dto'
import type { ListSellingBillsQueryDto } from './dto/list-selling-bills-query.dto'
import type { RequestUser } from '../common/decorators/current-user.decorator'

const SORTABLE_FIELDS: Record<string, string> = { number: 'number', sellingDate: 'sellingDate', sellingPrice: 'sellingPrice', profit: 'profit' }

@Injectable()
export class SellingBillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  async list(query: ListSellingBillsQueryDto) {
    const where: Prisma.SellingBillWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { number: { contains: query.search } },
              { buyerName: { contains: query.search } },
              { itemName: { contains: query.search } },
              { chassisNumber: { contains: query.search } },
            ],
          }
        : {}),
    }

    const [rows, total] = await Promise.all([
      this.prisma.sellingBill.findMany({
        where,
        orderBy: resolveOrderBy(query, SORTABLE_FIELDS, { sellingDate: 'desc' }),
        ...toSkipTake(query),
      }),
      this.prisma.sellingBill.count({ where }),
    ])

    return paginate(rows, total, query)
  }

  async create(dto: CreateSellingBillDto, user: RequestUser) {
    return this.prisma.$transaction(async (tx) => {
      const line = await tx.purchaseBillLine.findUnique({
        where: { id: dto.purchaseLineId },
        include: { supplier: true, purchaseBill: true },
      })
      if (!line) throw new NotFoundException('Car not found')
      if (line.status !== 'in_stock' || line.purchaseBill.status !== 'active') {
        throw new BadRequestException('This car is no longer available to sell')
      }

      const number = await nextBillNumber(this.prisma, 'sellingBill', 'SB')
      const profit = round2(dto.sellingPrice - line.price)

      const bill = await tx.sellingBill.create({
        data: {
          number,
          purchaseLineId: line.id,
          itemName: line.itemName,
          supplierName: line.supplier.name,
          buyingPrice: line.price,
          buyingDate: line.purchaseBill.date,
          chassisNumber: line.chassisNumber,
          motorNumber: line.motorNumber,
          modelYear: line.modelYear,
          sellingPrice: dto.sellingPrice,
          sellingDate: new Date(dto.sellingDate),
          buyerName: dto.buyerName,
          buyerAddress: dto.buyerAddress,
          buyerPhone: dto.buyerPhone,
          notes: dto.notes,
          profit,
          createdBy: user.id,
          createdByName: user.fullName,
        },
      })

      await tx.purchaseBillLine.update({ where: { id: line.id }, data: { status: 'sold' } })

      await this.ledger.writeEntry(tx, {
        type: 'sale',
        direction: 'credit',
        amount: dto.sellingPrice,
        date: new Date(dto.sellingDate),
        description: `Sold ${line.itemName} to ${dto.buyerName}`,
        itemName: line.itemName,
        counterpartyName: dto.buyerName,
        referenceType: 'selling_bill',
        referenceId: bill.id,
        createdBy: user.id,
        createdByName: user.fullName,
      })

      return bill
    })
  }

  async cancel(id: string, reason: string | undefined, user: RequestUser) {
    return this.prisma.$transaction(async (tx) => {
      const bill = await tx.sellingBill.findUnique({ where: { id } })
      if (!bill) throw new NotFoundException('Selling bill not found')
      if (bill.status !== 'active') throw new BadRequestException('This selling bill has already been cancelled')

      const now = new Date()
      await this.ledger.reverseEntriesForReference(tx, bill.id, { date: now, createdBy: user.id, createdByName: user.fullName })

      await tx.purchaseBillLine.update({ where: { id: bill.purchaseLineId }, data: { status: 'in_stock' } })

      return tx.sellingBill.update({
        where: { id },
        data: { status: 'cancelled', cancelledAt: now, cancelledBy: user.id, cancelledByName: user.fullName, cancelReason: reason },
      })
    })
  }
}
