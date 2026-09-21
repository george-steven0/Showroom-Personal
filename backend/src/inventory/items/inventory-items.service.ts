import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { paginate, resolveOrderBy, toSkipTake } from '../../common/pagination'
import { round2 } from '../../common/money'
import type { CreateInventoryItemDto } from './dto/create-inventory-item.dto'
import type { UpdateInventoryItemDto } from './dto/update-inventory-item.dto'
import type { ListInventoryItemsQueryDto } from './dto/list-inventory-items-query.dto'
import type { InventoryStatsQueryDto } from './dto/inventory-stats-query.dto'
import type { MarkSoldDto } from './dto/mark-sold.dto'
import type { RecordInventoryPaymentDto } from './dto/record-inventory-payment.dto'
import type { RequestUser } from '../../common/decorators/current-user.decorator'
import type { SetConsignmentDto } from '../../common/dto/set-consignment.dto'
import { consignmentData, splitConsignment } from '../../common/consignment'

const SORTABLE_FIELDS: Record<string, string> = {
  carType: 'carType',
  modelYear: 'modelYear',
  traderSellPrice: 'traderSellPrice',
  agreedPrice: 'agreedPrice',
  createdAt: 'createdAt',
}

/**
 * A car counts as fully `sold` once the buyer has paid the full agreed price, or `exceeded` if they've
 * paid more than that — a buyer sometimes pays extra as an advance toward a future car. Never set by hand.
 */
function resolveStatus(paidAmount: number, agreedPrice: number): 'partial_paid' | 'sold' | 'exceeded' {
  if (paidAmount > agreedPrice) return 'exceeded'
  return paidAmount === agreedPrice ? 'sold' : 'partial_paid'
}

@Injectable()
export class InventoryItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListInventoryItemsQueryDto) {
    const branchIds = query.branchId ? query.branchId.split(',').filter(Boolean) : []
    const statuses = query.status ? query.status.split(',').filter(Boolean) : []

    const where: Prisma.InventoryItemWhereInput = {
      ...(branchIds.length ? { branchId: { in: branchIds } } : {}),
      ...(statuses.length ? { status: { in: statuses } } : {}),
      ...(query.consignment ? { isConsignment: query.consignment === 'true' } : {}),
      ...(query.from && query.to ? { saleDate: { gte: new Date(query.from), lte: new Date(query.to) } } : {}),
      ...(query.search
        ? {
            OR: [
              { carType: { contains: query.search } },
              { brand: { contains: query.search } },
              { chassisNumber: { contains: query.search } },
              { motorNumber: { contains: query.search } },
              { color: { contains: query.search } },
              { buyerName: { contains: query.search } },
              { consignmentTraderName: { contains: query.search } },
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

  /** Head-counts for the Inventory KPI blocks. `consignment` counts every car carrying the marker, whatever its status — the same rows the "Consignment only" filter shows. */
  async stats(query: InventoryStatsQueryDto) {
    const branchIds = query.branchId ? query.branchId.split(',').filter(Boolean) : []
    const where: Prisma.InventoryItemWhereInput = branchIds.length ? { branchId: { in: branchIds } } : {}

    const [byStatus, consignment] = await Promise.all([
      this.prisma.inventoryItem.groupBy({ by: ['status'], where, _count: { _all: true } }),
      this.prisma.inventoryItem.count({ where: { ...where, isConsignment: true } }),
    ])
    const count = (status: string) => byStatus.find((row) => row.status === status)?._count._all ?? 0

    return {
      inStock: count('in_stock'),
      partialPaid: count('partial_paid'),
      sold: count('sold'),
      exceeded: count('exceeded'),
      consignment,
    }
  }

  create(dto: CreateInventoryItemDto, user: RequestUser) {
    const { rest, consignment } = splitConsignment(dto)
    return this.prisma.inventoryItem.create({
      data: { ...rest, ...consignment, createdBy: user.id, createdByName: user.fullName },
      include: { branch: true },
    })
  }

  async update(id: string, dto: UpdateInventoryItemDto, user: RequestUser) {
    await this.findOrThrow(id)
    const { rest, consignment } = splitConsignment(dto)
    return this.prisma.inventoryItem.update({
      where: { id },
      data: { ...rest, ...consignment, updatedAt: new Date(), updatedBy: user.id, updatedByName: user.fullName },
      include: { branch: true },
    })
  }

  /** Marks, edits the details of, or clears (`isConsignment: false`) an item's consignment — see `consignmentData`. */
  async setConsignment(id: string, dto: SetConsignmentDto, user: RequestUser) {
    await this.findOrThrow(id)
    return this.prisma.inventoryItem.update({
      where: { id },
      data: { ...consignmentData(dto), updatedAt: new Date(), updatedBy: user.id, updatedByName: user.fullName },
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

    const paidAmount = round2(dto.paidAmount)

    return this.prisma.inventoryItem.update({
      where: { id },
      data: {
        status: resolveStatus(paidAmount, item.agreedPrice),
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

  /**
   * Corrects an already-recorded sale (wrong buyer info or amount typed in) without unselling and reselling
   * the car — that round trip would wipe the buyer record and force re-entry. Replaces the sale fields
   * outright (unlike `recordPayment`, which only adds to what's already paid) and recomputes status from
   * the new `paidAmount`, so it works the same whether the car is `partial_paid`, `sold` or `exceeded`.
   */
  async updateSale(id: string, dto: MarkSoldDto, user: RequestUser) {
    const item = await this.findOrThrow(id)
    if (item.status === 'in_stock') throw new BadRequestException('Record the sale first before editing it')

    const paidAmount = round2(dto.paidAmount)

    return this.prisma.inventoryItem.update({
      where: { id },
      data: {
        status: resolveStatus(paidAmount, item.agreedPrice),
        paidAmount,
        buyerName: dto.buyerName,
        buyerPhone: dto.buyerPhone,
        buyerAddress: dto.buyerAddress,
        saleNotes: dto.saleNotes,
        saleDate: dto.saleDate ? new Date(dto.saleDate) : item.saleDate,
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
    if (item.status !== 'partial_paid') throw new BadRequestException('This car is already fully paid')

    const paidAmount = round2(item.paidAmount + dto.amount)

    return this.prisma.inventoryItem.update({
      where: { id },
      data: {
        paidAmount,
        status: resolveStatus(paidAmount, item.agreedPrice),
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
