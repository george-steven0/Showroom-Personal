import { IsOptional, IsString } from 'class-validator'
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto'

export class ListInventoryItemsQueryDto extends PaginationQueryDto {
  /** Comma-separated branch ids, e.g. "b1,b2" — lets the UI filter by multiple branches at once. */
  @IsOptional()
  @IsString()
  branchId?: string

  /** Comma-separated statuses, e.g. "in_stock,partial_paid". */
  @IsOptional()
  @IsString()
  status?: string

  @IsOptional()
  @IsString()
  from?: string

  @IsOptional()
  @IsString()
  to?: string
}
