import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { SellingBillsService } from './selling-bills.service'
import { CreateSellingBillDto } from './dto/create-selling-bill.dto'
import { UpdateSellingBillDto } from './dto/update-selling-bill.dto'
import { ListSellingBillsQueryDto } from './dto/list-selling-bills-query.dto'
import { CancelSellingBillDto } from './dto/cancel-selling-bill.dto'
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator'

@Controller('selling-bills')
export class SellingBillsController {
  constructor(private readonly sellingBills: SellingBillsService) {}

  @Get()
  list(@Query() query: ListSellingBillsQueryDto) {
    return this.sellingBills.list(query)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sellingBills.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateSellingBillDto, @CurrentUser() user: RequestUser) {
    return this.sellingBills.create(dto, user)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSellingBillDto, @CurrentUser() user: RequestUser) {
    return this.sellingBills.update(id, dto, user)
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Body() dto: CancelSellingBillDto, @CurrentUser() user: RequestUser) {
    return this.sellingBills.cancel(id, dto.reason, user)
  }
}
