import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { CreateInventoryBranchDto } from './dto/create-inventory-branch.dto'
import type { UpdateInventoryBranchDto } from './dto/update-inventory-branch.dto'
import type { RequestUser } from '../../common/decorators/current-user.decorator'

@Injectable()
export class InventoryBranchesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.inventoryBranch.findMany({ orderBy: { name: 'asc' } })
  }

  create(dto: CreateInventoryBranchDto, user: RequestUser) {
    return this.prisma.inventoryBranch.create({
      data: { name: dto.name, nameAr: dto.nameAr, createdBy: user.id, createdByName: user.fullName },
    })
  }

  async update(id: string, dto: UpdateInventoryBranchDto) {
    await this.findOrThrow(id)
    return this.prisma.inventoryBranch.update({ where: { id }, data: { name: dto.name, nameAr: dto.nameAr } })
  }

  async remove(id: string) {
    await this.findOrThrow(id)
    await this.prisma.inventoryBranch.delete({ where: { id } })
    return { success: true }
  }

  private async findOrThrow(id: string) {
    const branch = await this.prisma.inventoryBranch.findUnique({ where: { id } })
    if (!branch) throw new NotFoundException('Branch not found')
    return branch
  }
}
