import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { paginate, resolveOrderBy, toSkipTake } from '../common/pagination'
import type { CreateSupplierDto } from './dto/create-supplier.dto'
import type { UpdateSupplierDto } from './dto/update-supplier.dto'
import type { ListSuppliersQueryDto } from './dto/list-suppliers-query.dto'
import type { RequestUser } from '../common/decorators/current-user.decorator'

const SORTABLE_FIELDS: Record<string, string> = { name: 'name', phone: 'phone' }

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListSuppliersQueryDto) {
    const where = query.search
      ? { OR: [{ name: { contains: query.search } }, { phone: { contains: query.search } }] }
      : {}

    const [rows, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        orderBy: resolveOrderBy(query, SORTABLE_FIELDS, { name: 'asc' }),
        ...toSkipTake(query),
      }),
      this.prisma.supplier.count({ where }),
    ])

    return paginate(rows, total, query)
  }

  async create(dto: CreateSupplierDto, user: RequestUser) {
    return this.prisma.supplier.create({
      data: { ...dto, createdBy: user.id, createdByName: user.fullName },
    })
  }

  async update(id: string, dto: UpdateSupplierDto, user: RequestUser) {
    await this.findOrThrow(id)
    return this.prisma.supplier.update({
      where: { id },
      data: { ...dto, updatedAt: new Date(), updatedBy: user.id, updatedByName: user.fullName },
    })
  }

  async remove(id: string) {
    await this.findOrThrow(id)
    await this.prisma.supplier.delete({ where: { id } })
    return { success: true }
  }

  private async findOrThrow(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } })
    if (!supplier) throw new NotFoundException('Supplier not found')
    return supplier
  }
}
