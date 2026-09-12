import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { paginate, resolveOrderBy, toSkipTake } from '../../common/pagination'
import { round2 } from '../../common/money'
import type { CreateInventoryItemDto } from './dto/create-inventory-item.dto'
import type { UpdateInventoryItemDto } from './dto/update-inventory-item.dto'
import type { ListInventoryItemsQueryDto } from './dto/list-inventory-items-query.dto'
import type { MarkSoldDto } from './dto/mark-sold.dto'
import type { RecordInventoryPaymentDto } from './dto/record-inventory-payment.dto'
import type { RequestUser } from '../../common/decorators/current-user.decorator'

const SORTABLE_FIELDS: Record<string, string> = {
  carType: 'carType',
  modelYear: 'modelYear',
  traderSellPrice: 'traderSellPrice',
  customerSellPrice: 'customerSellPrice',
  createdAt: 'createdAt',
}

/** A car counts as fully `sold` only once the buyer has paid the full customer price — never set by hand. */
function resolveStatus(paidAmount: number, customerSellPrice: number): 'partial_paid' | 'sold' {
  return paidAmount >= customerSellPrice ? 'sold' : 'partial_paid'
}

@Injectable()
export class InventoryItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListInventoryItemsQueryDto) {
    const where: Prisma.InventoryItemWhereInput = {
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { carType: { contains: query.search } },
              { brand: { contains: query.search } },
              { chassisNumber: { contains: query.search } },
              { motorNumber: { contains: query.search } },
              { color: { contains: query.search } },
            ],
          }
        : {}),
    }

    const [rows, total] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where,
        include: { branch: true },
        orderBy: resolveOrderBy(query, SORTABLE_FIELDS, { createdAt: 'desc' }),
        ...toSkipTake(query),
      }),
      this.prisma.inventoryItem.count({ where }),
    ])

    return paginate(rows, total, query)
  }

  create(dto: CreateInventoryItemDto, user: RequestUser) {
    return this.prisma.inventoryItem.create({
      data: { ...dto, createdBy: user.id, createdByName: user.fullName },
      include: { branch: true },
    })
  }

  async update(id: string, dto: UpdateInventoryItemDto, user: RequestUser) {
    await this.findOrThrow(id)
    return this.prisma.inventoryItem.update({
      where: { id },
      data: { ...dto, updatedAt: new Date(), updatedBy: user.id, updatedByName: user.fullName },
      include: { branch: true },
    })
  }

  async remove(id: string) {
    await this.findOrThrow(id)
    await this.prisma.inventoryItem.delete({ where: { id } })
    return { success: true }
  }

  async markSold(id: string, dto: MarkSoldDto, user: RequestUser) {
    const item = await this.findOrThrow(id)
    if (item.status !== 'in_stock') throw new BadRequestException('This car already has a buyer recorded')

    const paidAmount = round2(Math.min(dto.paidAmount, item.customerSellPrice))

    return this.prisma.inventoryItem.update({
      where: { id },
      data: {
        status: resolveStatus(paidAmount, item.customerSellPrice),
        paidAmount,
        buyerName: dto.buyerName,
        buyerPhone: dto.buyerPhone,
        buyerAddress: dto.buyerAddress,
        saleNotes: dto.saleNotes,
        saleDate: dto.saleDate ? new Date(dto.saleDate) : new Date(),
        soldAt: new Date(),
        updatedAt: new Date(),
        updatedBy: user.id,
        updatedByName: user.fullName,
      },
      include: { branch: true },
    })
  }

  /** Tops up an existing partial payment — only while the car isn't already fully paid. */
  async recordPayment(id: string, dto: RecordInventoryPaymentDto, user: RequestUser) {
    const item = await this.findOrThrow(id)
    if (item.status === 'in_stock') throw new BadRequestException('Record the sale first before recording a payment')
    if (item.status === 'sold') throw new BadRequestException('This car is already fully paid')

    const paidAmount = round2(Math.min(item.paidAmount + dto.amount, item.customerSellPrice))

    return this.prisma.inventoryItem.update({
      where: { id },
      data: {
        paidAmount,
        status: resolveStatus(paidAmount, item.customerSellPrice),
        updatedAt: new Date(),
        updatedBy: user.id,
        updatedByName: user.fullName,
      },
      include: { branch: true },
    })
  }

  async markAvailable(id: string, user: RequestUser) {
    const item = await this.findOrThrow(id)
    if (item.status === 'in_stock') throw new BadRequestException('This car is already in stock')

    return this.prisma.inventoryItem.update({
      where: { id },
      data: {
        status: 'in_stock',
        paidAmount: 0,
        buyerName: null,
        buyerPhone: null,
        buyerAddress: null,
        saleNotes: null,
        saleDate: null,
        soldAt: null,
        updatedAt: new Date(),
        updatedBy: user.id,
        updatedByName: user.fullName,
      },
      include: { branch: true },
    })
  }

  private async findOrThrow(id: string) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id } })
    if (!item) throw new NotFoundException('Inventory item not found')
    return item
  }
}
