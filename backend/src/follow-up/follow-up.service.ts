import { Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { paginate, resolveOrderBy, toSkipTake } from '../common/pagination'
import type { CreateFollowUpClientDto } from './dto/create-follow-up-client.dto'
import type { UpdateFollowUpClientDto } from './dto/update-follow-up-client.dto'
import type { ListFollowUpClientsQueryDto } from './dto/list-follow-up-clients-query.dto'
import type { RequestUser } from '../common/decorators/current-user.decorator'

const SORTABLE_FIELDS: Record<string, string> = {
  clientName: 'clientName',
  carType: 'carType',
  modelYear: 'modelYear',
  agreedPrice: 'agreedPrice',
  nextFollowUpDate: 'nextFollowUpDate',
  createdAt: 'createdAt',
}

/** A client who already paid something down is a strong lead by definition — never left as anything but `very_likely`. */
function resolveRating(dto: { downPayment?: number; rating?: string }): string {
  if (dto.downPayment && dto.downPayment > 0) return 'very_likely'
  return dto.rating ?? 'medium'
}

@Injectable()
export class FollowUpService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListFollowUpClientsQueryDto) {
    const where: Prisma.FollowUpClientWhereInput = {
      ...(query.rating ? { rating: query.rating } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.from && query.to ? { createdAt: { gte: new Date(query.from), lte: new Date(query.to) } } : {}),
      ...(query.search
        ? {
            OR: [
              { clientName: { contains: query.search } },
              { phone: { contains: query.search } },
              { carType: { contains: query.search } },
              { carModel: { contains: query.search } },
            ],
          }
        : {}),
    }

    const [rows, total] = await Promise.all([
      this.prisma.followUpClient.findMany({
        where,
        orderBy: resolveOrderBy(query, SORTABLE_FIELDS, { createdAt: 'desc' }),
        ...toSkipTake(query),
      }),
      this.prisma.followUpClient.count({ where }),
    ])

    return paginate(rows, total, query)
  }

  create(dto: CreateFollowUpClientDto, user: RequestUser) {
    return this.prisma.followUpClient.create({
      data: {
        ...dto,
        rating: resolveRating(dto),
        status: dto.status ?? 'following_up',
        nextFollowUpDate: dto.nextFollowUpDate ? new Date(dto.nextFollowUpDate) : undefined,
        createdBy: user.id,
        createdByName: user.fullName,
      },
    })
  }

  async update(id: string, dto: UpdateFollowUpClientDto, user: RequestUser) {
    await this.findOrThrow(id)
    return this.prisma.followUpClient.update({
      where: { id },
      data: {
        ...dto,
        rating: resolveRating(dto),
        status: dto.status ?? 'following_up',
        nextFollowUpDate: dto.nextFollowUpDate ? new Date(dto.nextFollowUpDate) : null,
        updatedAt: new Date(),
        updatedBy: user.id,
        updatedByName: user.fullName,
      },
    })
  }

  async remove(id: string) {
    await this.findOrThrow(id)
    await this.prisma.followUpClient.delete({ where: { id } })
    return { success: true }
  }

  private async findOrThrow(id: string) {
    const client = await this.prisma.followUpClient.findUnique({ where: { id } })
    if (!client) throw new NotFoundException('Follow-up client not found')
    return client
  }
}
