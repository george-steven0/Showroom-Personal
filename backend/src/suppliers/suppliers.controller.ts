import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { SuppliersService } from './suppliers.service'
import { CreateSupplierDto } from './dto/create-supplier.dto'
import { UpdateSupplierDto } from './dto/update-supplier.dto'
import { ListSuppliersQueryDto } from './dto/list-suppliers-query.dto'
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator'

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get()
  list(@Query() query: ListSuppliersQueryDto) {
    return this.suppliers.list(query)
  }

  @Post()
  create(@Body() dto: CreateSupplierDto, @CurrentUser() user: RequestUser) {
    return this.suppliers.create(dto, user)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto, @CurrentUser() user: RequestUser) {
    return this.suppliers.update(id, dto, user)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.suppliers.remove(id)
  }
}
