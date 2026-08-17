import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { PurchaseBillsService } from './purchase-bills.service'
import { CreatePurchaseBillDto } from './dto/create-purchase-bill.dto'
import { UpdatePurchaseBillDto } from './dto/update-purchase-bill.dto'
import { ListPurchaseBillsQueryDto } from './dto/list-purchase-bills-query.dto'
import { CancelPurchaseBillDto } from './dto/cancel-purchase-bill.dto'
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator'

@Controller('purchase-bills')
export class PurchaseBillsController {
  constructor(private readonly purchaseBills: PurchaseBillsService) {}

  @Get()
  list(@Query() query: ListPurchaseBillsQueryDto) {
    return this.purchaseBills.list(query)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchaseBills.findOne(id)
  }

  @Post()
  create(@Body() dto: CreatePurchaseBillDto, @CurrentUser() user: RequestUser) {
    return this.purchaseBills.create(dto, user)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseBillDto, @CurrentUser() user: RequestUser) {
    return this.purchaseBills.update(id, dto, user)
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Body() dto: CancelPurchaseBillDto, @CurrentUser() user: RequestUser) {
    return this.purchaseBills.cancel(id, dto.reason, user)
  }
}
