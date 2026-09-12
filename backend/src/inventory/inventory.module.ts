import { Module } from '@nestjs/common'
import { InventoryBranchesController } from './branches/inventory-branches.controller'
import { InventoryBranchesService } from './branches/inventory-branches.service'
import { InventoryItemsController } from './items/inventory-items.controller'
import { InventoryItemsService } from './items/inventory-items.service'

@Module({
  controllers: [InventoryBranchesController, InventoryItemsController],
  providers: [InventoryBranchesService, InventoryItemsService],
})
export class InventoryModule {}
