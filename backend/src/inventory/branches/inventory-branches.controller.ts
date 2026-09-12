import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import { InventoryBranchesService } from './inventory-branches.service'
import { CreateInventoryBranchDto } from './dto/create-inventory-branch.dto'
import { UpdateInventoryBranchDto } from './dto/update-inventory-branch.dto'
import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator'

@Controller('inventory/branches')
export class InventoryBranchesController {
  constructor(private readonly branches: InventoryBranchesService) {}

  @Get()
  list() {
    return this.branches.list()
  }

  @Post()
  create(@Body() dto: CreateInventoryBranchDto, @CurrentUser() user: RequestUser) {
    return this.branches.create(dto, user)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInventoryBranchDto) {
    return this.branches.update(id, dto)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.branches.remove(id)
  }
}
