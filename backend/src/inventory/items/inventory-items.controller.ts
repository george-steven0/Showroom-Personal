import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { InventoryItemsService } from './inventory-items.service'
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto'
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto'
import { ListInventoryItemsQueryDto } from './dto/list-inventory-items-query.dto'
import { MarkSoldDto } from './dto/mark-sold.dto'
import { RecordInventoryPaymentDto } from './dto/record-inventory-payment.dto'
import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator'

@Controller('inventory/items')
export class InventoryItemsController {
  constructor(private readonly items: InventoryItemsService) {}

  @Get()
  list(@Query() query: ListInventoryItemsQueryDto) {
    return this.items.list(query)
  }

  @Post()
  create(@Body() dto: CreateInventoryItemDto, @CurrentUser() user: RequestUser) {
    return this.items.create(dto, user)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInventoryItemDto, @CurrentUser() user: RequestUser) {
    return this.items.update(id, dto, user)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.items.remove(id)
  }

  @Post(':id/mark-sold')
  markSold(@Param('id') id: string, @Body() dto: MarkSoldDto, @CurrentUser() user: RequestUser) {
    return this.items.markSold(id, dto, user)
  }

  @Patch(':id/sale')
  updateSale(@Param('id') id: string, @Body() dto: MarkSoldDto, @CurrentUser() user: RequestUser) {
    return this.items.updateSale(id, dto, user)
  }

  @Post(':id/mark-available')
  markAvailable(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.items.markAvailable(id, user)
  }

  @Post(':id/record-payment')
  recordPayment(@Param('id') id: string, @Body() dto: RecordInventoryPaymentDto, @CurrentUser() user: RequestUser) {
    return this.items.recordPayment(id, dto, user)
  }
}
