import { PickType } from '@nestjs/mapped-types'
import { ListInventoryItemsQueryDto } from './list-inventory-items-query.dto'

/** The KPI blocks take the same branch and date filters as the list, so the two always describe the same cars. */
export class InventoryStatsQueryDto extends PickType(ListInventoryItemsQueryDto, ['branchId', 'saleFrom', 'saleTo', 'purchaseFrom', 'purchaseTo'] as const) {}
