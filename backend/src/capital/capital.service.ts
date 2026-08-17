import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { LedgerService } from '../ledger/ledger.service'
import type { InjectCapitalDto } from './dto/inject-capital.dto'
import type { RequestUser } from '../common/decorators/current-user.decorator'

@Injectable()
export class CapitalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  async inject(dto: InjectCapitalDto, user: RequestUser) {
    return this.prisma.$transaction((tx) =>
      this.ledger.writeEntry(tx, {
        type: 'capital_injection',
        direction: 'credit',
        amount: dto.amount,
        date: new Date(dto.date),
        description: dto.note ? `Capital added — ${dto.note}` : 'Capital added',
        referenceType: 'capital',
        createdBy: user.id,
        createdByName: user.fullName,
      }),
    )
  }
}
